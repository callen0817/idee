#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>

#include "cJSON.h"
#include "esp_err.h"
#include "esp_heap_caps.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "mbedtls/base64.h"
#include "nvs_flash.h"

#include "sensecap-watcher.h"
#include "sscma_client_io.h"
#include "sscma_client_ops.h"

#include "idee_face.h"
#include "idee_modes.h"
#include "idee_protocol.h"
#include "idee_storage.h"

static const char *TAG = "idee_main";

static esp_io_expander_handle_t s_io_exp = NULL;
static lv_disp_t *s_disp = NULL;
static sscma_client_handle_t s_sscma = NULL;
static bool s_sscma_ready = false;
static bool s_sd_mounted = false;
static bool s_codec_ready = false;
static bool s_camera_active = false;

static lv_obj_t *s_lbl_title = NULL;
static lv_obj_t *s_lbl_status = NULL;
static lv_obj_t *s_lbl_cue = NULL;
static lv_obj_t *s_lbl_stats = NULL;
static lv_obj_t *s_lbl_battery = NULL;
static volatile bool s_req_scan = false;
static volatile bool s_req_record = false;

static SemaphoreHandle_t s_snap_sem = NULL;
static char *s_last_img_b64 = NULL;
static size_t s_last_img_len = 0;
static int s_last_box_count = 0;
static float s_last_emb[IDEE_FACE_DIM];
static bool s_last_has_emb = false;

static void ui_set_state(const char *headline, const char *cue_line)
{
    if (!s_disp || !s_lbl_status) return;
    if (lvgl_port_lock(150)) {
        lv_label_set_text(s_lbl_status, headline ? headline : "Ready");
        if (s_lbl_cue) {
            lv_label_set_text(s_lbl_cue, cue_line ? cue_line : "");
        }
        int p = 0, e = 0, t = 0;
        idee_storage_get_counts(&p, &e, &t);
        char buf[112];
        snprintf(buf, sizeof(buf), "Mode: %s  |  Cam: %s\nPeople: %d  |  Enc: %d  |  Idx: %d",
                 idee_modes_name(idee_modes_get()),
                 s_camera_active ? "ON" : "OFF",
                 p, e, idee_face_active_count());
        lv_label_set_text(s_lbl_stats, buf);

        char bat_buf[48];
        snprintf(bat_buf, sizeof(bat_buf), "Bat: %u%% (%umV)%s",
                 bsp_battery_get_percent(),
                 bsp_battery_get_voltage(),
                 bsp_system_is_charging() ? " CHG" : "");
        lv_label_set_text(s_lbl_battery, bat_buf);
        lvgl_port_unlock();
    }
}

static void on_sscma_connect(sscma_client_handle_t client, const sscma_client_reply_t *reply, void *user_ctx)
{
    s_sscma_ready = true;
    ESP_LOGI(TAG, "Himax WiseEye2 SSCMA connected");
}

static void on_sscma_event(sscma_client_handle_t client, const sscma_client_reply_t *reply, void *user_ctx)
{
    char *img = NULL;
    int img_size = 0;
    if (sscma_utils_fetch_image_from_reply(reply, &img, &img_size) == ESP_OK && img && img_size > 0) {
        free(s_last_img_b64);
        s_last_img_b64 = img;
        s_last_img_len = (size_t)img_size;
    }

    int dim = 0;
    int boxes = 0;
    s_last_has_emb = idee_face_extract_from_sscma(reply, s_last_emb, &dim, &boxes);
    if (boxes == 0) {
        sscma_client_box_t *b = NULL;
        int bc = 0;
        if (sscma_utils_fetch_boxes_from_reply(reply, &b, &bc) == ESP_OK) {
            boxes = bc;
            free(b);
        }
    }
    s_last_box_count = boxes;

    if (s_snap_sem) {
        xSemaphoreGive(s_snap_sem);
    }
}

static void play_beep(int freq_hz, int duration_ms)
{
    if (!s_codec_ready) return;
    int vol_set = 0;
    bsp_codec_volume_set(65, &vol_set);
    bsp_codec_mute_set(false);

    const int sr = DRV_AUDIO_SAMPLE_RATE;
    const int total_samples = (sr * duration_ms) / 1000;
    int16_t *pcm = malloc((size_t)total_samples * sizeof(int16_t));
    if (!pcm) return;

    for (int i = 0; i < total_samples; i++) {
        double t = (double)i / (double)sr;
        pcm[i] = (int16_t)(8000.0 * sin(2.0 * 3.14159265358979323846 * freq_hz * t));
    }
    size_t written = 0;
    bsp_i2s_write(pcm, (size_t)total_samples * sizeof(int16_t), &written, 500);
    free(pcm);
}

static esp_err_t capture_wav_to_file(const char *rel_path, int duration_ms, double *out_rms, size_t *out_bytes)
{
    if (!s_codec_ready) return ESP_ERR_INVALID_STATE;
    if (duration_ms < 200) duration_ms = 200;
    if (duration_ms > 15000) duration_ms = 15000;

    const int sr = DRV_AUDIO_SAMPLE_RATE;
    const int total_samples = (sr * duration_ms) / 1000;
    const size_t data_bytes = (size_t)total_samples * sizeof(int16_t);
    const size_t wav_size = 44 + data_bytes;

    uint8_t *wav = heap_caps_malloc(wav_size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!wav) {
        wav = malloc(wav_size);
    }
    if (!wav) return ESP_ERR_NO_MEM;

    memcpy(wav, "RIFF", 4);
    uint32_t chunk_sz = (uint32_t)(36 + data_bytes);
    memcpy(wav + 4, &chunk_sz, 4);
    memcpy(wav + 8, "WAVEfmt ", 8);
    uint32_t sub1 = 16;
    uint16_t fmt = 1, ch = 1, align = 2, bps = 16;
    uint32_t srate = sr, brate = sr * 2;
    memcpy(wav + 16, &sub1, 4);
    memcpy(wav + 20, &fmt, 2);
    memcpy(wav + 22, &ch, 2);
    memcpy(wav + 24, &srate, 4);
    memcpy(wav + 28, &brate, 4);
    memcpy(wav + 32, &align, 2);
    memcpy(wav + 34, &bps, 2);
    memcpy(wav + 36, "data", 4);
    uint32_t sub2 = (uint32_t)data_bytes;
    memcpy(wav + 40, &sub2, 4);

    size_t read_bytes = 0;
    esp_err_t err = bsp_i2s_read(wav + 44, data_bytes, &read_bytes, duration_ms + 1000);
    if (err != ESP_OK) {
        free(wav);
        return err;
    }

    int16_t *samples = (int16_t *)(wav + 44);
    size_t n_samp = read_bytes / 2;
    double sum_sq = 0.0;
    for (size_t i = 0; i < n_samp; i++) {
        double v = (double)samples[i];
        sum_sq += v * v;
    }
    *out_rms = n_samp > 0 ? sqrt(sum_sq / (double)n_samp) : 0.0;
    *out_bytes = 44 + read_bytes;

    err = idee_storage_write_atomic(rel_path, wav, 44 + read_bytes);
    free(wav);
    return err;
}

static cJSON *handle_cmd(const char *cmd, cJSON *params, bool *ok_out)
{
    cJSON *res = cJSON_CreateObject();
    *ok_out = true;

    if (strcmp(cmd, "ping") == 0) {
        cJSON_AddBoolToObject(res, "ok", true);
        cJSON_AddStringToObject(res, "fw", "idee-watcher");
        cJSON_AddStringToObject(res, "ver", "0.3.0");
        cJSON_AddStringToObject(res, "idf", IDF_VER);
        return res;
    }

    if (strcmp(cmd, "sys_info") == 0) {
        int p = 0, e = 0, t = 0;
        idee_storage_get_counts(&p, &e, &t);
        idee_mode_config_t mcfg;
        idee_modes_get_config(&mcfg);

        cJSON_AddBoolToObject(res, "ok", true);
        cJSON_AddStringToObject(res, "fw", "idee-watcher");
        cJSON_AddStringToObject(res, "ver", "0.3.0");
        cJSON_AddStringToObject(res, "mode", idee_modes_name(mcfg.mode));
        cJSON_AddBoolToObject(res, "camera_active", s_camera_active);
        cJSON_AddBoolToObject(res, "camera_off_by_default", mcfg.camera_off_by_default);
        cJSON_AddNumberToObject(res, "free_heap", (double)esp_get_free_heap_size());
        cJSON_AddNumberToObject(res, "free_internal", (double)heap_caps_get_free_size(MALLOC_CAP_INTERNAL));
        cJSON_AddNumberToObject(res, "free_psram", (double)heap_caps_get_free_size(MALLOC_CAP_SPIRAM));
        cJSON_AddNumberToObject(res, "min_heap", (double)esp_get_minimum_free_heap_size());
        cJSON_AddNumberToObject(res, "battery_mv", bsp_battery_get_voltage());
        cJSON_AddNumberToObject(res, "battery_pct", bsp_battery_get_percent());
        cJSON_AddBoolToObject(res, "charging", bsp_system_is_charging());
        cJSON_AddBoolToObject(res, "sd_mounted", s_sd_mounted);
        cJSON_AddStringToObject(res, "storage_dir", idee_storage_base_dir());
        cJSON_AddBoolToObject(res, "sscma_ready", s_sscma_ready);
        cJSON_AddBoolToObject(res, "codec_ready", s_codec_ready);
        cJSON_AddNumberToObject(res, "people_count", p);
        cJSON_AddNumberToObject(res, "encounters_count", e);
        cJSON_AddNumberToObject(res, "templates_count", t);
        cJSON_AddNumberToObject(res, "active_face_index", idee_face_active_count());
        return res;
    }

    if (strcmp(cmd, "sscma_info") == 0) {
        if (!s_sscma || !s_sscma_ready) {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "sscma_not_ready");
            return res;
        }
        sscma_client_info_t *info = NULL;
        sscma_client_model_t *model = NULL;
        cJSON_AddBoolToObject(res, "ok", true);
        if (sscma_client_get_info(s_sscma, &info, true) == ESP_OK && info) {
            cJSON_AddStringToObject(res, "id", info->id ? info->id : "");
            cJSON_AddStringToObject(res, "name", info->name ? info->name : "");
            cJSON_AddStringToObject(res, "hw_ver", info->hw_ver ? info->hw_ver : "");
            cJSON_AddStringToObject(res, "sw_ver", info->sw_ver ? info->sw_ver : "");
            cJSON_AddStringToObject(res, "fw_ver", info->fw_ver ? info->fw_ver : "");
        }
        if (sscma_client_get_model(s_sscma, &model, true) == ESP_OK && model) {
            cJSON_AddNumberToObject(res, "model_id", model->id);
            cJSON_AddStringToObject(res, "model_name", model->name ? model->name : "");
            cJSON_AddStringToObject(res, "model_ver", model->ver ? model->ver : "");
        }
        return res;
    }

    if (strcmp(cmd, "set_mode") == 0) {
        const cJSON *m = params ? cJSON_GetObjectItemCaseSensitive(params, "mode") : NULL;
        const char *ms = cJSON_IsString(m) ? m->valuestring : "on_demand";
        if (strcmp(ms, "always_on") == 0) {
            idee_modes_set(IDEE_MODE_ALWAYS_ON);
        } else if (strcmp(ms, "context_aware") == 0) {
            idee_modes_set(IDEE_MODE_CONTEXT_AWARE);
        } else {
            idee_modes_set(IDEE_MODE_ON_DEMAND);
            s_camera_active = false;
        }
        ui_set_state("Mode updated", idee_modes_name(idee_modes_get()));
        cJSON_AddBoolToObject(res, "ok", true);
        cJSON_AddStringToObject(res, "mode", idee_modes_name(idee_modes_get()));
        cJSON_AddBoolToObject(res, "camera_active", s_camera_active);
        return res;
    }

    if (strcmp(cmd, "cam_snapshot") == 0) {
        if (!s_sscma) {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "sscma_not_init");
            return res;
        }
        s_camera_active = true;
        ui_set_state("Scanning...", "Capturing camera frame");
        xSemaphoreTake(s_snap_sem, 0);
        esp_err_t err = sscma_client_sample(s_sscma, 1);
        if (err == ESP_OK && xSemaphoreTake(s_snap_sem, pdMS_TO_TICKS(4000)) == pdTRUE && s_last_img_b64) {
            cJSON_AddBoolToObject(res, "ok", true);
            cJSON_AddNumberToObject(res, "b64_len", (double)s_last_img_len);
            cJSON_AddNumberToObject(res, "box_count", s_last_box_count);
            cJSON_AddBoolToObject(res, "has_embedding", s_last_has_emb);
            cJSON_AddStringToObject(res, "image_b64", s_last_img_b64);
        } else {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "snapshot_timeout");
        }
        s_camera_active = (idee_modes_get() == IDEE_MODE_ALWAYS_ON);
        ui_set_state("Ready", "");
        return res;
    }

    if (strcmp(cmd, "enroll_embedding") == 0) {
        const cJSON *pid = params ? cJSON_GetObjectItemCaseSensitive(params, "person_id") : NULL;
        const cJSON *emb = params ? cJSON_GetObjectItemCaseSensitive(params, "embedding") : NULL;
        const cJSON *mid = params ? cJSON_GetObjectItemCaseSensitive(params, "model_id") : NULL;
        const cJSON *mver = params ? cJSON_GetObjectItemCaseSensitive(params, "model_version") : NULL;
        if (!cJSON_IsString(pid) || !cJSON_IsArray(emb) || cJSON_GetArraySize(emb) != IDEE_FACE_DIM) {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "invalid_person_or_embedding");
            return res;
        }
        float vec[IDEE_FACE_DIM];
        for (int i = 0; i < IDEE_FACE_DIM; i++) {
            cJSON *v = cJSON_GetArrayItem(emb, i);
            vec[i] = cJSON_IsNumber(v) ? (float)v->valuedouble : 0.0f;
        }
        esp_err_t err = idee_face_enroll_embedding(
            pid->valuestring,
            cJSON_IsString(mid) ? mid->valuestring : "scrfd-mfn-128d-int8",
            cJSON_IsString(mver) ? mver->valuestring : "1.0.0",
            vec,
            IDEE_FACE_DIM);
        if (err == ESP_OK) {
            char name[64], cue[128];
            idee_face_lookup_person_cue(pid->valuestring, name, sizeof(name), cue, sizeof(cue));
            ui_set_state("Enrolled", name[0] ? name : pid->valuestring);
            cJSON_AddBoolToObject(res, "ok", true);
            cJSON_AddNumberToObject(res, "active_face_index", idee_face_active_count());
        } else {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", esp_err_to_name(err));
        }
        return res;
    }

    if (strcmp(cmd, "recognize_now") == 0) {
        float query[IDEE_FACE_DIM];
        bool have_query = false;
        const cJSON *emb = params ? cJSON_GetObjectItemCaseSensitive(params, "embedding") : NULL;
        const cJSON *thr = params ? cJSON_GetObjectItemCaseSensitive(params, "threshold") : NULL;
        float threshold = cJSON_IsNumber(thr) ? (float)thr->valuedouble : IDEE_DEFAULT_FACE_THRESHOLD;

        s_camera_active = true;
        ui_set_state("Scanning...", "Looking for face");

        if (cJSON_IsArray(emb) && cJSON_GetArraySize(emb) == IDEE_FACE_DIM) {
            for (int i = 0; i < IDEE_FACE_DIM; i++) {
                cJSON *v = cJSON_GetArrayItem(emb, i);
                query[i] = cJSON_IsNumber(v) ? (float)v->valuedouble : 0.0f;
            }
            have_query = true;
        } else if (s_sscma && s_sscma_ready) {
            xSemaphoreTake(s_snap_sem, 0);
            if (sscma_client_sample(s_sscma, 1) == ESP_OK && xSemaphoreTake(s_snap_sem, pdMS_TO_TICKS(3500)) == pdTRUE) {
                if (s_last_has_emb) {
                    memcpy(query, s_last_emb, sizeof(query));
                    have_query = true;
                }
            }
        }

        s_camera_active = (idee_modes_get() == IDEE_MODE_ALWAYS_ON);

        if (!have_query) {
            ui_set_state("Unknown", "No face embedding detected");
            cJSON_AddBoolToObject(res, "ok", true);
            cJSON_AddBoolToObject(res, "matched", false);
            cJSON_AddStringToObject(res, "status", "no_embedding");
            cJSON_AddNumberToObject(res, "box_count", s_last_box_count);
            return res;
        }

        idee_face_match_t m;
        idee_face_match(query, IDEE_FACE_DIM, threshold, &m);
        cJSON_AddBoolToObject(res, "ok", true);
        cJSON_AddBoolToObject(res, "matched", m.matched);
        cJSON_AddNumberToObject(res, "confidence", m.confidence);
        cJSON_AddNumberToObject(res, "second_best", m.second_best);
        cJSON_AddNumberToObject(res, "candidates_checked", m.candidates_checked);

        if (m.matched) {
            char name[64], cue[128];
            idee_face_lookup_person_cue(m.person_id, name, sizeof(name), cue, sizeof(cue));
            cJSON_AddStringToObject(res, "person_id", m.person_id);
            cJSON_AddStringToObject(res, "name", name);
            cJSON_AddStringToObject(res, "cue", cue);
            ui_set_state(name[0] ? name : m.person_id, cue);
            play_beep(1046, 80);
        } else {
            ui_set_state("Unknown", "Press to enroll or ID later");
        }
        return res;
    }

    if (strcmp(cmd, "mic_capture") == 0) {
        int dur = 1000;
        const char *name = "baseline.wav";
        if (params) {
            const cJSON *d = cJSON_GetObjectItemCaseSensitive(params, "duration_ms");
            const cJSON *n = cJSON_GetObjectItemCaseSensitive(params, "filename");
            if (cJSON_IsNumber(d)) dur = d->valueint;
            if (cJSON_IsString(n) && n->valuestring[0]) name = n->valuestring;
        }
        char rel[96];
        snprintf(rel, sizeof(rel), "audio/%s", name);
        double rms = 0.0;
        size_t bytes = 0;
        bsp_rgb_set(40, 8, 0);
        ui_set_state("REC ●", "Capturing audio");
        esp_err_t err = capture_wav_to_file(rel, dur, &rms, &bytes);
        bsp_rgb_set(0, 12, 8);
        if (err == ESP_OK) {
            cJSON_AddBoolToObject(res, "ok", true);
            cJSON_AddStringToObject(res, "path", rel);
            cJSON_AddNumberToObject(res, "bytes", (double)bytes);
            cJSON_AddNumberToObject(res, "rms", rms);
            ui_set_state("Ready", "Audio captured");
        } else {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", esp_err_to_name(err));
            ui_set_state("Ready", "Audio capture failed");
        }
        return res;
    }

    if (strcmp(cmd, "record_encounter") == 0) {
        const cJSON *pid = params ? cJSON_GetObjectItemCaseSensitive(params, "person_id") : NULL;
        const cJSON *ev = params ? cJSON_GetObjectItemCaseSensitive(params, "evidence_type") : NULL;
        const cJSON *sum = params ? cJSON_GetObjectItemCaseSensitive(params, "summary") : NULL;
        const cJSON *dur_item = params ? cJSON_GetObjectItemCaseSensitive(params, "duration_ms") : NULL;
        const cJSON *conf_item = params ? cJSON_GetObjectItemCaseSensitive(params, "confidence") : NULL;

        int dur = cJSON_IsNumber(dur_item) ? dur_item->valueint : 2000;
        float conf = cJSON_IsNumber(conf_item) ? (float)conf_item->valuedouble : 0.0f;
        const char *person_id = cJSON_IsString(pid) ? pid->valuestring : NULL;

        char enc_id[48];
        snprintf(enc_id, sizeof(enc_id), "enc_%llu", (unsigned long long)(esp_timer_get_time() / 1000));
        char rel_audio[96];
        snprintf(rel_audio, sizeof(rel_audio), "audio/%s.wav", enc_id);

        bsp_rgb_set(48, 0, 0);
        ui_set_state("REC ●", "Consented encounter capture");
        double rms = 0.0;
        size_t wav_bytes = 0;
        esp_err_t wav_err = capture_wav_to_file(rel_audio, dur, &rms, &wav_bytes);
        bsp_rgb_set(0, 12, 8);

        esp_err_t enc_err = idee_modes_save_encounter(
            enc_id,
            person_id,
            cJSON_IsString(ev) ? ev->valuestring : "button",
            cJSON_IsString(sum) ? sum->valuestring : "Consented audio encounter (pending offline STT)",
            conf,
            wav_err == ESP_OK ? rel_audio : NULL);

        if (enc_err == ESP_OK) {
            ui_set_state("Encounter saved", enc_id);
            cJSON_AddBoolToObject(res, "ok", true);
            cJSON_AddStringToObject(res, "encounter_id", enc_id);
            cJSON_AddStringToObject(res, "audio_path", wav_err == ESP_OK ? rel_audio : "");
            cJSON_AddNumberToObject(res, "audio_bytes", (double)wav_bytes);
            cJSON_AddNumberToObject(res, "mic_rms", rms);
        } else {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", esp_err_to_name(enc_err));
        }
        return res;
    }

    if (strcmp(cmd, "correct_encounter") == 0) {
        const cJSON *eid = params ? cJSON_GetObjectItemCaseSensitive(params, "encounter_id") : NULL;
        const cJSON *pid = params ? cJSON_GetObjectItemCaseSensitive(params, "person_id") : NULL;
        const cJSON *reason = params ? cJSON_GetObjectItemCaseSensitive(params, "reason") : NULL;
        if (!cJSON_IsString(eid)) {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "missing_encounter_id");
            return res;
        }
        esp_err_t err = idee_modes_correct_encounter(
            eid->valuestring,
            cJSON_IsString(pid) ? pid->valuestring : NULL,
            cJSON_IsString(reason) ? reason->valuestring : "user_correction");
        *ok_out = (err == ESP_OK);
        cJSON_AddBoolToObject(res, "ok", err == ESP_OK);
        if (err != ESP_OK) cJSON_AddStringToObject(res, "error", esp_err_to_name(err));
        return res;
    }

    if (strcmp(cmd, "delete_audio") == 0) {
        const cJSON *eid = params ? cJSON_GetObjectItemCaseSensitive(params, "encounter_id") : NULL;
        if (!cJSON_IsString(eid)) {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "missing_encounter_id");
            return res;
        }
        esp_err_t err = idee_modes_delete_encounter_audio(eid->valuestring);
        *ok_out = (err == ESP_OK);
        cJSON_AddBoolToObject(res, "ok", err == ESP_OK);
        if (err != ESP_OK) cJSON_AddStringToObject(res, "error", esp_err_to_name(err));
        return res;
    }

    if (strcmp(cmd, "pull_audio") == 0) {
        const cJSON *ap = params ? cJSON_GetObjectItemCaseSensitive(params, "audio_path") : NULL;
        if (!cJSON_IsString(ap) || !ap->valuestring[0]) {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "missing_audio_path");
            return res;
        }
        char *raw = NULL;
        size_t raw_len = 0;
        if (idee_storage_read_file(ap->valuestring, &raw, &raw_len) != ESP_OK || !raw) {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "audio_not_found");
            return res;
        }
        size_t b64_cap = ((raw_len + 2) / 3) * 4 + 8;
        unsigned char *b64 = heap_caps_malloc(b64_cap, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
        if (!b64) b64 = malloc(b64_cap);
        size_t out_len = 0;
        if (!b64 || mbedtls_base64_encode(b64, b64_cap, &out_len, (const unsigned char *)raw, raw_len) != 0) {
            free(raw);
            free(b64);
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "b64_encode_failed");
            return res;
        }
        free(raw);
        cJSON_AddBoolToObject(res, "ok", true);
        cJSON_AddNumberToObject(res, "bytes", (double)raw_len);
        cJSON_AddStringToObject(res, "audio_b64", (const char *)b64);
        free(b64);
        return res;
    }

    if (strcmp(cmd, "hw_test") == 0) {
        bsp_rgb_set(0, 32, 24);
        play_beep(880, 120);
        const char *probe = "{\"probe\":\"idee_sd_ok\"}";
        esp_err_t sd_err = idee_storage_write_atomic("hw_probe.json", probe, strlen(probe));
        double mic_rms = 0.0;
        size_t wav_bytes = 0;
        esp_err_t mic_err = capture_wav_to_file("audio/hw_probe.wav", 400, &mic_rms, &wav_bytes);
        bsp_rgb_set(0, 12, 8);

        cJSON_AddBoolToObject(res, "ok", true);
        cJSON_AddBoolToObject(res, "storage_ok", sd_err == ESP_OK);
        cJSON_AddBoolToObject(res, "mic_ok", mic_err == ESP_OK);
        cJSON_AddNumberToObject(res, "mic_rms", mic_rms);
        cJSON_AddBoolToObject(res, "speaker_ok", s_codec_ready);
        cJSON_AddBoolToObject(res, "sscma_ready", s_sscma_ready);
        ui_set_state("HW test complete", "");
        return res;
    }

    if (strcmp(cmd, "sync_push") == 0) {
        const cJSON *sid_item = params ? cJSON_GetObjectItemCaseSensitive(params, "sync_id") : NULL;
        const char *sync_id = cJSON_IsString(sid_item) ? sid_item->valuestring : "";
        if (sync_id[0] && idee_storage_has_sync_id(sync_id)) {
            int p = 0, e = 0, t = 0;
            idee_storage_get_counts(&p, &e, &t);
            cJSON_AddBoolToObject(res, "ok", true);
            cJSON_AddBoolToObject(res, "duplicate", true);
            cJSON_AddStringToObject(res, "sync_id", sync_id);
            cJSON_AddNumberToObject(res, "people_count", p);
            cJSON_AddNumberToObject(res, "templates_count", t);
            return res;
        }

        int p_count = 0, e_count = 0, t_count = 0;
        idee_storage_get_counts(&p_count, &e_count, &t_count);

        cJSON *people = params ? cJSON_GetObjectItemCaseSensitive(params, "people") : NULL;
        if (cJSON_IsArray(people)) {
            char *s = cJSON_PrintUnformatted(people);
            if (s) {
                idee_storage_write_atomic("people.json", s, strlen(s));
                free(s);
                p_count = cJSON_GetArraySize(people);
            }
        }
        cJSON *templates = params ? cJSON_GetObjectItemCaseSensitive(params, "templates") : NULL;
        if (cJSON_IsArray(templates)) {
            char *s = cJSON_PrintUnformatted(templates);
            if (s) {
                idee_storage_write_atomic("templates.json", s, strlen(s));
                free(s);
                t_count = cJSON_GetArraySize(templates);
                idee_face_reload_index();
            }
        }
        cJSON *settings = params ? cJSON_GetObjectItemCaseSensitive(params, "settings") : NULL;
        if (cJSON_IsObject(settings)) {
            char *s = cJSON_PrintUnformatted(settings);
            if (s) {
                idee_storage_write_atomic("settings.json", s, strlen(s));
                free(s);
            }
            idee_modes_apply_settings_json(settings);
        }

        idee_storage_set_counts(p_count, e_count, t_count);
        if (sync_id[0]) {
            idee_storage_record_sync_id(sync_id);
        }
        ui_set_state("Synced from Desktop", "");

        cJSON_AddBoolToObject(res, "ok", true);
        cJSON_AddBoolToObject(res, "duplicate", false);
        cJSON_AddStringToObject(res, "sync_id", sync_id);
        cJSON_AddNumberToObject(res, "people_count", p_count);
        cJSON_AddNumberToObject(res, "templates_count", t_count);
        cJSON_AddNumberToObject(res, "active_face_index", idee_face_active_count());
        return res;
    }

    if (strcmp(cmd, "sync_pull") == 0) {
        cJSON_AddBoolToObject(res, "ok", true);
        char *buf = NULL;
        size_t len = 0;
        if (idee_storage_read_file("people.json", &buf, &len) == ESP_OK && buf) {
            cJSON *arr = cJSON_ParseWithLength(buf, len);
            free(buf);
            if (arr) cJSON_AddItemToObject(res, "people", arr);
        }
        if (idee_storage_read_file("encounters.json", &buf, &len) == ESP_OK && buf) {
            cJSON *arr = cJSON_ParseWithLength(buf, len);
            free(buf);
            if (arr) cJSON_AddItemToObject(res, "encounters", arr);
        } else {
            cJSON_AddItemToObject(res, "encounters", cJSON_CreateArray());
        }
        return res;
    }

    *ok_out = false;
    cJSON_AddBoolToObject(res, "ok", false);
    cJSON_AddStringToObject(res, "error", "unknown_cmd");
    return res;
}

static void on_btn_scan_clicked(lv_event_t *e)
{
    (void)e;
    s_req_scan = true;
}

static void on_btn_record_clicked(lv_event_t *e)
{
    (void)e;
    s_req_record = true;
}

static void on_hw_btn_long_press(void)
{
    s_req_record = true;
}

static void run_standalone_scan(void)
{
    s_camera_active = true;
    ui_set_state("Scanning...", "Looking for face");
    bsp_rgb_set(0, 24, 36);

    bool matched = false;
    if (s_sscma && s_sscma_ready) {
        xSemaphoreTake(s_snap_sem, 0);
        if (sscma_client_sample(s_sscma, 1) == ESP_OK &&
            xSemaphoreTake(s_snap_sem, pdMS_TO_TICKS(3000)) == pdTRUE &&
            s_last_has_emb) {
            idee_face_match_t m;
            if (idee_face_match(s_last_emb, IDEE_FACE_DIM, IDEE_DEFAULT_FACE_THRESHOLD, &m) == ESP_OK && m.matched) {
                char name[64], cue[128];
                idee_face_lookup_person_cue(m.person_id, name, sizeof(name), cue, sizeof(cue));
                ui_set_state(name[0] ? name : m.person_id, cue);
                play_beep(1046, 80);
                matched = true;
            }
        }
    }

    s_camera_active = (idee_modes_get() == IDEE_MODE_ALWAYS_ON);
    bsp_rgb_set(0, 12, 8);
    if (!matched) {
        ui_set_state("Unknown", s_last_box_count > 0 ? "Face seen — enroll on Desktop" : "No enrolled face matched");
    }
}

static void run_standalone_record(void)
{
    char enc_id[48];
    snprintf(enc_id, sizeof(enc_id), "enc_%llu", (unsigned long long)(esp_timer_get_time() / 1000));
    char rel_audio[96];
    snprintf(rel_audio, sizeof(rel_audio), "audio/%s.wav", enc_id);

    bsp_rgb_set(48, 0, 0);
    ui_set_state("REC ●", "Recording 3s encounter...");
    double rms = 0.0;
    size_t wav_bytes = 0;
    esp_err_t wav_err = capture_wav_to_file(rel_audio, 3000, &rms, &wav_bytes);
    bsp_rgb_set(0, 12, 8);

    if (idee_modes_save_encounter(
            enc_id, NULL, "button",
            "Standalone Watcher encounter (pending offline STT)",
            0.0f, wav_err == ESP_OK ? rel_audio : NULL) == ESP_OK) {
        play_beep(880, 90);
        ui_set_state("Saved", enc_id);
    } else {
        ui_set_state("Save failed", "Check storage");
    }
}

static void init_ui(void)
{
    if (!s_disp) return;
    if (lvgl_port_lock(500)) {
        lv_obj_t *scr = lv_scr_act();
        lv_obj_set_style_bg_color(scr, lv_color_hex(0x0B1014), 0);
        lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);

        s_lbl_title = lv_label_create(scr);
        lv_label_set_text(s_lbl_title, "iDee");
        lv_obj_set_style_text_color(s_lbl_title, lv_color_hex(0x6EE7B7), 0);
        lv_obj_set_style_text_font(s_lbl_title, &lv_font_montserrat_24, 0);
        lv_obj_align(s_lbl_title, LV_ALIGN_TOP_MID, 0, 36);

        s_lbl_status = lv_label_create(scr);
        lv_label_set_text(s_lbl_status, "Ready");
        lv_obj_set_style_text_color(s_lbl_status, lv_color_hex(0xF3F4F6), 0);
        lv_obj_set_style_text_font(s_lbl_status, &lv_font_montserrat_24, 0);
        lv_obj_align(s_lbl_status, LV_ALIGN_CENTER, 0, -56);

        s_lbl_cue = lv_label_create(scr);
        lv_label_set_text(s_lbl_cue, "Tap Scan or Record");
        lv_label_set_long_mode(s_lbl_cue, LV_LABEL_LONG_WRAP);
        lv_obj_set_width(s_lbl_cue, 320);
        lv_obj_set_style_text_color(s_lbl_cue, lv_color_hex(0xA7F3D0), 0);
        lv_obj_set_style_text_font(s_lbl_cue, &lv_font_montserrat_14, 0);
        lv_obj_set_style_text_align(s_lbl_cue, LV_TEXT_ALIGN_CENTER, 0);
        lv_obj_align(s_lbl_cue, LV_ALIGN_CENTER, 0, -10);

        lv_obj_t *btn_scan = lv_btn_create(scr);
        lv_obj_set_size(btn_scan, 112, 44);
        lv_obj_set_style_bg_color(btn_scan, lv_color_hex(0x10B981), 0);
        lv_obj_set_style_radius(btn_scan, 22, 0);
        lv_obj_align(btn_scan, LV_ALIGN_CENTER, -66, 48);
        lv_obj_add_event_cb(btn_scan, on_btn_scan_clicked, LV_EVENT_CLICKED, NULL);
        lv_obj_t *lbl_scan = lv_label_create(btn_scan);
        lv_label_set_text(lbl_scan, "Scan");
        lv_obj_center(lbl_scan);

        lv_obj_t *btn_rec = lv_btn_create(scr);
        lv_obj_set_size(btn_rec, 112, 44);
        lv_obj_set_style_bg_color(btn_rec, lv_color_hex(0x374151), 0);
        lv_obj_set_style_radius(btn_rec, 22, 0);
        lv_obj_align(btn_rec, LV_ALIGN_CENTER, 66, 48);
        lv_obj_add_event_cb(btn_rec, on_btn_record_clicked, LV_EVENT_CLICKED, NULL);
        lv_obj_t *lbl_rec = lv_label_create(btn_rec);
        lv_label_set_text(lbl_rec, "Record");
        lv_obj_center(lbl_rec);

        s_lbl_stats = lv_label_create(scr);
        lv_label_set_text(s_lbl_stats, "Mode: on_demand | Cam: OFF");
        lv_obj_set_style_text_color(s_lbl_stats, lv_color_hex(0x9CA3AF), 0);
        lv_obj_set_style_text_font(s_lbl_stats, &lv_font_montserrat_14, 0);
        lv_obj_set_style_text_align(s_lbl_stats, LV_TEXT_ALIGN_CENTER, 0);
        lv_obj_align(s_lbl_stats, LV_ALIGN_BOTTOM_MID, 0, -56);

        s_lbl_battery = lv_label_create(scr);
        lv_label_set_text(s_lbl_battery, "Bat: --%");
        lv_obj_set_style_text_color(s_lbl_battery, lv_color_hex(0x6B7280), 0);
        lv_obj_set_style_text_font(s_lbl_battery, &lv_font_montserrat_14, 0);
        lv_obj_align(s_lbl_battery, LV_ALIGN_BOTTOM_MID, 0, -28);

        lvgl_port_unlock();
    }
}

void app_main(void)
{
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    ESP_LOGI(TAG, "=== iDee Watcher v0.3.0 Booting ===");

    s_io_exp = bsp_io_expander_init();
    s_disp = bsp_lvgl_init();
    bsp_set_btn_long_press_cb(on_hw_btn_long_press);
    bsp_lcd_brightness_set(80);
    bsp_rgb_init();
    bsp_rgb_set(0, 12, 8);
    bsp_rtc_init();

    if (bsp_sdcard_is_inserted()) {
        if (bsp_sdcard_init_default() == ESP_OK) {
            s_sd_mounted = true;
        }
    }
    if (!s_sd_mounted) {
        bsp_spiffs_init_default();
    }
    idee_storage_init(s_sd_mounted);
    idee_modes_init();
    idee_face_reload_index();

    if (bsp_codec_init() == ESP_OK) {
        s_codec_ready = true;
    }

    init_ui();
    ui_set_state("Ready", "Tap Scan or Record");
    idee_protocol_start(handle_cmd);

    s_snap_sem = xSemaphoreCreateBinary();
    s_sscma = bsp_sscma_client_init();
    if (s_sscma) {
        const sscma_client_callback_t cb = {
            .on_connect = on_sscma_connect,
            .on_event = on_sscma_event,
        };
        sscma_client_register_callback(s_sscma, &cb, NULL);
        sscma_client_init(s_sscma);
    }

    int64_t last_auto_scan_ms = 0;
    while (1) {
        if (s_req_scan) {
            s_req_scan = false;
            run_standalone_scan();
        }
        if (s_req_record) {
            s_req_record = false;
            run_standalone_record();
        }

        idee_mode_config_t mcfg;
        idee_modes_get_config(&mcfg);
        int64_t now_ms = esp_timer_get_time() / 1000;

        if (mcfg.mode == IDEE_MODE_ALWAYS_ON &&
            (now_ms - last_auto_scan_ms) >= (int64_t)mcfg.always_on_interval_ms) {
            if (bsp_battery_get_percent() >= 15 || bsp_system_is_charging()) {
                last_auto_scan_ms = now_ms;
                run_standalone_scan();
            } else {
                ui_set_state("Low Battery", "Always-On paused (<15%)");
            }
        } else if (mcfg.mode == IDEE_MODE_CONTEXT_AWARE &&
                   (now_ms - last_auto_scan_ms) >= 5000 && s_codec_ready) {
            int16_t vad_buf[320];
            size_t rbytes = 0;
            if (bsp_i2s_read(vad_buf, sizeof(vad_buf), &rbytes, 100) == ESP_OK && rbytes >= 320) {
                double sum_sq = 0.0;
                size_t n = rbytes / 2;
                for (size_t i = 0; i < n; i++) {
                    sum_sq += (double)vad_buf[i] * (double)vad_buf[i];
                }
                double rms = sqrt(sum_sq / (double)n);
                if (rms >= mcfg.vad_rms_threshold) {
                    last_auto_scan_ms = now_ms;
                    ui_set_state("Voice Cue", "Speech detected — tap Scan");
                }
            }
        }

        vTaskDelay(pdMS_TO_TICKS(150));
    }
}

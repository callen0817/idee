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
#include "nvs_flash.h"

#include "sensecap-watcher.h"
#include "sscma_client_io.h"
#include "sscma_client_ops.h"

#include "idee_protocol.h"
#include "idee_storage.h"

static const char *TAG = "idee_main";

static esp_io_expander_handle_t s_io_exp = NULL;
static lv_disp_t *s_disp = NULL;
static sscma_client_handle_t s_sscma = NULL;
static bool s_sscma_ready = false;
static bool s_sd_mounted = false;
static bool s_codec_ready = false;

static lv_obj_t *s_lbl_title = NULL;
static lv_obj_t *s_lbl_status = NULL;
static lv_obj_t *s_lbl_stats = NULL;
static lv_obj_t *s_lbl_battery = NULL;

static SemaphoreHandle_t s_snap_sem = NULL;
static char *s_last_img_b64 = NULL;
static size_t s_last_img_len = 0;
static int s_last_box_count = 0;

static void ui_update_status(const char *status_text)
{
    if (!s_disp || !s_lbl_status) return;
    if (lvgl_port_lock(100)) {
        lv_label_set_text(s_lbl_status, status_text);
        int p = 0, e = 0, t = 0;
        idee_storage_get_counts(&p, &e, &t);
        char buf[96];
        snprintf(buf, sizeof(buf), "People: %d  |  Encounters: %d\nTemplates: %d  |  SD: %s",
                 p, e, t, s_sd_mounted ? "OK" : "SPIFFS");
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

    sscma_client_box_t *boxes = NULL;
    int box_count = 0;
    if (sscma_utils_fetch_boxes_from_reply(reply, &boxes, &box_count) == ESP_OK) {
        s_last_box_count = box_count;
        free(boxes);
    }

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
    if (duration_ms > 10000) duration_ms = 10000;

    const int sr = DRV_AUDIO_SAMPLE_RATE;
    const int total_samples = (sr * duration_ms) / 1000;
    const size_t data_bytes = (size_t)total_samples * sizeof(int16_t);
    const size_t wav_size = 44 + data_bytes;

    uint8_t *wav = heap_caps_malloc(wav_size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!wav) {
        wav = malloc(wav_size);
    }
    if (!wav) return ESP_ERR_NO_MEM;

    /* Standard 44-byte RIFF/WAVE header (16kHz, 16-bit, mono) */
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
        cJSON_AddStringToObject(res, "ver", "0.1.0");
        cJSON_AddStringToObject(res, "idf", IDF_VER);
        return res;
    }

    if (strcmp(cmd, "sys_info") == 0) {
        int p = 0, e = 0, t = 0;
        idee_storage_get_counts(&p, &e, &t);
        cJSON_AddBoolToObject(res, "ok", true);
        cJSON_AddStringToObject(res, "fw", "idee-watcher");
        cJSON_AddStringToObject(res, "ver", "0.1.0");
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
        return res;
    }

    if (strcmp(cmd, "cam_snapshot") == 0) {
        if (!s_sscma) {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "sscma_not_init");
            return res;
        }
        xSemaphoreTake(s_snap_sem, 0);
        esp_err_t err = sscma_client_sample(s_sscma, 1);
        if (err == ESP_OK && xSemaphoreTake(s_snap_sem, pdMS_TO_TICKS(4000)) == pdTRUE && s_last_img_b64) {
            cJSON_AddBoolToObject(res, "ok", true);
            cJSON_AddNumberToObject(res, "b64_len", (double)s_last_img_len);
            cJSON_AddNumberToObject(res, "box_count", s_last_box_count);
            cJSON_AddStringToObject(res, "image_b64", s_last_img_b64);
            ui_update_status("Snapshot captured");
        } else {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", "snapshot_timeout");
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
        esp_err_t err = capture_wav_to_file(rel, dur, &rms, &bytes);
        if (err == ESP_OK) {
            cJSON_AddBoolToObject(res, "ok", true);
            cJSON_AddStringToObject(res, "path", rel);
            cJSON_AddNumberToObject(res, "bytes", (double)bytes);
            cJSON_AddNumberToObject(res, "rms", rms);
            ui_update_status("Mic capture saved");
        } else {
            *ok_out = false;
            cJSON_AddBoolToObject(res, "ok", false);
            cJSON_AddStringToObject(res, "error", esp_err_to_name(err));
        }
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
        ui_update_status("HW test complete");
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
            }
        }
        cJSON *settings = params ? cJSON_GetObjectItemCaseSensitive(params, "settings") : NULL;
        if (cJSON_IsObject(settings)) {
            char *s = cJSON_PrintUnformatted(settings);
            if (s) {
                idee_storage_write_atomic("settings.json", s, strlen(s));
                free(s);
            }
        }

        idee_storage_set_counts(p_count, e_count, t_count);
        if (sync_id[0]) {
            idee_storage_record_sync_id(sync_id);
        }
        ui_update_status("Synced from Desktop");

        cJSON_AddBoolToObject(res, "ok", true);
        cJSON_AddBoolToObject(res, "duplicate", false);
        cJSON_AddStringToObject(res, "sync_id", sync_id);
        cJSON_AddNumberToObject(res, "people_count", p_count);
        cJSON_AddNumberToObject(res, "templates_count", t_count);
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

static void knob_left_cb(void *arg, void *data)
{
    ui_update_status("Wheel: Left");
    idee_protocol_send_event("knob", cJSON_CreateString("left"));
}

static void knob_right_cb(void *arg, void *data)
{
    ui_update_status("Wheel: Right");
    idee_protocol_send_event("knob", cJSON_CreateString("right"));
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
        lv_obj_align(s_lbl_title, LV_ALIGN_TOP_MID, 0, 56);

        s_lbl_status = lv_label_create(scr);
        lv_label_set_text(s_lbl_status, "Ready (On Demand)");
        lv_obj_set_style_text_color(s_lbl_status, lv_color_hex(0xF3F4F6), 0);
        lv_obj_set_style_text_font(s_lbl_status, &lv_font_montserrat_18, 0);
        lv_obj_align(s_lbl_status, LV_ALIGN_CENTER, 0, -16);

        s_lbl_stats = lv_label_create(scr);
        lv_label_set_text(s_lbl_stats, "People: 0  |  Encounters: 0");
        lv_obj_set_style_text_color(s_lbl_stats, lv_color_hex(0x9CA3AF), 0);
        lv_obj_set_style_text_font(s_lbl_stats, &lv_font_montserrat_14, 0);
        lv_obj_set_style_text_align(s_lbl_stats, LV_TEXT_ALIGN_CENTER, 0);
        lv_obj_align(s_lbl_stats, LV_ALIGN_CENTER, 0, 44);

        s_lbl_battery = lv_label_create(scr);
        lv_label_set_text(s_lbl_battery, "Bat: --%");
        lv_obj_set_style_text_color(s_lbl_battery, lv_color_hex(0x6B7280), 0);
        lv_obj_set_style_text_font(s_lbl_battery, &lv_font_montserrat_14, 0);
        lv_obj_align(s_lbl_battery, LV_ALIGN_BOTTOM_MID, 0, -44);

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

    ESP_LOGI(TAG, "=== iDee Watcher v0.1.0 Booting ===");

    s_io_exp = bsp_io_expander_init();
    s_disp = bsp_lvgl_init();
    bsp_lcd_brightness_set(80);
    bsp_rgb_init();
    bsp_rgb_set(0, 12, 8);
    bsp_rtc_init();

    if (bsp_sdcard_is_inserted()) {
        ESP_LOGI(TAG, "SD card detected, mounting...");
        if (bsp_sdcard_init_default() == ESP_OK) {
            s_sd_mounted = true;
        } else {
            ESP_LOGW(TAG, "SD mount failed, falling back to SPIFFS");
        }
    }
    if (!s_sd_mounted) {
        ESP_LOGI(TAG, "Mounting SPIFFS...");
        bsp_spiffs_init_default();
    }
    idee_storage_init(s_sd_mounted);

    ESP_LOGI(TAG, "Initializing audio codec...");
    if (bsp_codec_init() == ESP_OK) {
        s_codec_ready = true;
    }

    init_ui();
    ui_update_status("Ready (On Demand)");
    idee_protocol_start(handle_cmd);

    s_snap_sem = xSemaphoreCreateBinary();
    ESP_LOGI(TAG, "Initializing Himax SSCMA client...");
    s_sscma = bsp_sscma_client_init();
    if (s_sscma) {
        const sscma_client_callback_t cb = {
            .on_connect = on_sscma_connect,
            .on_event = on_sscma_event,
        };
        sscma_client_register_callback(s_sscma, &cb, NULL);
        sscma_client_init(s_sscma);
    }

    while (1) {
        vTaskDelay(pdMS_TO_TICKS(10000));
        ui_update_status("Ready (On Demand)");
    }
}

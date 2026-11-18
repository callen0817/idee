#include "idee_modes.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "esp_log.h"
#include "esp_timer.h"
#include "idee_face.h"
#include "idee_storage.h"

static const char *TAG = "idee_modes";

static idee_mode_config_t s_cfg = {
    .mode = IDEE_MODE_ON_DEMAND,
    .camera_off_by_default = true,
    .discreet_output = true,
    .recording_active = false,
    .always_on_interval_ms = 15000,
    .cooldown_ms = 30000,
    .face_threshold = IDEE_DEFAULT_FACE_THRESHOLD,
    .vad_rms_threshold = 900.0f,
};

void idee_modes_init(void)
{
    char *buf = NULL;
    size_t len = 0;
    if (idee_storage_read_file("settings.json", &buf, &len) == ESP_OK && buf) {
        cJSON *obj = cJSON_ParseWithLength(buf, len);
        free(buf);
        if (obj) {
            idee_modes_apply_settings_json(obj);
            cJSON_Delete(obj);
        }
    }
    ESP_LOGI(TAG, "Mode initialized: %s", idee_modes_name(s_cfg.mode));
}

idee_mode_t idee_modes_get(void)
{
    return s_cfg.mode;
}

const char *idee_modes_name(idee_mode_t mode)
{
    switch (mode) {
    case IDEE_MODE_ALWAYS_ON:
        return "always_on";
    case IDEE_MODE_CONTEXT_AWARE:
        return "context_aware";
    case IDEE_MODE_ON_DEMAND:
    default:
        return "on_demand";
    }
}

esp_err_t idee_modes_set(idee_mode_t mode)
{
    s_cfg.mode = mode;
    ESP_LOGI(TAG, "Mode switched to %s", idee_modes_name(mode));
    return ESP_OK;
}

void idee_modes_get_config(idee_mode_config_t *out)
{
    if (out) *out = s_cfg;
}

void idee_modes_apply_settings_json(const cJSON *settings)
{
    if (!cJSON_IsObject(settings)) return;
    const cJSON *m = cJSON_GetObjectItemCaseSensitive(settings, "activationMode");
    if (cJSON_IsString(m)) {
        if (strcmp(m->valuestring, "always_on") == 0) {
            s_cfg.mode = IDEE_MODE_ALWAYS_ON;
        } else if (strcmp(m->valuestring, "context_aware") == 0) {
            s_cfg.mode = IDEE_MODE_CONTEXT_AWARE;
        } else {
            s_cfg.mode = IDEE_MODE_ON_DEMAND;
        }
    }
    const cJSON *cam_off = cJSON_GetObjectItemCaseSensitive(settings, "cameraOffByDefault");
    if (cJSON_IsBool(cam_off)) {
        s_cfg.camera_off_by_default = cJSON_IsTrue(cam_off);
    }
    const cJSON *discreet = cJSON_GetObjectItemCaseSensitive(settings, "discreetScreenOutput");
    if (cJSON_IsBool(discreet)) {
        s_cfg.discreet_output = cJSON_IsTrue(discreet);
    }
}

esp_err_t idee_modes_save_encounter(
    const char *enc_id,
    const char *person_id,
    const char *evidence_type,
    const char *summary,
    float confidence,
    const char *audio_path)
{
    char *buf = NULL;
    size_t len = 0;
    cJSON *arr = NULL;
    if (idee_storage_read_file("encounters.json", &buf, &len) == ESP_OK && buf) {
        arr = cJSON_ParseWithLength(buf, len);
        free(buf);
    }
    if (!cJSON_IsArray(arr)) {
        if (arr) cJSON_Delete(arr);
        arr = cJSON_CreateArray();
    }

    cJSON *enc = cJSON_CreateObject();
    char id_buf[48];
    if (enc_id && enc_id[0]) {
        snprintf(id_buf, sizeof(id_buf), "%s", enc_id);
    } else {
        snprintf(id_buf, sizeof(id_buf), "enc_%llu", (unsigned long long)(esp_timer_get_time() / 1000));
    }
    cJSON_AddStringToObject(enc, "id", id_buf);

    char ts_buf[32];
    snprintf(ts_buf, sizeof(ts_buf), "uptime_%llums", (unsigned long long)(esp_timer_get_time() / 1000));
    cJSON_AddStringToObject(enc, "timestamp", ts_buf);

    if (person_id && person_id[0]) {
        cJSON_AddStringToObject(enc, "personId", person_id);
    } else {
        cJSON_AddNullToObject(enc, "personId");
    }
    cJSON_AddStringToObject(enc, "evidenceType", evidence_type ? evidence_type : "button");
    cJSON_AddStringToObject(enc, "contextSummary", summary ? summary : "Captured encounter");
    cJSON_AddItemToObject(enc, "followUps", cJSON_CreateArray());
    cJSON_AddNumberToObject(enc, "confidence", confidence);
    cJSON_AddItemToObject(enc, "correctionHistory", cJSON_CreateArray());
    if (audio_path && audio_path[0]) {
        cJSON_AddStringToObject(enc, "audioPath", audio_path);
        cJSON_AddBoolToObject(enc, "rawAudioDeleted", false);
    }

    cJSON_AddItemToArray(arr, enc);
    int enc_count = cJSON_GetArraySize(arr);
    char *json_str = cJSON_PrintUnformatted(arr);
    cJSON_Delete(arr);
    if (!json_str) return ESP_ERR_NO_MEM;

    esp_err_t err = idee_storage_write_atomic("encounters.json", json_str, strlen(json_str));
    free(json_str);
    if (err == ESP_OK) {
        int p = 0, e = 0, t = 0;
        idee_storage_get_counts(&p, &e, &t);
        idee_storage_set_counts(p, enc_count, t);
    }
    return err;
}

esp_err_t idee_modes_correct_encounter(const char *enc_id, const char *new_person_id, const char *reason)
{
    if (!enc_id) return ESP_ERR_INVALID_ARG;
    char *buf = NULL;
    size_t len = 0;
    if (idee_storage_read_file("encounters.json", &buf, &len) != ESP_OK || !buf) {
        return ESP_ERR_NOT_FOUND;
    }
    cJSON *arr = cJSON_ParseWithLength(buf, len);
    free(buf);
    if (!cJSON_IsArray(arr)) {
        if (arr) cJSON_Delete(arr);
        return ESP_FAIL;
    }

    bool updated = false;
    int n = cJSON_GetArraySize(arr);
    for (int i = 0; i < n; i++) {
        cJSON *item = cJSON_GetArrayItem(arr, i);
        const cJSON *id = cJSON_GetObjectItemCaseSensitive(item, "id");
        if (cJSON_IsString(id) && strcmp(id->valuestring, enc_id) == 0) {
            cJSON *old_pid = cJSON_GetObjectItemCaseSensitive(item, "personId");
            cJSON *hist = cJSON_GetObjectItemCaseSensitive(item, "correctionHistory");
            if (cJSON_IsArray(hist)) {
                cJSON *entry = cJSON_CreateObject();
                cJSON_AddStringToObject(entry, "reason", reason ? reason : "user_correction");
                if (cJSON_IsString(old_pid)) {
                    cJSON_AddStringToObject(entry, "fromPersonId", old_pid->valuestring);
                } else {
                    cJSON_AddNullToObject(entry, "fromPersonId");
                }
                if (new_person_id && new_person_id[0]) {
                    cJSON_AddStringToObject(entry, "toPersonId", new_person_id);
                } else {
                    cJSON_AddNullToObject(entry, "toPersonId");
                }
                cJSON_AddItemToArray(hist, entry);
            }
            cJSON_DeleteItemFromObjectCaseSensitive(item, "personId");
            if (new_person_id && new_person_id[0]) {
                cJSON_AddStringToObject(item, "personId", new_person_id);
            } else {
                cJSON_AddNullToObject(item, "personId");
            }
            updated = true;
            break;
        }
    }

    if (!updated) {
        cJSON_Delete(arr);
        return ESP_ERR_NOT_FOUND;
    }

    char *json_str = cJSON_PrintUnformatted(arr);
    cJSON_Delete(arr);
    if (!json_str) return ESP_ERR_NO_MEM;
    esp_err_t err = idee_storage_write_atomic("encounters.json", json_str, strlen(json_str));
    free(json_str);
    return err;
}

esp_err_t idee_modes_delete_encounter_audio(const char *enc_id)
{
    if (!enc_id) return ESP_ERR_INVALID_ARG;
    char *buf = NULL;
    size_t len = 0;
    if (idee_storage_read_file("encounters.json", &buf, &len) != ESP_OK || !buf) {
        return ESP_ERR_NOT_FOUND;
    }
    cJSON *arr = cJSON_ParseWithLength(buf, len);
    free(buf);
    if (!cJSON_IsArray(arr)) {
        if (arr) cJSON_Delete(arr);
        return ESP_FAIL;
    }

    bool updated = false;
    int n = cJSON_GetArraySize(arr);
    for (int i = 0; i < n; i++) {
        cJSON *item = cJSON_GetArrayItem(arr, i);
        const cJSON *id = cJSON_GetObjectItemCaseSensitive(item, "id");
        if (cJSON_IsString(id) && strcmp(id->valuestring, enc_id) == 0) {
            const cJSON *ap = cJSON_GetObjectItemCaseSensitive(item, "audioPath");
            if (cJSON_IsString(ap) && ap->valuestring[0]) {
                char full_path[160];
                snprintf(full_path, sizeof(full_path), "%s/%s", idee_storage_base_dir(), ap->valuestring);
                unlink(full_path);
            }
            cJSON_DeleteItemFromObjectCaseSensitive(item, "rawAudioDeleted");
            cJSON_AddBoolToObject(item, "rawAudioDeleted", true);
            updated = true;
            break;
        }
    }

    if (!updated) {
        cJSON_Delete(arr);
        return ESP_ERR_NOT_FOUND;
    }

    char *json_str = cJSON_PrintUnformatted(arr);
    cJSON_Delete(arr);
    if (!json_str) return ESP_ERR_NO_MEM;
    esp_err_t err = idee_storage_write_atomic("encounters.json", json_str, strlen(json_str));
    free(json_str);
    return err;
}

#include "idee_storage.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include "esp_log.h"
#include "cJSON.h"

static const char *TAG = "idee_storage";

static bool s_use_sd = false;
static char s_base_dir[32] = "/spiffs/idee";
static int s_people_count = 0;
static int s_encounters_count = 0;
static int s_templates_count = 0;

static void ensure_dir(const char *path)
{
    struct stat st;
    if (stat(path, &st) == -1) {
        mkdir(path, 0755);
    }
}

static int count_json_array(const char *rel_path)
{
    char *buf = NULL;
    size_t len = 0;
    if (idee_storage_read_file(rel_path, &buf, &len) != ESP_OK || !buf) {
        return 0;
    }
    cJSON *root = cJSON_ParseWithLength(buf, len);
    free(buf);
    if (!root) {
        return 0;
    }
    int count = cJSON_IsArray(root) ? cJSON_GetArraySize(root) : 0;
    cJSON_Delete(root);
    return count;
}

esp_err_t idee_storage_init(bool sd_mounted)
{
    s_use_sd = sd_mounted;
    snprintf(s_base_dir, sizeof(s_base_dir), "%s", sd_mounted ? "/sdcard/idee" : "/spiffs/idee");
    ensure_dir(s_base_dir);

    char audio_dir[64];
    snprintf(audio_dir, sizeof(audio_dir), "%s/audio", s_base_dir);
    ensure_dir(audio_dir);

    s_people_count = count_json_array("people.json");
    s_encounters_count = count_json_array("encounters.json");
    s_templates_count = count_json_array("templates.json");

    ESP_LOGI(TAG, "Storage initialized at %s (people=%d, encounters=%d, templates=%d)",
             s_base_dir, s_people_count, s_encounters_count, s_templates_count);
    return ESP_OK;
}

const char *idee_storage_base_dir(void)
{
    return s_base_dir;
}

bool idee_storage_is_sd(void)
{
    return s_use_sd;
}

esp_err_t idee_storage_write_atomic(const char *rel_path, const void *data, size_t len)
{
    char final_path[128];
    char tmp_path[140];
    snprintf(final_path, sizeof(final_path), "%s/%s", s_base_dir, rel_path);
    snprintf(tmp_path, sizeof(tmp_path), "%s/%s.tmp", s_base_dir, rel_path);

    FILE *f = fopen(tmp_path, "wb");
    if (!f) {
        ESP_LOGE(TAG, "Failed to open %s for writing", tmp_path);
        return ESP_FAIL;
    }

    size_t written = fwrite(data, 1, len, f);
    fflush(f);
    fsync(fileno(f));
    fclose(f);

    if (written != len) {
        ESP_LOGE(TAG, "Partial write to %s (%u/%u)", tmp_path, (unsigned)written, (unsigned)len);
        unlink(tmp_path);
        return ESP_FAIL;
    }

    unlink(final_path);
    if (rename(tmp_path, final_path) != 0) {
        ESP_LOGE(TAG, "Failed to rename %s -> %s", tmp_path, final_path);
        unlink(tmp_path);
        return ESP_FAIL;
    }
    return ESP_OK;
}

esp_err_t idee_storage_read_file(const char *rel_path, char **out_buf, size_t *out_len)
{
    *out_buf = NULL;
    *out_len = 0;

    char path[128];
    snprintf(path, sizeof(path), "%s/%s", s_base_dir, rel_path);

    FILE *f = fopen(path, "rb");
    if (!f) {
        return ESP_ERR_NOT_FOUND;
    }
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (sz <= 0 || sz > (512 * 1024)) {
        fclose(f);
        return ESP_ERR_INVALID_SIZE;
    }

    char *buf = malloc((size_t)sz + 1);
    if (!buf) {
        fclose(f);
        return ESP_ERR_NO_MEM;
    }
    size_t n = fread(buf, 1, (size_t)sz, f);
    fclose(f);
    buf[n] = '\0';
    *out_buf = buf;
    *out_len = n;
    return ESP_OK;
}

bool idee_storage_has_sync_id(const char *sync_id)
{
    if (!sync_id || !sync_id[0]) {
        return false;
    }
    char *buf = NULL;
    size_t len = 0;
    if (idee_storage_read_file("sync_ids.log", &buf, &len) != ESP_OK || !buf) {
        return false;
    }
    bool found = strstr(buf, sync_id) != NULL;
    free(buf);
    return found;
}

esp_err_t idee_storage_record_sync_id(const char *sync_id)
{
    if (!sync_id || !sync_id[0]) {
        return ESP_ERR_INVALID_ARG;
    }
    char path[128];
    snprintf(path, sizeof(path), "%s/sync_ids.log", s_base_dir);
    FILE *f = fopen(path, "ab");
    if (!f) {
        return ESP_FAIL;
    }
    fprintf(f, "%s\n", sync_id);
    fflush(f);
    fsync(fileno(f));
    fclose(f);
    return ESP_OK;
}

void idee_storage_get_counts(int *people_count, int *encounters_count, int *templates_count)
{
    if (people_count) *people_count = s_people_count;
    if (encounters_count) *encounters_count = s_encounters_count;
    if (templates_count) *templates_count = s_templates_count;
}

void idee_storage_set_counts(int people_count, int encounters_count, int templates_count)
{
    s_people_count = people_count;
    s_encounters_count = encounters_count;
    s_templates_count = templates_count;
}

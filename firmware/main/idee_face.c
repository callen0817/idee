#include "idee_face.h"

#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "esp_log.h"
#include "mbedtls/base64.h"
#include "idee_storage.h"

static const char *TAG = "idee_face";

static idee_active_template_t s_index[IDEE_MAX_ACTIVE_TEMPLATES];
static int s_index_count = 0;

static void l2_normalize(float *vec, int dim)
{
    double sum = 0.0;
    for (int i = 0; i < dim; i++) {
        sum += (double)vec[i] * (double)vec[i];
    }
    double norm = sqrt(sum);
    if (norm > 1e-8) {
        for (int i = 0; i < dim; i++) {
            vec[i] = (float)((double)vec[i] / norm);
        }
    }
}

static float cosine_sim(const float *a, const float *b, int dim)
{
    double dot = 0.0;
    for (int i = 0; i < dim; i++) {
        dot += (double)a[i] * (double)b[i];
    }
    return (float)dot;
}

esp_err_t idee_face_reload_index(void)
{
    s_index_count = 0;
    memset(s_index, 0, sizeof(s_index));

    char *buf = NULL;
    size_t len = 0;
    if (idee_storage_read_file("templates.json", &buf, &len) != ESP_OK || !buf) {
        return ESP_OK;
    }

    cJSON *arr = cJSON_ParseWithLength(buf, len);
    free(buf);
    if (!cJSON_IsArray(arr)) {
        if (arr) cJSON_Delete(arr);
        return ESP_OK;
    }

    int total = cJSON_GetArraySize(arr);
    for (int i = 0; i < total && s_index_count < IDEE_MAX_ACTIVE_TEMPLATES; i++) {
        cJSON *item = cJSON_GetArrayItem(arr, i);
        if (!cJSON_IsObject(item)) continue;

        const cJSON *pid = cJSON_GetObjectItemCaseSensitive(item, "personId");
        const cJSON *tid = cJSON_GetObjectItemCaseSensitive(item, "id");
        const cJSON *mid = cJSON_GetObjectItemCaseSensitive(item, "modelId");
        const cJSON *mver = cJSON_GetObjectItemCaseSensitive(item, "modelVersion");
        const cJSON *emb_arr = cJSON_GetObjectItemCaseSensitive(item, "embedding");
        const cJSON *emb_b64 = cJSON_GetObjectItemCaseSensitive(item, "embeddingB64");

        if (!cJSON_IsString(pid) || !pid->valuestring[0]) continue;

        idee_active_template_t *slot = &s_index[s_index_count];
        snprintf(slot->person_id, sizeof(slot->person_id), "%s", pid->valuestring);
        snprintf(slot->id, sizeof(slot->id), "%s", cJSON_IsString(tid) ? tid->valuestring : "");
        snprintf(slot->model_id, sizeof(slot->model_id), "%s", cJSON_IsString(mid) ? mid->valuestring : "unknown");
        snprintf(slot->model_version, sizeof(slot->model_version), "%s", cJSON_IsString(mver) ? mver->valuestring : "0");

        bool has_vec = false;
        if (cJSON_IsArray(emb_arr) && cJSON_GetArraySize(emb_arr) == IDEE_FACE_DIM) {
            for (int d = 0; d < IDEE_FACE_DIM; d++) {
                cJSON *v = cJSON_GetArrayItem(emb_arr, d);
                slot->embedding[d] = cJSON_IsNumber(v) ? (float)v->valuedouble : 0.0f;
            }
            has_vec = true;
        } else if (cJSON_IsString(emb_b64) && emb_b64->valuestring[0]) {
            uint8_t raw[IDEE_FACE_DIM * 4];
            size_t out_len = 0;
            if (mbedtls_base64_decode(raw, sizeof(raw), &out_len,
                                      (const unsigned char *)emb_b64->valuestring,
                                      strlen(emb_b64->valuestring)) == 0) {
                if (out_len == IDEE_FACE_DIM) {
                    const int8_t *q = (const int8_t *)raw;
                    for (int d = 0; d < IDEE_FACE_DIM; d++) {
                        slot->embedding[d] = (float)q[d];
                    }
                    has_vec = true;
                } else if (out_len == IDEE_FACE_DIM * sizeof(float)) {
                    memcpy(slot->embedding, raw, IDEE_FACE_DIM * sizeof(float));
                    has_vec = true;
                }
            }
        }

        if (has_vec) {
            l2_normalize(slot->embedding, IDEE_FACE_DIM);
            slot->valid = true;
            s_index_count++;
        }
    }

    cJSON_Delete(arr);
    ESP_LOGI(TAG, "Loaded %d active face templates into RAM index", s_index_count);
    return ESP_OK;
}

int idee_face_active_count(void)
{
    return s_index_count;
}

esp_err_t idee_face_match(const float *emb, int dim, float threshold, idee_face_match_t *out)
{
    if (!emb || dim != IDEE_FACE_DIM || !out) return ESP_ERR_INVALID_ARG;

    memset(out, 0, sizeof(*out));
    float query[IDEE_FACE_DIM];
    memcpy(query, emb, sizeof(query));
    l2_normalize(query, IDEE_FACE_DIM);

    float best = -1.0f;
    float second = -1.0f;
    int best_idx = -1;

    for (int i = 0; i < s_index_count; i++) {
        if (!s_index[i].valid) continue;
        float sim = cosine_sim(query, s_index[i].embedding, IDEE_FACE_DIM);
        out->candidates_checked++;
        if (sim > best) {
            second = best;
            best = sim;
            best_idx = i;
        } else if (sim > second) {
            second = sim;
        }
    }

    out->confidence = best_idx >= 0 ? best : 0.0f;
    out->second_best = second > -1.0f ? second : 0.0f;

    if (best_idx >= 0 && best >= threshold) {
        out->matched = true;
        snprintf(out->person_id, sizeof(out->person_id), "%s", s_index[best_idx].person_id);
        snprintf(out->template_id, sizeof(out->template_id), "%s", s_index[best_idx].id);
    } else {
        out->matched = false;
    }
    return ESP_OK;
}

esp_err_t idee_face_enroll_embedding(
    const char *person_id,
    const char *model_id,
    const char *model_version,
    const float *emb,
    int dim)
{
    if (!person_id || !emb || dim != IDEE_FACE_DIM) return ESP_ERR_INVALID_ARG;

    float norm_emb[IDEE_FACE_DIM];
    memcpy(norm_emb, emb, sizeof(norm_emb));
    l2_normalize(norm_emb, IDEE_FACE_DIM);

    char *buf = NULL;
    size_t len = 0;
    cJSON *arr = NULL;
    if (idee_storage_read_file("templates.json", &buf, &len) == ESP_OK && buf) {
        arr = cJSON_ParseWithLength(buf, len);
        free(buf);
    }
    if (!cJSON_IsArray(arr)) {
        if (arr) cJSON_Delete(arr);
        arr = cJSON_CreateArray();
    }

    cJSON *tpl = cJSON_CreateObject();
    char tid[48];
    snprintf(tid, sizeof(tid), "tpl_%lu", (unsigned long)(esp_log_timestamp()));
    cJSON_AddStringToObject(tpl, "id", tid);
    cJSON_AddStringToObject(tpl, "personId", person_id);
    cJSON_AddStringToObject(tpl, "modelId", model_id ? model_id : "scrfd-mfn-128d-int8");
    cJSON_AddStringToObject(tpl, "modelVersion", model_version ? model_version : "1.0.0");
    cJSON_AddNumberToObject(tpl, "embeddingDim", IDEE_FACE_DIM);
    cJSON_AddStringToObject(tpl, "quantization", "fp32");
    cJSON_AddStringToObject(tpl, "enrollmentProvenance", "watcher_camera");

    cJSON *vec = cJSON_CreateFloatArray(norm_emb, IDEE_FACE_DIM);
    cJSON_AddItemToObject(tpl, "embedding", vec);
    cJSON_AddItemToArray(arr, tpl);

    char *json_str = cJSON_PrintUnformatted(arr);
    cJSON_Delete(arr);
    if (!json_str) return ESP_ERR_NO_MEM;

    esp_err_t err = idee_storage_write_atomic("templates.json", json_str, strlen(json_str));
    free(json_str);
    if (err == ESP_OK) {
        idee_face_reload_index();
    }
    return err;
}

bool idee_face_extract_from_sscma(
    const sscma_client_reply_t *reply,
    float *out_emb,
    int *out_dim,
    int *out_box_count)
{
    if (out_dim) *out_dim = 0;
    if (out_box_count) *out_box_count = 0;
    if (!reply || !reply->payload) return false;

    cJSON *data = cJSON_GetObjectItemCaseSensitive(reply->payload, "data");
    if (!data) return false;

    cJSON *boxes = cJSON_GetObjectItemCaseSensitive(data, "boxes");
    if (cJSON_IsArray(boxes) && out_box_count) {
        *out_box_count = cJSON_GetArraySize(boxes);
    }

    cJSON *emb = cJSON_GetObjectItemCaseSensitive(data, "embedding");
    if (!cJSON_IsArray(emb)) {
        emb = cJSON_GetObjectItemCaseSensitive(data, "embeddings");
        if (cJSON_IsArray(emb) && cJSON_GetArraySize(emb) > 0) {
            cJSON *first = cJSON_GetArrayItem(emb, 0);
            if (cJSON_IsArray(first)) emb = first;
        }
    }

    if (cJSON_IsArray(emb) && out_emb && out_dim) {
        int n = cJSON_GetArraySize(emb);
        if (n == IDEE_FACE_DIM) {
            for (int i = 0; i < IDEE_FACE_DIM; i++) {
                cJSON *v = cJSON_GetArrayItem(emb, i);
                out_emb[i] = cJSON_IsNumber(v) ? (float)v->valuedouble : 0.0f;
            }
            *out_dim = IDEE_FACE_DIM;
            return true;
        }
    }
    return false;
}

bool idee_face_lookup_person_cue(
    const char *person_id,
    char *out_name, size_t name_sz,
    char *out_cue, size_t cue_sz)
{
    if (!person_id || !out_name || !out_cue) return false;
    out_name[0] = '\0';
    out_cue[0] = '\0';

    char *buf = NULL;
    size_t len = 0;
    if (idee_storage_read_file("people.json", &buf, &len) != ESP_OK || !buf) {
        return false;
    }

    cJSON *arr = cJSON_ParseWithLength(buf, len);
    free(buf);
    if (!cJSON_IsArray(arr)) {
        if (arr) cJSON_Delete(arr);
        return false;
    }

    bool found = false;
    int n = cJSON_GetArraySize(arr);
    for (int i = 0; i < n; i++) {
        cJSON *p = cJSON_GetArrayItem(arr, i);
        const cJSON *id = cJSON_GetObjectItemCaseSensitive(p, "id");
        if (cJSON_IsString(id) && strcmp(id->valuestring, person_id) == 0) {
            const cJSON *name = cJSON_GetObjectItemCaseSensitive(p, "name");
            const cJSON *rel = cJSON_GetObjectItemCaseSensitive(p, "relationship");
            const cJSON *comp = cJSON_GetObjectItemCaseSensitive(p, "company");
            const cJSON *notes = cJSON_GetObjectItemCaseSensitive(p, "notes");

            snprintf(out_name, name_sz, "%s", cJSON_IsString(name) ? name->valuestring : "Known Person");
            const char *r = cJSON_IsString(rel) ? rel->valuestring : "";
            const char *c = cJSON_IsString(comp) ? comp->valuestring : "";
            const char *nt = cJSON_IsString(notes) ? notes->valuestring : "";

            if (nt[0]) {
                snprintf(out_cue, cue_sz, "%s%s%s", r[0] ? r : c, (r[0] || c[0]) ? " · " : "", nt);
            } else {
                snprintf(out_cue, cue_sz, "%s%s%s", r, (r[0] && c[0]) ? " · " : "", c);
            }
            found = true;
            break;
        }
    }

    cJSON_Delete(arr);
    return found;
}

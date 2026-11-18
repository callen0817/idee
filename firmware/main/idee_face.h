#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "cJSON.h"
#include "esp_err.h"
#include "sscma_client_types.h"

#ifdef __cplusplus
extern "C" {
#endif

#define IDEE_FACE_DIM 128
#define IDEE_MAX_ACTIVE_TEMPLATES 64
#define IDEE_DEFAULT_FACE_THRESHOLD 0.30f

typedef struct {
    char id[48];
    char person_id[48];
    char model_id[48];
    char model_version[24];
    float embedding[IDEE_FACE_DIM];
    bool valid;
} idee_active_template_t;

typedef struct {
    bool matched;
    char person_id[48];
    char template_id[48];
    float confidence;
    float second_best;
    int candidates_checked;
} idee_face_match_t;

/**
 * Load active recognition templates from storage (templates.json) into RAM index.
 */
esp_err_t idee_face_reload_index(void);

/**
 * Return number of active templates currently loaded in RAM.
 */
int idee_face_active_count(void);

/**
 * Compare a 128-D embedding against the active index using cosine similarity.
 * Returns matched=true only when best_score >= threshold.
 */
esp_err_t idee_face_match(const float *emb, int dim, float threshold, idee_face_match_t *out);

/**
 * Add or update a template in RAM and persist to templates.json.
 */
esp_err_t idee_face_enroll_embedding(
    const char *person_id,
    const char *model_id,
    const char *model_version,
    const float *emb,
    int dim);

/**
 * Inspect an SSCMA reply for face boxes and optional 128-D embedding vector.
 */
bool idee_face_extract_from_sscma(
    const sscma_client_reply_t *reply,
    float *out_emb,
    int *out_dim,
    int *out_box_count);

/**
 * Lookup person summary fields from people.json by person_id.
 */
bool idee_face_lookup_person_cue(
    const char *person_id,
    char *out_name, size_t name_sz,
    char *out_cue, size_t cue_sz);

#ifdef __cplusplus
}
#endif

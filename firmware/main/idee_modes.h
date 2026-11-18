#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "cJSON.h"
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    IDEE_MODE_ON_DEMAND = 0,
    IDEE_MODE_ALWAYS_ON = 1,
    IDEE_MODE_CONTEXT_AWARE = 2,
} idee_mode_t;

typedef struct {
    idee_mode_t mode;
    bool camera_off_by_default;
    bool discreet_output;
    bool recording_active;
    uint32_t always_on_interval_ms;
    uint32_t cooldown_ms;
    float face_threshold;
    float vad_rms_threshold;
} idee_mode_config_t;

void idee_modes_init(void);
idee_mode_t idee_modes_get(void);
const char *idee_modes_name(idee_mode_t mode);
esp_err_t idee_modes_set(idee_mode_t mode);
void idee_modes_get_config(idee_mode_config_t *out);
void idee_modes_apply_settings_json(const cJSON *settings);

/**
 * Append a new encounter record to encounters.json atomically.
 */
esp_err_t idee_modes_save_encounter(
    const char *enc_id,
    const char *person_id,
    const char *evidence_type,
    const char *summary,
    float confidence,
    const char *audio_path);

/**
 * Re-associate an existing encounter with a corrected person_id.
 */
esp_err_t idee_modes_correct_encounter(const char *enc_id, const char *new_person_id, const char *reason);

/**
 * Delete a raw audio file and mark rawAudioDeleted=true in encounters.json.
 */
esp_err_t idee_modes_delete_encounter_audio(const char *enc_id);

#ifdef __cplusplus
}
#endif

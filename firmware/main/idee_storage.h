#pragma once

#include <stdbool.h>
#include <stddef.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Initialize iDee storage (prefers /sdcard/idee, falls back to /spiffs/idee).
 */
esp_err_t idee_storage_init(bool sd_mounted);

/**
 * Return active storage base directory ("/sdcard/idee" or "/spiffs/idee").
 */
const char *idee_storage_base_dir(void);

/**
 * True if microSD is mounted and used as primary durable storage.
 */
bool idee_storage_is_sd(void);

/**
 * Atomically write data to <base_dir>/<rel_path> using .tmp + fsync + rename.
 */
esp_err_t idee_storage_write_atomic(const char *rel_path, const void *data, size_t len);

/**
 * Read entire file from <base_dir>/<rel_path> into heap-allocated buffer (caller frees).
 */
esp_err_t idee_storage_read_file(const char *rel_path, char **out_buf, size_t *out_len);

/**
 * Check if sync_id has already been applied (idempotency guard).
 */
bool idee_storage_has_sync_id(const char *sync_id);

/**
 * Record an applied sync_id.
 */
esp_err_t idee_storage_record_sync_id(const char *sync_id);

/**
 * Return cached counts of synced people and encounters.
 */
void idee_storage_get_counts(int *people_count, int *encounters_count, int *templates_count);

/**
 * Update cached counts after sync.
 */
void idee_storage_set_counts(int people_count, int encounters_count, int templates_count);

#ifdef __cplusplus
}
#endif

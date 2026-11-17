#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "cJSON.h"

#ifdef __cplusplus
extern "C" {
#endif

#define IDEE_FRAME_MAGIC0 0xAA
#define IDEE_FRAME_MAGIC1 0x55
#define IDEE_FRAME_MAGIC2 'I'
#define IDEE_FRAME_MAGIC3 'D'
#define IDEE_FRAME_VERSION 1

typedef enum {
    IDEE_MSG_REQ  = 0x01,
    IDEE_MSG_ACK  = 0x02,
    IDEE_MSG_NACK = 0x03,
    IDEE_MSG_EVT  = 0x04,
} idee_msg_type_t;

typedef cJSON *(*idee_cmd_handler_t)(const char *cmd, cJSON *params, bool *ok_out);

/**
 * Start the framed USB serial protocol task on UART0.
 */
esp_err_t idee_protocol_start(idee_cmd_handler_t handler);

/**
 * Send an asynchronous event frame to the desktop host.
 */
esp_err_t idee_protocol_send_event(const char *event_name, cJSON *data);

#ifdef __cplusplus
}
#endif

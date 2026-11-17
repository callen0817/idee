#include "idee_protocol.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "driver/uart.h"
#include "esp_crc.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

static const char *TAG = "idee_proto";

#define IDEE_UART_NUM UART_NUM_0
#define IDEE_MAX_PAYLOAD (64 * 1024)
#define IDEE_HDR_SIZE 16

static idee_cmd_handler_t s_handler = NULL;
static SemaphoreHandle_t s_tx_mutex = NULL;
static uint32_t s_evt_seq = 1;

static void write_u16_le(uint8_t *p, uint16_t v)
{
    p[0] = (uint8_t)(v & 0xFF);
    p[1] = (uint8_t)((v >> 8) & 0xFF);
}

static void write_u32_le(uint8_t *p, uint32_t v)
{
    p[0] = (uint8_t)(v & 0xFF);
    p[1] = (uint8_t)((v >> 8) & 0xFF);
    p[2] = (uint8_t)((v >> 16) & 0xFF);
    p[3] = (uint8_t)((v >> 24) & 0xFF);
}

static uint32_t read_u32_le(const uint8_t *p)
{
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static esp_err_t send_frame(uint8_t msg_type, uint32_t seq, const char *json_str)
{
    if (!s_tx_mutex) return ESP_ERR_INVALID_STATE;
    size_t len = json_str ? strlen(json_str) : 0;
    if (len > IDEE_MAX_PAYLOAD) return ESP_ERR_INVALID_SIZE;

    uint8_t hdr[IDEE_HDR_SIZE];
    hdr[0] = IDEE_FRAME_MAGIC0;
    hdr[1] = IDEE_FRAME_MAGIC1;
    hdr[2] = IDEE_FRAME_MAGIC2;
    hdr[3] = IDEE_FRAME_MAGIC3;
    hdr[4] = IDEE_FRAME_VERSION;
    hdr[5] = msg_type;
    write_u16_le(&hdr[6], 0);
    write_u32_le(&hdr[8], seq);
    write_u32_le(&hdr[12], (uint32_t)len);

    uint32_t crc = esp_crc32_le(0, &hdr[4], IDEE_HDR_SIZE - 4);
    if (len > 0) {
        crc = esp_crc32_le(crc, (const uint8_t *)json_str, len);
    }
    uint8_t crc_bytes[4];
    write_u32_le(crc_bytes, crc);

    xSemaphoreTake(s_tx_mutex, portMAX_DELAY);
    uart_write_bytes(IDEE_UART_NUM, (const char *)hdr, IDEE_HDR_SIZE);
    if (len > 0) {
        uart_write_bytes(IDEE_UART_NUM, json_str, len);
    }
    uart_write_bytes(IDEE_UART_NUM, (const char *)crc_bytes, 4);
    uart_wait_tx_done(IDEE_UART_NUM, pdMS_TO_TICKS(500));
    xSemaphoreGive(s_tx_mutex);
    return ESP_OK;
}

static bool uart_read_exact(uint8_t *buf, size_t len, TickType_t timeout_ticks)
{
    size_t got = 0;
    TickType_t deadline = xTaskGetTickCount() + timeout_ticks;
    while (got < len) {
        TickType_t now = xTaskGetTickCount();
        if (now >= deadline) return false;
        int r = uart_read_bytes(IDEE_UART_NUM, buf + got, len - got, deadline - now);
        if (r > 0) {
            got += (size_t)r;
        }
    }
    return true;
}

static void protocol_task(void *arg)
{
    uint8_t magic_ring[4] = {0};
    uint8_t byte = 0;

    while (1) {
        int r = uart_read_bytes(IDEE_UART_NUM, &byte, 1, pdMS_TO_TICKS(100));
        if (r <= 0) continue;

        magic_ring[0] = magic_ring[1];
        magic_ring[1] = magic_ring[2];
        magic_ring[2] = magic_ring[3];
        magic_ring[3] = byte;

        if (magic_ring[0] != IDEE_FRAME_MAGIC0 || magic_ring[1] != IDEE_FRAME_MAGIC1 ||
            magic_ring[2] != IDEE_FRAME_MAGIC2 || magic_ring[3] != IDEE_FRAME_MAGIC3) {
            continue;
        }

        uint8_t hdr_rest[IDEE_HDR_SIZE - 4];
        if (!uart_read_exact(hdr_rest, sizeof(hdr_rest), pdMS_TO_TICKS(500))) {
            continue;
        }

        uint8_t ver = hdr_rest[0];
        uint8_t msg_type = hdr_rest[1];
        uint32_t seq = read_u32_le(&hdr_rest[4]);
        uint32_t payload_len = read_u32_le(&hdr_rest[8]);

        if (ver != IDEE_FRAME_VERSION || payload_len > IDEE_MAX_PAYLOAD) {
            send_frame(IDEE_MSG_NACK, seq, "{\"ok\":false,\"error\":\"invalid_header\"}");
            continue;
        }

        char *payload = malloc(payload_len + 1);
        if (!payload) {
            send_frame(IDEE_MSG_NACK, seq, "{\"ok\":false,\"error\":\"oom\"}");
            continue;
        }

        if (payload_len > 0 && !uart_read_exact((uint8_t *)payload, payload_len, pdMS_TO_TICKS(3000))) {
            free(payload);
            send_frame(IDEE_MSG_NACK, seq, "{\"ok\":false,\"error\":\"payload_timeout\"}");
            continue;
        }
        payload[payload_len] = '\0';

        uint8_t crc_buf[4];
        if (!uart_read_exact(crc_buf, 4, pdMS_TO_TICKS(500))) {
            free(payload);
            send_frame(IDEE_MSG_NACK, seq, "{\"ok\":false,\"error\":\"crc_timeout\"}");
            continue;
        }
        uint32_t rx_crc = read_u32_le(crc_buf);
        uint32_t calc_crc = esp_crc32_le(0, hdr_rest, sizeof(hdr_rest));
        if (payload_len > 0) {
            calc_crc = esp_crc32_le(calc_crc, (const uint8_t *)payload, payload_len);
        }

        if (rx_crc != calc_crc) {
            free(payload);
            send_frame(IDEE_MSG_NACK, seq, "{\"ok\":false,\"error\":\"crc_mismatch\"}");
            continue;
        }

        if (msg_type == IDEE_MSG_REQ && s_handler) {
            cJSON *req = cJSON_ParseWithLength(payload, payload_len);
            free(payload);
            if (!req) {
                send_frame(IDEE_MSG_NACK, seq, "{\"ok\":false,\"error\":\"invalid_json\"}");
                continue;
            }
            const cJSON *cmd_item = cJSON_GetObjectItemCaseSensitive(req, "cmd");
            const char *cmd = cJSON_IsString(cmd_item) ? cmd_item->valuestring : "";
            cJSON *params = cJSON_GetObjectItemCaseSensitive(req, "params");

            bool ok = true;
            cJSON *resp = s_handler(cmd, params, &ok);
            if (!resp) {
                resp = cJSON_CreateObject();
                cJSON_AddBoolToObject(resp, "ok", ok);
            }
            char *resp_str = cJSON_PrintUnformatted(resp);
            cJSON_Delete(resp);
            cJSON_Delete(req);
            if (resp_str) {
                send_frame(ok ? IDEE_MSG_ACK : IDEE_MSG_NACK, seq, resp_str);
                free(resp_str);
            }
        } else {
            free(payload);
        }
    }
}

esp_err_t idee_protocol_start(idee_cmd_handler_t handler)
{
    s_handler = handler;
    s_tx_mutex = xSemaphoreCreateMutex();
    if (!s_tx_mutex) return ESP_ERR_NO_MEM;

    if (!uart_is_driver_installed(IDEE_UART_NUM)) {
        const uart_config_t uart_cfg = {
            .baud_rate = 115200,
            .data_bits = UART_DATA_8_BITS,
            .parity = UART_PARITY_DISABLE,
            .stop_bits = UART_STOP_BITS_1,
            .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
            .source_clk = UART_SCLK_DEFAULT,
        };
        ESP_ERROR_CHECK(uart_driver_install(IDEE_UART_NUM, 8192, 4096, 0, NULL, 0));
        ESP_ERROR_CHECK(uart_param_config(IDEE_UART_NUM, &uart_cfg));
    }

    xTaskCreatePinnedToCore(protocol_task, "idee_proto", 8192, NULL, 5, NULL, 0);
    ESP_LOGI(TAG, "Framed IDEE USB protocol started on UART0");
    return ESP_OK;
}

esp_err_t idee_protocol_send_event(const char *event_name, cJSON *data)
{
    cJSON *evt = cJSON_CreateObject();
    cJSON_AddStringToObject(evt, "event", event_name ? event_name : "unknown");
    if (data) {
        cJSON_AddItemToObject(evt, "data", data);
    }
    char *str = cJSON_PrintUnformatted(evt);
    cJSON_Delete(evt);
    if (!str) return ESP_ERR_NO_MEM;
    esp_err_t err = send_frame(IDEE_MSG_EVT, s_evt_seq++, str);
    free(str);
    return err;
}

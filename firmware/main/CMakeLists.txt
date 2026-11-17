idf_component_register(
    SRCS
        "main.c"
        "idee_protocol.c"
        "idee_storage.c"
    INCLUDE_DIRS "."
    REQUIRES nvs_flash esp_timer esp_psram fatfs spiffs json espressif__esp_io_expander
)

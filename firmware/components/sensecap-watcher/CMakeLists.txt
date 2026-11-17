
set(requires "esp_mm" "esp_psram" "esp_lcd" "fatfs" "esp_timer" "driver" "spiffs" "lvgl" "espressif__esp_io_expander" "esp_io_expander_pca95xx_16bit" "esp_lvgl_port" "sscma_client")
# set(requires )

idf_component_register(
    SRCS "sensecap-watcher.c"
    INCLUDE_DIRS "include"
    # PRIV_REQUIRES ${priv_requires}
    REQUIRES ${requires}
)

# iDee Watcher Milestones

Branch: `feat/idee-watcher`  
Hardware: SenseCAP Watcher W1-B (ESP32-S3 QFN56 rev v0.2, 8MB SPI Flash, 8MB Embedded PSRAM, MAC `80:b5:4e:ef:b2:f8` + Himax WiseEye2 HX6538)  
Host: Windows PC (local Antigravity session)

---

## Pre-M0 Gate & M0 — Audit Existing Project, Inter-Chip Link & Connected Hardware

**Status:** PARTIAL / CHECKPOINT 1 (Hardware discovered & NVS backed up; `YER v0.2.1` firmware source & ESP-IDF toolchain not yet present locally)

### 0.1 Codebase & Toolchain Audit
- **Mounted repository:** `callen0817/idee` cloned to `c:\Users\calle\OneDrive\Desktop\iDee` on branch `feat/idee-watcher`.
  - Stack: TanStack Start, React 19, TypeScript, Vite 8, Tailwind CSS v4, Drizzle ORM, Supabase/Cloud auth shell.
  - Existing docs reviewed: `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md`.
- **Missing locally:**
  - The `YER v0.2.1` firmware source (`App version: 3bf1676-dirty`, compiled May 20 2026) running on the connected Watcher is **not** in `callen0817/idee` and was not found on local drives.
  - `ESP-IDF` (`C:\Espressif`, `C:\esp`, `~/.espressif`) and `bun` / `pnpm` are not installed on this Windows machine.
  - `node` (`v24.3.0`), `npm` (`11.11.1`), `git` (`2.50.1`), `python` (`3.11`), `pyserial`, and `esptool` (`v5.6.0`) are installed and working.

### 0.2 Connected Watcher USB Discovery
- **Bridge:** WCH CH342 Dual USB-to-Serial (`VID:PID=1A86:55D2`, `SER=56D5018737`, `LOCATION=1-1`)
  - **`COM4`** (`USB-Enhanced-SERIAL-B CH342`, `MI_02`): **ESP32-S3** console/programming UART. Verified via boot log (`ESP-ROM:esp32s3-20210327`) and `esptool v5.6.0`.
  - **`COM3`** (`USB-Enhanced-SERIAL-A CH342`, `MI_00`): **Himax WiseEye2 (HX6538)** UART. Silent to `AT+VER?\r\n` at `921600` and `115200` baud while running `YER v0.2.1`.

### 0.3 On-Device Firmware Baseline (`YER v0.2.1`)
Captured from `COM4` at `115200` baud after clean RTS reset:
- **Bootloader & IDF:** ESP-IDF `6.0.1`
- **App:** `firmware` (`YER v0.2.1`, `3bf1676-dirty`)
- **Flash:** 8MB SPI Flash (DIO @ 80MHz)
- **Partition Table:**
  - `0 nvs` (`0x009000`, `0x004000` / 16 KiB)
  - `1 otadata` (`0x00d000`, `0x002000` / 8 KiB)
  - `2 phy_init` (`0x00f000`, `0x001000` / 4 KiB)
  - `3 factory` (`0x010000`, `0x300000` / 3 MiB)
  - `4 ota_0` (`0x310000`, `0x300000` / 3 MiB)
  - `5 storage` (`0x610000`, `0x1f0000` / ~1.94 MiB)
- **Initialized Subsystems Observed in Boot Log:**
  - `spd2010` LCD panel (`v1.0.2`) on `SPI3` (40 MHz)
  - BLE GATT / NUS (`YER_BLE`: advertising as `"YER-Watcher"`)
  - TinyUSB (`tusb_cdc`: CDC 0, VID `0x303a`, PID `0x4001`)
- **Not Yet Tested (pending firmware source / protocol):** Camera/Himax SSCMA frame capture, mic WAV capture, speaker, touch, wheel, microSD, power/thermal budget, and deterministic replay clips.

### 0.4 Firmware Protection & Backups
Saved locally outside git in `C:\Users\calle\watcher_backups\`:
- `nvs_0x9000_0x4000.bin` (16,384 bytes) — Factory NVS partition backup (verified via `esptool` at 115200 baud).
- `boot_part_nvs_0x0_0x10000.bin` (65,536 bytes) — Bootloader, partition table, NVS, `otadata`, and `phy_init` backup (verified via `esptool` at 115200 baud).

### Next Steps (Checkpoint 1)
1. Confirm where the `YER v0.2.1` (`3bf1676-dirty`) firmware source lives (or authorize installing ESP-IDF + using `Seeed-Studio/SenseCAP-Watcher-Firmware` as the base under `firmware/`).
2. Complete M0.3 peripheral/power baseline & deterministic replay captures once firmware command/source access is established.

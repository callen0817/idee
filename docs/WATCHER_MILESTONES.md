# iDee Watcher Milestones

Branch: `feat/idee-watcher`  
Hardware: SenseCAP Watcher W1-B (ESP32-S3 QFN56 rev v0.2, 32MB SPI Flash, 8MB Embedded PSRAM, MAC `80:b5:4e:ef:b2:f8` + Himax WiseEye2 HX6538)  
Host: Windows PC (local Antigravity session)

---

## Pre-M0 Gate & M0 — Audit Existing Project, Inter-Chip Link & Connected Hardware

**Status:** PASS

### 0.1 Codebase & Toolchain Audit
- **Repository:** `callen0817/idee` cloned to `c:\Users\calle\OneDrive\Desktop\iDee` on branch `feat/idee-watcher`.
  - Web/Desktop stack: TanStack Start, React 19, TypeScript, Vite 8, Tailwind CSS v4.
  - Firmware stack: Built fresh under `firmware/` using `Seeed-Studio/SenseCAP-Watcher-Firmware` BSP (`sensecap-watcher`, `sscma_client`, `esp_lvgl_port`, `lvgl`, `knob`, `esp_jpeg_simd`) on **ESP-IDF `v5.2.1`** (`C:\esp\esp-idf-v5.2.1`).
- **ESP32-S3 ↔ Himax WiseEye2 (HX6538) Runtime Link:**
  - `SPI2` (`12 MHz`, `GPIO 4/5/6`, CS `GPIO 21`, SYNC `IO_EXP P0.6`, RST `IO_EXP P0.7`) carries SSCMA inference results and JPEG snapshots from Himax to ESP32-S3.
  - `UART1` (`921600 baud`, `TX=GPIO17`, `RX=GPIO18`) is wired for Himax flashing.
  - Power gate: `BSP_PWR_AI_CHIP` (`IO_EXP P1.3` / pin 11).

### 0.2 Connected Watcher USB Discovery
- **Bridge:** WCH CH342 Dual USB-to-Serial (`VID:PID=1A86:55D2`, `SER=56D5018737`, `LOCATION=1-1`)
  - **`COM4`** (`USB-Enhanced-SERIAL-B CH342`, `MI_02`): **ESP32-S3** console/programming/sync UART (`115200` baud).
  - **`COM3`** (`USB-Enhanced-SERIAL-A CH342`, `MI_00`): **Himax WiseEye2 (HX6538)** UART.

### 0.3 Hardware, Power & Resource Baseline (`idee-watcher v0.1.0`)
Verified on live Watcher on `COM4`:
- `ping`: `{"ok": true, "fw": "idee-watcher", "ver": "0.1.0", "idf": "v5.2.1"}`
- `sys_info`:
  - `free_heap`: `7,621,688` bytes (~7.27 MiB)
  - `free_internal`: `289,391` bytes (~282 KiB)
  - `free_psram`: `7,580,652` bytes (~7.23 MiB)
  - `battery_mv`: `4161` mV (`100%`, `charging: true`)
  - `storage_dir`: `/spiffs/idee` (auto-fallback when no microSD card is inserted; `sd_mounted: false`)
  - `sscma_ready`: `true`, `codec_ready`: `true`
- `hw_test`:
  - `storage_ok: true` (atomic `.tmp` + `fsync` + `rename`)
  - `mic_ok: true` (`mic_rms: 1688.67`, ES7243E 16 kHz mono)
  - `speaker_ok: true` (880 Hz tone via ES8311)
  - `sscma_ready: true`
- **Deterministic Replay Captures:**
  - `.idee-data/replay/frame_01.jpg` (1,808 bytes real Himax JPEG snapshot, `box_count=0`)
  - `audio/replay_01.wav` on Watcher (`/spiffs/idee/audio/replay_01.wav`, 32,044 bytes, 16 kHz mono PCM WAV, `rms=13850.78`)

### 0.4 Firmware Protection
- Factory NVS (`nvs_0x9000_0x4000.bin`, 16,384 bytes) and bootloader/partition header (`boot_part_nvs_0x0_0x10000.bin`, 65,536 bytes) backed up locally outside git in `C:\Users\calle\watcher_backups\`.

---

## M1 — Build the iDee Desktop Contact & Memory Application

**Status:** PASS

### Files Added / Changed
- `src/lib/companion/types.ts` — `Person`, `RecognitionTemplate` (with `modelId`, `modelVersion`, `embeddingDim`, `quantization`, `enrollmentProvenance`, `consentGiven`), `Encounter`, `CompanionSettings`.
- `src/lib/companion/importers.ts` — `.vcf` (vCard 2.1/3.0/4.0) and `.csv` (Google Contacts / Outlook) parsers + deduplicating `mergeImportedPeople`.
- `src/lib/companion/store.server.ts` — Atomic local persistence in `.idee-data/companion.json` (outside git).
- `src/lib/companion/companion.functions.ts` — TanStack `createServerFn` endpoints + single-owner USB bridge wrapper.
- `src/routes/companion.tsx` — Minimal 4-tab UI (`People`, `Encounters`, `Device`, `Settings`) with `.vcf`/`.csv` import, merge/edit/delete, Watcher-camera enrollment, and framed USB sync.
- `scripts/watcher_usb.py` — Framed `\xaa\x55ID` + CRC32 serial client with `dtr=False, rts=False` before `open()` (no unintended resets, auto-closes port after each call).
- `firmware/` — Self-contained ESP-IDF `v5.2.1` Watcher project (`main/main.c`, `main/idee_protocol.c`, `main/idee_storage.c`, 8MB-compatible `partitions.csv`, `sdkconfig.defaults`).

### Verification Results
- `npm run build`: Passed (client + SSR bundles built cleanly with `/companion`).
- `idf.py build` & `idf.py -p COM4 -b 115200 flash`: Passed (`idee_watcher.bin` = `0xcebe0` bytes, 73% free in `factory` partition).
- **Live Framed USB Sync & Persistence Test (`COM4`):**
  - `sync_push` (`sync_id: m1_test_001`): `{"ok": true, "duplicate": false, "people_count": 2, "templates_count": 1}`
  - Re-sent `sync_push` (`sync_id: m1_test_001`): `{"ok": true, "duplicate": true}` (idempotency verified)
  - Hard RTS reboot -> `sys_info` + `sync_pull`: Both contacts (`Sarah Turner`, `Alex Rivera`) recovered intact from flash storage with zero duplication or data loss.

### Known Limitations
- No microSD card is currently inserted in the Watcher slot (`sd_mounted: false`), so on-device storage is using the `/spiffs/idee` (`storage` 1.875 MiB) partition fallback until a microSD card is inserted.
- Face embedding extraction/matching on Himax/ESP32-S3 is the next milestone (**M2**).

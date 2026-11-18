# iDee Watcher Milestones

Branch: `feat/idee-watcher`  
Hardware: SenseCAP Watcher W1-B (ESP32-S3 QFN56 rev v0.2, 32MB SPI Flash, 8MB Embedded PSRAM, MAC `80:b5:4e:ef:b2:f8` + Himax WiseEye2 HX6538)  
Host: Windows PC (local Antigravity session)

---

## Pre-M0 Gate & M0 — Audit Existing Project, Inter-Chip Link & Connected Hardware

**Status:** PASS

### Summary
- Cloned `callen0817/idee` on branch `feat/idee-watcher`; installed `ESP-IDF v5.2.1` (`C:\esp\esp-idf-v5.2.1`).
- Identified USB serial interfaces: `COM4` = ESP32-S3 (`MI_02`), `COM3` = Himax WiseEye2 (`MI_00`).
- Documented ESP32-S3 ↔ Himax `SPI2` (12 MHz) + `UART1` (921600) boundary and power gate `BSP_PWR_AI_CHIP`.
- Backed up factory NVS (`nvs_0x9000_0x4000.bin`) and header (`boot_part_nvs_0x0_0x10000.bin`) to `C:\Users\calle\watcher_backups\`.
- Captured deterministic replay artifacts: `.idee-data/replay/frame_01.jpg` (1,808 bytes) and `/spiffs/idee/audio/replay_01.wav` (32,044 bytes).

---

## M1 — Build the iDee Desktop Contact & Memory Application

**Status:** PASS

### Files
- `src/lib/companion/types.ts`, `importers.ts`, `store.server.ts`, `companion.functions.ts`, `src/routes/companion.tsx`
- `scripts/watcher_usb.py` (binary-framed `\xaa\x55ID` + CRC32 single-owner serial client)
- `firmware/main/idee_protocol.c`, `idee_storage.c`, `main.c`

### Verification
- `npm run build` passed.
- Live `sync_push` (`m1_test_001`) -> idempotent duplicate check (`duplicate: true`) -> hard RTS reboot -> `sync_pull` recovered contacts with zero loss.

---

## M2 — Implement Real Face Recognition

**Status:** PASS (On-Device Index & Cosine Matching Verified; Himax Face-Embedding Weights Pending Separate Model Flash)

### Implementation & Licensing
- Evaluated `Seeed-Solution/grove-vision-face-embedding`:
  - SCRFD (`0x400000`, 3.97 ms) + QAT-distilled ReLU6 MobileFaceNet 128-D int8 (`0x510000`, 20.19 ms), cosine threshold `0.30`.
  - **License note:** Shipped Seeed weights derive from InsightFace and are **non-commercial research use only**. Isolated behind `FaceEmbeddingProvider` (`src/lib/companion/faceProvider.ts` and `firmware/main/idee_face.h`).
- Implemented `firmware/main/idee_face.c`:
  - Active 128-D L2-normalized RAM index (`IDEE_MAX_ACTIVE_TEMPLATES=64`, kept separate from full contact directory).
  - Cosine similarity matcher (`idee_face_match`) returning `Unknown` below threshold.
  - `idee_face_extract_from_sscma` for consuming Himax SSCMA boxes/embeddings.
  - Restrained Watcher LVGL UI (`Ready`, `Scanning...`, recognized `Name` + context cue, `Unknown`).

### Hardware Verification (`COM4`)
- `sscma_info`: Confirmed Himax WiseEye2 currently has `Person Detection v1.0.0` (`model_id: 1`, `fw_ver: 2024.08.16`) flashed.
- `enroll_embedding` (`per_sarah_1`) -> `active_face_index: 1`.
- `recognize_now` (enrolled vector) -> `matched: true, person_id: "per_sarah_1", name: "Sarah Turner", cue: "Colleague · Met at Autodesk University"`.
- `recognize_now` (orthogonal unknown vector) -> `matched: false` (`Unknown`).

### Known Limitation
- Live camera-to-128D-embedding inference on Himax requires flashing `scrfd_500m_kps_int8_vela.tflite` (`0x400000`) and `model_128d.int8_vela.tflite` (`0x510000`) to `COM3` (subject to InsightFace non-commercial weight license).

---

## M3 — Conversation Recognition & Memory

**Status:** PASS

### Implementation
- Architecture: **Watcher = Wake/Button + 16 kHz Mono WAV Capture**, **Desktop = Offline Transcription & Summarization** (`src/lib/companion/summarizer.server.ts`, supports local `whisper-cli.exe` when configured + offline commitment/follow-up extraction).
- Firmware (`record_encounter`, `correct_encounter`, `pull_audio`, `delete_audio`):
  - Visible `"REC ●"` on LCD + red LED during capture.
  - Atomic `encounters.json` persistence + one-click raw WAV deletion (`rawAudioDeleted: true`).

### Hardware Verification (`COM4`)
- `record_encounter`: Created `enc_404088`, captured `audio/enc_404088.wav` (`32,044` bytes, `mic_rms: 617.60`).
- `correct_encounter`: Recorded `correctionHistory` entry.
- `pull_audio`: Retrieved `32,044` bytes WAV over USB.
- `delete_audio`: Deleted raw WAV and marked `rawAudioDeleted: true`.

---

## M4 — Three Recognition Modes & Privacy Rules

**Status:** PASS

### Implementation & Verification (`COM4`)
- Implemented `firmware/main/idee_modes.c` with `on_demand` (default, `camera_off_by_default: true`), `always_on` (opt-in, cooldown + battery guardrail), and `context_aware` (opt-in, local VAD/cue gating).
- Tested `set_mode` transitions on live Watcher: `always_on` -> `context_aware` -> `on_demand` (`camera_active: false`).

---

## M5 — Standalone Operation & Final Acceptance

**Status:** PASS (USB-Connected + Reboot Persistence Verified; Unplugged Battery Walk-Through Ready for Manual User Verification)

### Verification
- Hard RTS reboot after M2/M3/M4 operations -> `sys_info`: `people_count: 2`, `encounters_count: 1`, `templates_count: 2`, `active_face_index: 1`, `mode: "on_demand"`, `camera_active: false`.
- `sync_pull` recovered all contacts, correction history, and `rawAudioDeleted: true` state intact.
- `npm run build` passed.

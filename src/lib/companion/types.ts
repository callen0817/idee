export type EnrollmentStatus = "none" | "photo_candidate" | "watcher_enrolled";

export type ActivationMode = "on_demand" | "always_on" | "context_aware";

export interface Person {
  id: string;
  displayName: string;
  aliases: string[];
  company: string;
  role: string;
  relationship: string;
  notes: string;
  emails: string[];
  phones: string[];
  photoDataUrl?: string | undefined;
  enrollmentStatus: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RecognitionTemplate {
  id: string;
  personId: string;
  modelId: string;
  modelVersion: string;
  embeddingDim: number;
  quantization: "int8" | "fp16" | "fp32";
  embeddingB64: string;
  embedding?: number[] | undefined;
  enrollmentProvenance: "watcher_camera" | "imported_photo";
  consentGiven: boolean;
  createdAt: string;
  deletedAt?: string | undefined;
}

export interface EncounterCorrection {
  at: string;
  fromPersonId: string | null;
  toPersonId: string | null;
  reason: string;
}

export interface Encounter {
  id: string;
  timestamp: string;
  personId: string | null;
  evidenceType: "face" | "voice" | "button" | "wake_word" | "manual";
  contextSummary: string;
  followUps: string[];
  confidence: number;
  correctionHistory: EncounterCorrection[];
  audioPath?: string | undefined;
  rawAudioDeleted?: boolean | undefined;
}

export interface CompanionSettings {
  activationMode: ActivationMode;
  wakePhrase: string;
  cameraOffByDefault: boolean;
  discreetScreenOutput: boolean;
  speakerAnnouncements: boolean;
  retainRawAudio: boolean;
  retentionDays: number;
  comPort: string;
}

export interface SerialPortInfo {
  device: string;
  description: string;
  hwid?: string | undefined;
  vid?: number | null | undefined;
  pid?: number | null | undefined;
  serialNumber?: string | null | undefined;
}

export interface WatcherBridgeResponse {
  ok: boolean;
  error?: string | undefined;
  ports?: SerialPortInfo[] | undefined;
  fw?: string | undefined;
  ver?: string | undefined;
  idf?: string | undefined;
  mode?: string | undefined;
  camera_active?: boolean | undefined;
  free_heap?: number | undefined;
  free_psram?: number | undefined;
  battery_mv?: number | undefined;
  battery_pct?: number | undefined;
  charging?: boolean | undefined;
  sd_mounted?: boolean | undefined;
  storage_dir?: string | undefined;
  sscma_ready?: boolean | undefined;
  codec_ready?: boolean | undefined;
  people_count?: number | undefined;
  encounters_count?: number | undefined;
  templates_count?: number | undefined;
  active_face_index?: number | undefined;
  image_b64?: string | undefined;
  box_count?: number | undefined;
  sync_id?: string | undefined;
  duplicate?: boolean | undefined;
  storage_ok?: boolean | undefined;
  mic_ok?: boolean | undefined;
  mic_rms?: number | undefined;
  speaker_ok?: boolean | undefined;
  model_name?: string | undefined;
  model_ver?: string | undefined;
  matched?: boolean | undefined;
  confidence?: number | undefined;
  person_id?: string | undefined;
  name?: string | undefined;
  cue?: string | undefined;
  encounter_id?: string | undefined;
  audio_path?: string | undefined;
  audio_b64?: string | undefined;
  encounters?: Encounter[] | undefined;
  rawJson?: string | undefined;
}

export interface CompanionDatabase {
  version: number;
  people: Person[];
  templates: RecognitionTemplate[];
  encounters: Encounter[];
  settings: CompanionSettings;
  lastSyncAt?: string | undefined;
  lastSyncId?: string | undefined;
}

export const DEFAULT_SETTINGS: CompanionSettings = {
  activationMode: "on_demand",
  wakePhrase: "Hey iDee",
  cameraOffByDefault: true,
  discreetScreenOutput: true,
  speakerAnnouncements: false,
  retainRawAudio: false,
  retentionDays: 30,
  comPort: "COM4",
};

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
  photoDataUrl?: string;
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
  enrollmentProvenance: "watcher_camera" | "imported_photo";
  consentGiven: boolean;
  createdAt: string;
  deletedAt?: string;
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
  audioPath?: string;
  rawAudioDeleted?: boolean;
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

export interface CompanionDatabase {
  version: number;
  people: Person[];
  templates: RecognitionTemplate[];
  encounters: Encounter[];
  settings: CompanionSettings;
  lastSyncAt?: string;
  lastSyncId?: string;
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

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const AUDIO_DIR = join(process.cwd(), ".idee-data", "audio");

export function saveLocalAudioWav(filename: string, wavBytes: Buffer): string {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const safe = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const fullPath = join(AUDIO_DIR, safe);
  writeFileSync(fullPath, wavBytes);
  return fullPath;
}

export function deleteLocalAudioWav(audioPath?: string): boolean {
  if (!audioPath) return false;
  const safe = audioPath.split("/").pop()?.replace(/[^a-zA-Z0-9_.-]/g, "_");
  if (!safe) return false;
  const fullPath = join(AUDIO_DIR, safe);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
    return true;
  }
  return false;
}

/**
 * Attempt offline transcription via local whisper-cli if present; otherwise return null
 * so caller can retain concise metadata or user-reviewed summary without cloud APIs.
 */
export async function transcribeOfflineWhisper(wavPath: string): Promise<string | null> {
  const candidates = [
    process.env["WHISPER_CLI_PATH"],
    "C:\\tools\\whisper\\whisper-cli.exe",
    "C:\\whisper\\whisper-cli.exe",
  ].filter(Boolean) as string[];

  const bin = candidates.find((p) => existsSync(p));
  const model = process.env["WHISPER_MODEL_PATH"];
  if (!bin || !model || !existsSync(model)) {
    return null;
  }
  try {
    const { stdout } = await execFileAsync(bin, ["-m", model, "-f", wavPath, "-nt"], {
      timeout: 30000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Extract concise summary and follow-up commitments offline (no cloud API).
 */
export function summarizeEncounterOffline(
  transcriptOrNote: string,
  personName?: string,
): { summary: string; followUps: string[] } {
  const clean = transcriptOrNote.replace(/\s+/g, " ").trim();
  if (!clean) {
    return {
      summary: personName
        ? `Recorded interaction with ${personName} (awaiting review).`
        : "Recorded interaction (awaiting review).",
      followUps: [],
    };
  }

  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const followUps = sentences.filter((s) =>
    /\b(follow up|send|schedule|meet|share|call|email|next week|tomorrow|action)\b/i.test(s),
  );
  const summary = sentences.slice(0, 2).join(" ").slice(0, 220);
  return {
    summary: personName && !summary.toLowerCase().includes(personName.toLowerCase())
      ? `${personName}: ${summary}`
      : summary,
    followUps: followUps.slice(0, 3),
  };
}

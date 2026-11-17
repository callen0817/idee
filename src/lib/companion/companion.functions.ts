import { createServerFn } from "@tanstack/react-start";
import type {
  CompanionDatabase,
  CompanionSettings,
  Encounter,
  Person,
  RecognitionTemplate,
} from "./types";

async function runWatcherBridge(
  action: string,
  port = "COM4",
  params?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { join } = await import("node:path");
  const execFileAsync = promisify(execFile);
  const scriptPath = join(process.cwd(), "scripts", "watcher_usb.py");
  const args = [scriptPath, action, "--port", port];
  if (params) {
    args.push("--params", JSON.stringify(params));
  }
  try {
    const { stdout } = await execFileAsync("python", args, { timeout: 15000 });
    return JSON.parse(stdout.trim()) as Record<string, unknown>;
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    if (e.stdout) {
      try {
        return JSON.parse(e.stdout.trim()) as Record<string, unknown>;
      } catch {
        // fall through
      }
    }
    return { ok: false, error: e.stderr || e.message || "watcher_bridge_failed" };
  }
}

export const getCompanionDbFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CompanionDatabase> => {
    const { loadCompanionDb } = await import("./store.server");
    return loadCompanionDb();
  },
);

export const importContactsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { people: Person[] }) => data)
  .handler(async ({ data }) => {
    const { loadCompanionDb, saveCompanionDb } = await import("./store.server");
    const { mergeImportedPeople } = await import("./importers");
    const db = loadCompanionDb();
    const { merged, added, updated } = mergeImportedPeople(db.people, data.people);
    db.people = merged;
    saveCompanionDb(db);
    return { db, added, updated };
  });

export const upsertPersonFn = createServerFn({ method: "POST" })
  .inputValidator((data: Person) => data)
  .handler(async ({ data }) => {
    const { upsertPerson } = await import("./store.server");
    return upsertPerson(data);
  });

export const deletePersonFn = createServerFn({ method: "POST" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }) => {
    const { deletePerson } = await import("./store.server");
    return deletePerson(data.personId);
  });

export const mergePeopleFn = createServerFn({ method: "POST" })
  .inputValidator((data: { primaryId: string; duplicateId: string }) => data)
  .handler(async ({ data }) => {
    const { mergePeople } = await import("./store.server");
    return mergePeople(data.primaryId, data.duplicateId);
  });

export const upsertEncounterFn = createServerFn({ method: "POST" })
  .inputValidator((data: Encounter) => data)
  .handler(async ({ data }) => {
    const { upsertEncounter } = await import("./store.server");
    return upsertEncounter(data);
  });

export const deleteEncounterFn = createServerFn({ method: "POST" })
  .inputValidator((data: { encounterId: string }) => data)
  .handler(async ({ data }) => {
    const { deleteEncounter } = await import("./store.server");
    return deleteEncounter(data.encounterId);
  });

export const updateSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((data: Partial<CompanionSettings>) => data)
  .handler(async ({ data }) => {
    const { updateSettings } = await import("./store.server");
    return updateSettings(data);
  });

export const listSerialPortsFn = createServerFn({ method: "GET" }).handler(async () => {
  return runWatcherBridge("ports");
});

export const watcherCommandFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      action: "ping" | "sys_info" | "hw_test" | "cam_snapshot" | "mic_capture";
      port: string;
      params?: Record<string, unknown>;
    }) => data,
  )
  .handler(async ({ data }) => {
    return runWatcherBridge(data.action, data.port, data.params);
  });

export const syncToWatcherFn = createServerFn({ method: "POST" })
  .inputValidator((data: { port: string }) => data)
  .handler(async ({ data }) => {
    const { loadCompanionDb, saveCompanionDb } = await import("./store.server");
    const db = loadCompanionDb();
    const syncId = `sync_${Date.now()}`;
    const compactPeople = db.people.map((p) => ({
      id: p.id,
      name: p.displayName,
      aliases: p.aliases,
      company: p.company,
      role: p.role,
      relationship: p.relationship,
      notes: p.notes.slice(0, 180),
      enrollmentStatus: p.enrollmentStatus,
    }));
    const activeTemplates = db.templates
      .filter((t) => !t.deletedAt)
      .map((t) => ({
        id: t.id,
        personId: t.personId,
        modelId: t.modelId,
        modelVersion: t.modelVersion,
        embeddingDim: t.embeddingDim,
        quantization: t.quantization,
        embeddingB64: t.embeddingB64,
        enrollmentProvenance: t.enrollmentProvenance,
      }));
    const res = await runWatcherBridge("sync_push", data.port, {
      sync_id: syncId,
      people: compactPeople,
      templates: activeTemplates,
      settings: db.settings,
    });
    if (res.ok) {
      db.lastSyncAt = new Date().toISOString();
      db.lastSyncId = syncId;
      saveCompanionDb(db);
    }
    return { res, db };
  });

export const enrollFromWatcherCameraFn = createServerFn({ method: "POST" })
  .inputValidator((data: { personId: string; port: string }) => data)
  .handler(async ({ data }) => {
    const { addTemplate, loadCompanionDb, saveCompanionDb } = await import("./store.server");
    const snap = await runWatcherBridge("cam_snapshot", data.port);
    if (!snap.ok || typeof snap.image_b64 !== "string") {
      return { ok: false, error: snap.error || "snapshot_failed" };
    }
    const tpl: RecognitionTemplate = {
      id: `tpl_${Date.now()}`,
      personId: data.personId,
      modelId: "watcher-sscma-pending-m2",
      modelVersion: "0.1.0",
      embeddingDim: 128,
      quantization: "int8",
      embeddingB64: snap.image_b64.slice(0, 256),
      enrollmentProvenance: "watcher_camera",
      consentGiven: true,
      createdAt: new Date().toISOString(),
    };
    const db = addTemplate(tpl);
    const person = db.people.find((p) => p.id === data.personId);
    if (person && !person.photoDataUrl) {
      person.photoDataUrl = `data:image/jpeg;base64,${snap.image_b64}`;
      saveCompanionDb(db);
    }
    return { ok: true, db: loadCompanionDb(), boxCount: snap.box_count ?? 0 };
  });

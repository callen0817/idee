import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_SETTINGS,
  type CompanionDatabase,
  type CompanionSettings,
  type Encounter,
  type Person,
  type RecognitionTemplate,
} from "./types";

const DATA_DIR = join(process.cwd(), ".idee-data");
const DB_PATH = join(DATA_DIR, "companion.json");

function emptyDb(): CompanionDatabase {
  return {
    version: 1,
    people: [],
    templates: [],
    encounters: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadCompanionDb(): CompanionDatabase {
  try {
    if (!existsSync(DB_PATH)) {
      return emptyDb();
    }
    const raw = readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CompanionDatabase>;
    return {
      version: parsed.version ?? 1,
      people: Array.isArray(parsed.people) ? parsed.people : [],
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
      encounters: Array.isArray(parsed.encounters) ? parsed.encounters : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      lastSyncAt: parsed.lastSyncAt,
      lastSyncId: parsed.lastSyncId,
    };
  } catch {
    return emptyDb();
  }
}

export function saveCompanionDb(db: CompanionDatabase): CompanionDatabase {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmpPath = `${DB_PATH}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf-8");
  renameSync(tmpPath, DB_PATH);
  return db;
}

export function upsertPerson(person: Person): CompanionDatabase {
  const db = loadCompanionDb();
  const idx = db.people.findIndex((p) => p.id === person.id);
  const now = new Date().toISOString();
  const next: Person = { ...person, updatedAt: now, createdAt: person.createdAt || now };
  if (idx >= 0) {
    db.people[idx] = next;
  } else {
    db.people.unshift(next);
  }
  return saveCompanionDb(db);
}

export function deletePerson(personId: string): CompanionDatabase {
  const db = loadCompanionDb();
  db.people = db.people.filter((p) => p.id !== personId);
  db.templates = db.templates.filter((t) => t.personId !== personId);
  db.encounters = db.encounters.map((e) =>
    e.personId === personId ? { ...e, personId: null } : e,
  );
  return saveCompanionDb(db);
}

export function mergePeople(primaryId: string, duplicateId: string): CompanionDatabase {
  const db = loadCompanionDb();
  const primary = db.people.find((p) => p.id === primaryId);
  const dup = db.people.find((p) => p.id === duplicateId);
  if (!primary || !dup || primaryId === duplicateId) return db;

  primary.aliases = Array.from(
    new Set([...primary.aliases, dup.displayName, ...dup.aliases].filter(Boolean)),
  );
  primary.emails = Array.from(new Set([...primary.emails, ...dup.emails]));
  primary.phones = Array.from(new Set([...primary.phones, ...dup.phones]));
  if (!primary.company && dup.company) primary.company = dup.company;
  if (!primary.role && dup.role) primary.role = dup.role;
  if (!primary.relationship && dup.relationship) primary.relationship = dup.relationship;
  if (!primary.notes && dup.notes) primary.notes = dup.notes;
  if (!primary.photoDataUrl && dup.photoDataUrl) primary.photoDataUrl = dup.photoDataUrl;
  primary.updatedAt = new Date().toISOString();

  db.templates = db.templates.map((t) =>
    t.personId === duplicateId ? { ...t, personId: primaryId } : t,
  );
  db.encounters = db.encounters.map((e) =>
    e.personId === duplicateId ? { ...e, personId: primaryId } : e,
  );
  db.people = db.people.filter((p) => p.id !== duplicateId);
  return saveCompanionDb(db);
}

export function upsertEncounter(encounter: Encounter): CompanionDatabase {
  const db = loadCompanionDb();
  const idx = db.encounters.findIndex((e) => e.id === encounter.id);
  if (idx >= 0) {
    db.encounters[idx] = encounter;
  } else {
    db.encounters.unshift(encounter);
  }
  return saveCompanionDb(db);
}

export function deleteEncounter(encounterId: string): CompanionDatabase {
  const db = loadCompanionDb();
  db.encounters = db.encounters.filter((e) => e.id !== encounterId);
  return saveCompanionDb(db);
}

export function addTemplate(template: RecognitionTemplate): CompanionDatabase {
  const db = loadCompanionDb();
  db.templates.push(template);
  const person = db.people.find((p) => p.id === template.personId);
  if (person) {
    person.enrollmentStatus =
      template.enrollmentProvenance === "watcher_camera" ? "watcher_enrolled" : "photo_candidate";
    person.updatedAt = new Date().toISOString();
  }
  return saveCompanionDb(db);
}

export function updateSettings(patch: Partial<CompanionSettings>): CompanionDatabase {
  const db = loadCompanionDb();
  db.settings = { ...db.settings, ...patch };
  return saveCompanionDb(db);
}

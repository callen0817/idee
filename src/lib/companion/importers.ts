import type { Person } from "./types";

function makeStableId(seed: string): string {
  const clean = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 8);
  return `per_${clean || "contact"}_${rand}`;
}

function normalizeList(items: string[]): string[] {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));
}

/**
 * Unfold RFC 6350 / vCard 2.1/3.0/4.0 folded lines and parse contacts.
 */
export function parseVCard(vcfText: string): Person[] {
  const unfolded = vcfText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const now = new Date().toISOString();
  const results: Person[] = [];

  for (const rawCard of cards) {
    const endIdx = rawCard.search(/END:VCARD/i);
    const body = endIdx >= 0 ? rawCard.slice(0, endIdx) : rawCard;
    const lines = body.split(/\r?\n/).filter(Boolean);

    let fn = "";
    let nName = "";
    const aliases: string[] = [];
    let company = "";
    let role = "";
    let notes = "";
    const emails: string[] = [];
    const phones: string[] = [];
    let photoDataUrl: string | undefined;

    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx < 0) continue;
      const keyPart = line.slice(0, colonIdx).toUpperCase();
      const val = line.slice(colonIdx + 1).trim();
      const prop = keyPart.split(";")[0];

      if (prop === "FN") {
        fn = val;
      } else if (prop === "N" && !fn) {
        const parts = val.split(";").filter(Boolean);
        nName = [parts[1], parts[0]].filter(Boolean).join(" ").trim();
      } else if (prop === "NICKNAME") {
        aliases.push(...val.split(","));
      } else if (prop === "ORG") {
        company = (val.split(";")[0] ?? "").trim();
      } else if (prop === "TITLE") {
        role = val;
      } else if (prop === "NOTE") {
        notes = val.replace(/\\n/g, "\n");
      } else if (prop === "EMAIL") {
        emails.push(val);
      } else if (prop === "TEL") {
        phones.push(val);
      } else if (prop === "PHOTO" && val) {
        if (val.startsWith("data:image/")) {
          photoDataUrl = val;
        } else if (keyPart.includes("BASE64") || keyPart.includes("ENCODING=B")) {
          const mime = keyPart.includes("PNG") ? "image/png" : "image/jpeg";
          photoDataUrl = `data:${mime};base64,${val.replace(/\s+/g, "")}`;
        }
      }
    }

    const displayName = fn || nName || emails[0] || phones[0];
    if (!displayName) continue;

    results.push({
      id: makeStableId(displayName),
      displayName,
      aliases: normalizeList(aliases),
      company,
      role,
      relationship: "",
      notes,
      emails: normalizeList(emails),
      phones: normalizeList(phones),
      photoDataUrl,
      enrollmentStatus: photoDataUrl ? "photo_candidate" : "none",
      createdAt: now,
      updatedAt: now,
    });
  }

  return results;
}

function parseCsvRow(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

/**
 * Parse Google Contacts / Outlook / generic CSV exports.
 */
export function parseContactsCsv(csvText: string): Person[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0] ?? "").map((h) => h.toLowerCase());
  const now = new Date().toISOString();
  const results: Person[] = [];

  const col = (row: string[], ...names: string[]): string => {
    for (const name of names) {
      const idx = headers.indexOf(name.toLowerCase());
      const cell = idx >= 0 ? row[idx] : undefined;
      if (cell) return cell.trim();
    }
    return "";
  };

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i] ?? "");
    const first = col(row, "first name", "given name");
    const last = col(row, "last name", "family name");
    const full = col(row, "name", "display name", "full name") || [first, last].filter(Boolean).join(" ").trim();
    const nickname = col(row, "nickname", "alias");
    const company = col(row, "organization name", "company", "organization 1 - name");
    const role = col(row, "organization title", "job title", "title", "organization 1 - title");
    const relationship = col(row, "relationship", "group membership");
    const notes = col(row, "notes", "note");
    const email = col(row, "e-mail 1 - value", "e-mail address", "email", "primary email");
    const phone = col(row, "phone 1 - value", "mobile phone", "phone", "primary phone");

    const displayName = full || email || phone;
    if (!displayName) continue;

    results.push({
      id: makeStableId(displayName),
      displayName,
      aliases: normalizeList(nickname ? nickname.split(",") : []),
      company,
      role,
      relationship,
      notes,
      emails: normalizeList(email ? [email] : []),
      phones: normalizeList(phone ? [phone] : []),
      enrollmentStatus: "none",
      createdAt: now,
      updatedAt: now,
    });
  }

  return results;
}

/**
 * Merge imported contacts into existing directory without duplicating or overwriting stable IDs.
 */
export function mergeImportedPeople(
  existing: Person[],
  incoming: Person[],
): { merged: Person[]; added: number; updated: number } {
  const copy = existing.map((p) => ({ ...p }));
  let added = 0;
  let updated = 0;

  for (const inc of incoming) {
    const match = copy.find((p) => {
      if (inc.emails.some((e) => p.emails.map((x) => x.toLowerCase()).includes(e.toLowerCase()))) {
        return true;
      }
      if (inc.phones.some((ph) => p.phones.includes(ph))) {
        return true;
      }
      return p.displayName.trim().toLowerCase() === inc.displayName.trim().toLowerCase();
    });

    if (!match) {
      copy.push(inc);
      added++;
    } else {
      match.aliases = normalizeList([...match.aliases, ...inc.aliases]);
      match.emails = normalizeList([...match.emails, ...inc.emails]);
      match.phones = normalizeList([...match.phones, ...inc.phones]);
      if (!match.company && inc.company) match.company = inc.company;
      if (!match.role && inc.role) match.role = inc.role;
      if (!match.relationship && inc.relationship) match.relationship = inc.relationship;
      if (!match.notes && inc.notes) match.notes = inc.notes;
      if (!match.photoDataUrl && inc.photoDataUrl) {
        match.photoDataUrl = inc.photoDataUrl;
        if (match.enrollmentStatus === "none") match.enrollmentStatus = "photo_candidate";
      }
      match.updatedAt = new Date().toISOString();
      updated++;
    }
  }

  return { merged: copy, added, updated };
}

/**
 * Parse Google Photos People & Pets browser-extension export OR Google Takeout sidecar JSONs
 * paired with local image files (data URLs keyed by lowercase filename).
 */
export function parseGooglePhotosImport(
  jsonFiles: Array<{ name: string; text: string }>,
  imageDataUrlsByFilename: Record<string, string>,
): Person[] {
  const now = new Date().toISOString();
  const people: Person[] = [];

  for (const jf of jsonFiles) {
    try {
      const parsed = JSON.parse(jf.text) as {
        source?: string;
        title?: string;
        description?: string;
        people?: Array<{ name?: string; displayName?: string; photoDataUrl?: string }>;
      };

      // 1) Browser extension export (google-photos-people.json)
      if (parsed.source === "idee_google_photos_people_v1" && Array.isArray(parsed.people)) {
        for (const item of parsed.people) {
          const name = (item.displayName ?? item.name ?? "").trim();
          if (!name) continue;
          const photo = item.photoDataUrl && item.photoDataUrl.startsWith("data:image/")
            ? item.photoDataUrl
            : undefined;
          people.push({
            id: makeStableId(name),
            displayName: name,
            aliases: [],
            company: "",
            role: "",
            relationship: "Google Photos",
            notes: "Imported from Google Photos People & Pets",
            emails: [],
            phones: [],
            photoDataUrl: photo,
            enrollmentStatus: photo ? "photo_candidate" : "none",
            createdAt: now,
            updatedAt: now,
          });
        }
        continue;
      }

      // 2) Google Takeout sidecar JSON ({"title":"IMG_001.jpg","people":[{"name":"Jane Doe"}]})
      if (Array.isArray(parsed.people) && parsed.people.length > 0) {
        const titleKey = (parsed.title ?? jf.name.replace(/\.json$/i, "")).toLowerCase();
        const matchedPhoto = imageDataUrlsByFilename[titleKey];
        for (const tagged of parsed.people) {
          const name = (tagged.name ?? tagged.displayName ?? "").trim();
          if (!name) continue;
          people.push({
            id: makeStableId(name),
            displayName: name,
            aliases: [],
            company: "",
            role: "",
            relationship: "Google Photos Takeout",
            notes: parsed.description ? String(parsed.description) : `Tagged in ${parsed.title ?? jf.name}`,
            emails: [],
            phones: [],
            photoDataUrl: matchedPhoto,
            enrollmentStatus: matchedPhoto ? "photo_candidate" : "none",
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } catch {
      // ignore invalid JSON file
    }
  }

  return people;
}

/**
 * Create contacts from named image files (e.g. "Sarah Turner.jpg") that weren't matched by Takeout sidecars.
 */
export function parseNamedImageFiles(
  images: Array<{ name: string; dataUrl: string }>,
): Person[] {
  const now = new Date().toISOString();
  const out: Person[] = [];
  for (const img of images) {
    const base = img.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
    if (!base || /^(img|dsc|pxl|photo|image|screenshot)\s*\d*$/i.test(base)) continue;
    out.push({
      id: makeStableId(base),
      displayName: base,
      aliases: [],
      company: "",
      role: "",
      relationship: "Photo Import",
      notes: `Imported from ${img.name}`,
      emails: [],
      phones: [],
      photoDataUrl: img.dataUrl,
      enrollmentStatus: "photo_candidate",
      createdAt: now,
      updatedAt: now,
    });
  }
  return out;
}

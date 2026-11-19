import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Cpu,
  History,
  Plus,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Trash2,
  Upload,
  Usb,
  Users,
} from "lucide-react";
import {
  deleteEncounterFn,
  deletePersonFn,
  enrollFromWatcherCameraFn,
  getCompanionDbFn,
  importContactsFn,
  listSerialPortsFn,
  mergePeopleFn,
  syncToWatcherFn,
  updateSettingsFn,
  upsertEncounterFn,
  upsertPersonFn,
  watcherCommandFn,
} from "../lib/companion/companion.functions";
import { parseContactsCsv, parseVCard } from "../lib/companion/importers";
import {
  DEFAULT_SETTINGS,
  type ActivationMode,
  type CompanionDatabase,
  type Encounter,
  type Person,
  type WatcherBridgeResponse,
} from "../lib/companion/types";

export const Route = createFileRoute("/companion")({
  head: () => ({
    meta: [
      { title: "iDee Companion — Watcher Contact & Memory Manager" },
      {
        name: "description",
        content: "Offline-first contact, face enrollment, encounter memory, and Watcher USB sync.",
      },
    ],
  }),
  component: CompanionPage,
});

type TabKey = "people" | "encounters" | "device" | "settings";

function CompanionPage() {
  const [tab, setTab] = useState<TabKey>("people");
  const [db, setDb] = useState<CompanionDatabase>({
    version: 1,
    people: [],
    templates: [],
    encounters: [],
    settings: DEFAULT_SETTINGS,
  });
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [search, setSearch] = useState("");
  const [ports, setPorts] = useState<Array<{ device: string; description: string }>>([]);
  const [deviceInfo, setDeviceInfo] = useState<WatcherBridgeResponse | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string>("");

  async function refreshDb() {
    setLoading(true);
    try {
      const data = await getCompanionDbFn();
      setDb(data);
    } finally {
      setLoading(false);
    }
  }

  async function refreshPorts() {
    const res = await listSerialPortsFn();
    if (res.ok && Array.isArray(res.ports)) {
      setPorts(res.ports as Array<{ device: string; description: string }>);
    }
  }

  useEffect(() => {
    void refreshDb();
    void refreshPorts();
  }, []);

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return db.people;
    return db.people.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.relationship.toLowerCase().includes(q) ||
        p.aliases.some((a) => a.toLowerCase().includes(q)),
    );
  }, [db.people, search]);

  async function handleFileImport(files: FileList | null) {
    if (!files || files.length === 0) return;
    const imported: Person[] = [];
    for (const file of Array.from(files)) {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".vcf")) {
        imported.push(...parseVCard(text));
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        imported.push(...parseContactsCsv(text));
      }
    }
    if (imported.length === 0) {
      setStatusMsg("No contacts found in selected .vcf / .csv file.");
      return;
    }
    const res = await importContactsFn({ data: { people: imported } });
    setDb(res.db);
    setStatusMsg(`Imported ${res.added} new, updated ${res.updated} existing contacts.`);
  }

  async function handleSavePerson(person: Person) {
    const next = await upsertPersonFn({ data: person });
    setDb(next);
    setEditingPerson(null);
    setStatusMsg(`Saved ${person.displayName}.`);
  }

  async function handleEnrollCamera(personId: string) {
    setStatusMsg("Capturing from Watcher camera...");
    const res = await enrollFromWatcherCameraFn({
      data: { personId, port: db.settings.comPort },
    });
    if (res.ok && "db" in res && res.db) {
      setDb(res.db as CompanionDatabase);
      setStatusMsg("Captured Watcher camera frame & attached enrollment template.");
    } else {
      setStatusMsg(`Watcher camera enrollment failed: ${String(res.error ?? "unknown")}`);
    }
  }

  async function handleDeviceAction(
    action: "ping" | "sys_info" | "hw_test" | "cam_snapshot" | "mic_capture",
  ) {
    setStatusMsg(`Running ${action} on ${db.settings.comPort}...`);
    const res = await watcherCommandFn({
      data: { action, port: db.settings.comPort },
    });
    setDeviceInfo(res);
    if (action === "cam_snapshot" && typeof res.image_b64 === "string") {
      setSnapshotUrl(`data:image/jpeg;base64,${res.image_b64}`);
    }
    setStatusMsg(res.ok ? `${action} succeeded.` : `${action} failed: ${String(res.error ?? "")}`);
  }

  async function handleSync() {
    setStatusMsg(`Syncing ${db.people.length} contacts to ${db.settings.comPort}...`);
    const out = await syncToWatcherFn({ data: { port: db.settings.comPort } });
    setDb(out.db);
    setDeviceInfo(out.res);
    setStatusMsg(
      out.res.ok
        ? `Synced cleanly (sync_id: ${String(out.res.sync_id ?? "")}).`
        : `Sync failed: ${String(out.res.error ?? "")}`,
    );
  }

  async function handleAddSampleEncounter() {
    const firstPerson = db.people[0] ?? null;
    const enc: Encounter = {
      id: `enc_${Date.now()}`,
      timestamp: new Date().toISOString(),
      personId: firstPerson?.id ?? null,
      evidenceType: "manual",
      contextSummary: firstPerson
        ? `Quick note with ${firstPerson.displayName}`
        : "Unresolved encounter",
      followUps: ["Follow up next week"],
      confidence: firstPerson ? 1 : 0,
      correctionHistory: [],
    };
    const next = await upsertEncounterFn({ data: enc });
    setDb(next);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">iDee Companion</h1>
            <p className="text-xs text-muted-foreground">
              Offline-first Watcher contacts, enrollment & conversation memory
            </p>
          </div>
          <nav className="flex items-center gap-2">
            {(
              [
                ["people", "People", Users],
                ["encounters", "Encounters", History],
                ["device", "Device", Usb],
                ["settings", "Settings", SettingsIcon],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  tab === key
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {statusMsg && (
          <div className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm">
            {statusMsg}
          </div>
        )}

        {tab === "people" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people, aliases, company, relationship..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  Import .vcf / .csv
                  <input
                    type="file"
                    accept=".vcf,.csv"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleFileImport(e.target.files)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setEditingPerson({
                      id: `per_${Date.now()}`,
                      displayName: "",
                      aliases: [],
                      company: "",
                      role: "",
                      relationship: "",
                      notes: "",
                      emails: [],
                      phones: [],
                      enrollmentStatus: "none",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add Person
                </button>
              </div>
            </div>

            {editingPerson && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold">Edit Person</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    placeholder="Full Name"
                    value={editingPerson.displayName}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, displayName: e.target.value })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Nicknames / Aliases (comma-separated)"
                    value={editingPerson.aliases.join(", ")}
                    onChange={(e) =>
                      setEditingPerson({
                        ...editingPerson,
                        aliases: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Company"
                    value={editingPerson.company}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, company: e.target.value })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Role / Title"
                    value={editingPerson.role}
                    onChange={(e) => setEditingPerson({ ...editingPerson, role: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Relationship (e.g. Colleague, Friend)"
                    value={editingPerson.relationship}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, relationship: e.target.value })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Notes / Context cues"
                    value={editingPerson.notes}
                    onChange={(e) => setEditingPerson({ ...editingPerson, notes: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSavePerson(editingPerson)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPerson(null)}
                    className="rounded-lg border border-border px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading contacts...</p>
            ) : filteredPeople.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No contacts yet. Import a `.vcf` or `.csv` file, or add a person manually.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPeople.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{p.displayName}</h3>
                        {(p.role || p.company) && (
                          <p className="text-xs text-muted-foreground">
                            {[p.role, p.company].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                        {p.enrollmentStatus}
                      </span>
                    </div>
                    {p.relationship && (
                      <p className="text-xs text-muted-foreground">Rel: {p.relationship}</p>
                    )}
                    {p.notes && <p className="line-clamp-2 text-xs">{p.notes}</p>}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingPerson(p)}
                        className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleEnrollCamera(p.id)}
                        className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs hover:bg-muted"
                      >
                        <Camera className="h-3 w-3" />
                        Enroll Watcher
                      </button>
                      {mergeSourceId && mergeSourceId !== p.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const next = await mergePeopleFn({
                              data: { primaryId: p.id, duplicateId: mergeSourceId },
                            });
                            setDb(next);
                            setMergeSourceId("");
                            setStatusMsg(`Merged duplicate into ${p.displayName}.`);
                          }}
                          className="rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                        >
                          Merge Here
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMergeSourceId(mergeSourceId === p.id ? "" : p.id)}
                          className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted"
                        >
                          {mergeSourceId === p.id ? "Cancel Merge" : "Merge"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          const next = await deletePersonFn({ data: { personId: p.id } });
                          setDb(next);
                        }}
                        className="rounded border border-border px-2 py-1 text-xs text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "encounters" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Encounters ({db.encounters.length})</h2>
              <button
                type="button"
                onClick={() => void handleAddSampleEncounter()}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                Log Manual Encounter
              </button>
            </div>
            {db.encounters.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No encounters recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {db.encounters.map((enc) => {
                  const person = db.people.find((p) => p.id === enc.personId);
                  return (
                    <div
                      key={enc.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {person ? person.displayName : "Unresolved Identity"}
                          </span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                            {enc.evidenceType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(enc.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{enc.contextSummary}</p>
                        {enc.followUps.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Follow-ups: {enc.followUps.join("; ")}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const next = await deleteEncounterFn({ data: { encounterId: enc.id } });
                          setDb(next);
                        }}
                        className="rounded border border-border p-1.5 text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "device" && (
          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  <div>
                    <h2 className="font-semibold">SenseCAP Watcher W1-B</h2>
                    <p className="text-xs text-muted-foreground">
                      Single-owner framed USB bridge (auto-releases COM port after each request)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={db.settings.comPort}
                    onChange={async (e) => {
                      const next = await updateSettingsFn({ data: { comPort: e.target.value } });
                      setDb(next);
                    }}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {ports.length === 0 ? (
                      <option value={db.settings.comPort}>{db.settings.comPort}</option>
                    ) : (
                      ports.map((p) => (
                        <option key={p.device} value={p.device}>
                          {p.device} — {p.description}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => void refreshPorts()}
                    className="rounded-lg border border-border p-2 hover:bg-muted"
                    title="Refresh COM ports"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleDeviceAction("ping")}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  Ping Watcher
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeviceAction("sys_info")}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  System Info
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeviceAction("hw_test")}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  Run HW Test
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeviceAction("cam_snapshot")}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  Capture Snapshot
                </button>
                <button
                  type="button"
                  onClick={() => void handleSync()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Sync to Watcher ({db.people.length})
                </button>
              </div>

              {db.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {new Date(db.lastSyncAt).toLocaleString()} ({db.lastSyncId})
                </p>
              )}

              {snapshotUrl && (
                <div className="pt-2">
                  <img
                    src={snapshotUrl}
                    alt="Watcher snapshot"
                    className="h-48 w-48 rounded-lg border border-border object-cover"
                  />
                </div>
              )}

              {deviceInfo && (
                <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs">
                  {JSON.stringify(deviceInfo, null, 2)}
                </pre>
              )}
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="text-lg font-semibold">Privacy & Recognition Settings</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Activation Mode</span>
                <select
                  value={db.settings.activationMode}
                  onChange={async (e) => {
                    const next = await updateSettingsFn({
                      data: { activationMode: e.target.value as ActivationMode },
                    });
                    setDb(next);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                >
                  <option value="on_demand">Mode A: On Demand (Default)</option>
                  <option value="always_on">Mode B: Always On (Opt-in)</option>
                  <option value="context_aware">Mode C: Context Aware (Opt-in)</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Wake Phrase</span>
                <input
                  value={db.settings.wakePhrase}
                  onChange={async (e) => {
                    const next = await updateSettingsFn({ data: { wakePhrase: e.target.value } });
                    setDb(next);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
            </div>
            <div className="space-y-2 text-sm">
              {(
                [
                  ["cameraOffByDefault", "Keep camera off outside active/opted-in modes"],
                  ["discreetScreenOutput", "Discreet screen output by default"],
                  ["speakerAnnouncements", "Optional speaker announcements"],
                  ["retainRawAudio", "Retain raw audio after offline summarization"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(db.settings[field])}
                    onChange={async (e) => {
                      const next = await updateSettingsFn({ data: { [field]: e.target.checked } });
                      setDb(next);
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

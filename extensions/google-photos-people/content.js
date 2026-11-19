(function () {
  if (document.getElementById("idee-gphotos-export-btn")) return;

  async function imgToDataUrl(imgEl) {
    try {
      const resp = await fetch(imgEl.src, { credentials: "include" });
      const blob = await resp.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsDataURL(blob);
      });
    } catch {
      return imgEl.src || "";
    }
  }

  async function exportPeopleAndPets() {
    const btn = document.getElementById("idee-gphotos-export-btn");
    if (btn) btn.textContent = "Scanning People & Pets...";

    const seen = new Map();
    const links = Array.from(document.querySelectorAll('a[href*="/search/"]'));

    for (const link of links) {
      const img = link.querySelector("img");
      const label =
        (link.getAttribute("aria-label") || link.textContent || "").trim().replace(/\s+/g, " ");
      if (!label || /^add a name$/i.test(label) || !img) continue;
      if (seen.has(label.toLowerCase())) continue;

      const photoDataUrl = await imgToDataUrl(img);
      seen.set(label.toLowerCase(), {
        displayName: label,
        photoDataUrl,
        source: "google_photos_people",
      });
    }

    const exported = {
      source: "idee_google_photos_people_v1",
      exportedAt: new Date().toISOString(),
      people: Array.from(seen.values()),
    };
    const json = JSON.stringify(exported, null, 2);

    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // ignore clipboard error, still download file
    }

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "google-photos-people.json";
    a.click();
    URL.revokeObjectURL(url);

    if (btn) {
      btn.textContent = `Exported ${exported.people.length} People & Pets (JSON downloaded)`;
    }
  }

  const button = document.createElement("button");
  button.id = "idee-gphotos-export-btn";
  button.textContent = "Export People & Pets to iDee";
  Object.assign(button.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "999999",
    padding: "12px 18px",
    borderRadius: "9999px",
    backgroundColor: "#10B981",
    color: "#0B1014",
    fontWeight: "600",
    fontSize: "14px",
    border: "none",
    boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
    cursor: "pointer",
  });
  button.addEventListener("click", () => void exportPeopleAndPets());
  document.body.appendChild(button);
})();

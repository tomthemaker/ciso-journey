import "./styles.css";
import { createBackup, validateBackup } from "./backup";
import { renderResources, renderScores, renderStats } from "./dashboard";
import { byId, node } from "./dom";
import { bindHistoryForms, renderEntries } from "./history";
import { bindNavigation } from "./navigation";
import { renderRoadmap } from "./roadmap";
import { empty, load, persist } from "./storage";

let state = load();
function changed(): void {
  persist(state);
  renderStats(state);
}
function renderAll(): void {
  renderStats(state);
  renderRoadmap(state, changed);
  renderScores(state, changed);
  renderEntries(state, "journal", changed);
  renderEntries(state, "achievements", changed);
}

bindNavigation();
bindHistoryForms(() => state, changed);
byId("phaseFilter", "select").addEventListener("change", () =>
  renderRoadmap(state, changed),
);
byId("exportBtn", "button").addEventListener("click", () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(createBackup(state), null, 2)], {
      type: "application/json",
    }),
  );
  node("a", {
    href: url,
    download:
      "ciso-journey-backup-" + new Date().toISOString().slice(0, 10) + ".json",
  }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const importFile = byId("importFile", "input");
byId("importBtn", "button").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;
  try {
    const candidate = validateBackup(JSON.parse(await file.text()));
    if (confirm("Importing will overwrite current progress. Continue?")) {
      // Do not replace live state unless the complete candidate persists successfully.
      persist(candidate);
      state = candidate;
      renderAll();
      alert("Backup imported successfully.");
    }
  } catch (error) {
    alert(
      "Could not import backup: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
  importFile.value = "";
});
byId("resetBtn", "button").addEventListener("click", () => {
  if (
    confirm(
      "Reset all learning progress, entries and competency scores? This cannot be undone unless you exported a backup.",
    )
  ) {
    state = empty();
    changed();
    renderAll();
  }
});
renderResources();
renderAll();

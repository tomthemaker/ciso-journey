import "./styles.css";
import { initializeAccount } from "./account";
import { renderProgress } from "./progress-view";
import { bindPortfolio } from "./portfolio-view";
import { bindToday } from "./today";
import { bindCases } from "./cases";
import { bindQuestions } from "./questions";
import { bindReader } from "./lessons";
import { lessonBundle, lessonObjectives } from "./lesson-data";
import { createBackup, validateBackup } from "./backup";
import { renderResources, renderScores, renderStats } from "./dashboard";
import { byId, node } from "./dom";
import { bindHistoryForms, renderEntries } from "./history";
import { bindNavigation } from "./navigation";
import { renderRoadmap } from "./roadmap";
import { empty, LearnerStorage, recoveryMessage } from "./storage";
import type { Change, LearnerState } from "./types";

// Keep a committed state separate from pending edits and unreadable stored data.
let storage: LearnerStorage | undefined;
let state: LearnerState | undefined;
let busy = false;
let generation = 0;
function invalidateProfile(): void {
  generation++;
  state = undefined;
  storage = undefined;
  document.body.dataset.storageBlocked = "true";
  controls();
}
const status = byId("storageStatus", "p");
const themeChoice = byId("themeChoice", "select");
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
function applyTheme(): void {
  const theme = state?.displayPreferences?.theme ?? "system";
  themeChoice.value = theme;
  document.documentElement.dataset.theme = theme === "system" ? (systemTheme.matches ? "dark" : "light") : theme;
}
systemTheme.addEventListener("change", applyTheme);
const recoveryButton = byId("recoveryBtn", "button");
function controls(): void {
  document.body.dataset.storageBlocked = String(!state);
  document.body.dataset.storageBusy = String(busy);
  for (const control of document.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>(
    "#todayStudy fieldset, #readingComplete, #questionBank fieldset, #caseBank fieldset, .task input, #scores select, form input, form select, form textarea, form button, .resource-panel button, .log button, #phaseFilter, #resetBtn",
  )) control.disabled = busy || !state || control.dataset.retired === "true" || control.dataset.pending === "true";
  themeChoice.disabled = busy || !state;
  byId("importBtn", "button").disabled = busy;
  byId("exportBtn", "button").disabled = !state;
  byId("retryStorageBtn", "button").disabled = busy;
  recoveryButton.hidden = !storage?.recovery;
}
function showError(error: unknown): void {
  document.body.dataset.storageError = "true";
  status.textContent = recoveryMessage(error);
  controls();
}
function renderAll(): void {
  applyTheme();
  renderProgress(state, lessonBundle);
  renderToday(state);
  renderLessons(state);
  renderQuestions(state);
  renderCases(state);
  renderPortfolio(state);
  if (state) {
    renderStats(state);
    renderRoadmap(state, changed);
    renderScores(state, changed);
    renderEntries(state, "journal", changed);
    renderEntries(state, "achievements", changed);
  }
  controls();
}
const changed: Change = async edit => {
  if (busy || !state || !storage) return false;
  const readingFocused = document.activeElement?.id === "readingComplete";
  const readingHash = location.hash;
  const current = generation;
  const target = storage;
  const candidate = structuredClone(state);
  edit(candidate);
  busy = true;
  controls();
  try {
    await target.save(candidate);
    if (current !== generation) return false;
    state = candidate;
    document.body.dataset.storageError = "false";
    status.textContent = "Progress saved in this browser. Export regular backups.";
    return true;
  } catch (error) {
    if (current === generation) showError(error);
    return false;
  } finally {
    busy = false;
    renderAll();
    if (readingFocused && location.hash === readingHash) document.getElementById("readingComplete")?.focus({ preventScroll: true });
  }
};
bindNavigation();
const renderPortfolio = bindPortfolio(changed);
const renderToday = bindToday(lessonBundle, changed);
const renderLessons = bindReader(lessonBundle, lessonObjectives, changed);
const renderQuestions = bindQuestions(lessonBundle, lessonObjectives, changed);
const renderCases = bindCases(lessonBundle, lessonObjectives, changed);
async function load(): Promise<void> {
  if (busy) return;
  busy = true;
  const current = generation;
  controls();
  try {
    storage ??= new LearnerStorage();
    const loaded = await storage.load();
    if (current !== generation) return;
    state = loaded;
    document.body.dataset.storageError = "false";
    status.textContent = "Progress stored in this browser. Export regular backups.";
  } catch (error) {
    // No fabricated empty learner: retain known committed state, or block the learning views.
    if (current === generation) showError(error);
  } finally {
    busy = false;
    renderAll();
    if (state && location.hash.startsWith("#roadmap/")) {
      const target = document.getElementById(`task-${location.hash.split("/")[1]}`);
      target?.focus(); target?.scrollIntoView({ block: "center" });
    }
  }
}
themeChoice.addEventListener("change", () => {
  const theme = themeChoice.value as "system" | "light" | "dark";
  void changed(candidate => { candidate.displayPreferences = { schema: 1, theme }; });
});
function download(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  node("a", { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.addEventListener("hashchange", controls);
bindHistoryForms(changed);
byId("phaseFilter", "select").addEventListener("change", () => {
  if (state) renderRoadmap(state, changed);
});
byId("exportBtn", "button").addEventListener("click", () => {
  if (state) download(JSON.stringify(createBackup(state), null, 2),
    "ciso-journey-backup-" + new Date().toISOString().slice(0, 10) + ".json");
});
recoveryButton.addEventListener("click", () => {
  if (storage?.recovery) download(storage.recovery, "ciso-journey-recovery.json");
});
byId("retryStorageBtn", "button").addEventListener("click", () => { if (storage) void load(); else location.reload(); });
const importFile = byId("importFile", "input");
byId("importBtn", "button").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file || busy) return;
  busy = true;
  const current = generation;
  const target = storage;
  controls();
  try {
    const candidate = validateBackup(JSON.parse(await file.text()));
    if (current === generation && target && confirm("Importing will overwrite current progress. Continue?")) {
      await target.save(candidate);
      if (current !== generation) return;
      state = candidate;
      document.body.dataset.storageError = "false";
      status.textContent = "Backup imported and saved in this browser.";
      alert("Backup imported successfully.");
    }
  } catch (error) {
    if (current !== generation) return;
    showError(error);
    alert("Could not import backup: " + recoveryMessage(error));
  } finally {
    busy = false;
    importFile.value = "";
    renderAll();
  }
});
byId("resetBtn", "button").addEventListener("click", () => {
  if (confirm("Reset current learning progress, entries and competency scores? Export a backup first. The original pre-migration recovery copy will remain in this browser.")) {
    void changed(candidate => {
      for (const key of Object.keys(candidate)) delete candidate[key];
      Object.assign(candidate, empty());
    });
  }
});
renderResources();
void initializeAccount(invalidateProfile).then(profile => {
  storage = new LearnerStorage(undefined, undefined, profile);
  return load();
}).catch(error => {
  byId("accountStatus", "p").textContent = error instanceof Error ? error.message : "Account verification failed.";
  status.textContent = "Account unavailable. Reload to retry; no progress was replaced.";
  document.body.dataset.storageError = "true";
  controls();
});

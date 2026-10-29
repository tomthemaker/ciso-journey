import { validateState } from "./backup.ts";
import { empty } from "./state.ts";
import type { LearnerState } from "./types.ts";
export { empty } from "./state.ts";

export const KEY = "ciso-journey-v1";
export const DATABASE = "ciso-journey";
const STORE = "snapshots";
const CURRENT = "current";
interface Snapshot {
  schemaVersion: 2;
  revision: number;
  data: LearnerState;
}

export function validateSnapshot(value: unknown): Snapshot {
  const snapshot = value as Partial<Snapshot> | null;
  if (!snapshot || snapshot.schemaVersion !== 2)
    throw new Error("Stored data has an unsupported schema. Keep a recovery copy and use the app version that created it.");
  if (!Number.isSafeInteger(snapshot.revision) || (snapshot.revision ?? 0) < 1)
    throw new Error("Stored data has an invalid revision. Download a recovery copy before repairing it.");
  return { schemaVersion: 2, revision: snapshot.revision!, data: validateState(snapshot.data) };
}

export function recoveryMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `${detail} No progress was replaced. Export a backup or recovery copy before changing browser storage. Free disk space or allow site storage, close other app tabs, then retry. Do not clear site data.`;
}

/** All durable writes cross this boundary. No view writes browser storage. */
export class LearnerStorage {
  private db?: IDBDatabase;
  private revision?: number;
  recovery?: string;

  private readonly factory: IDBFactory | undefined;
  private readonly profile: string;
  private readonly legacy: Pick<Storage, "getItem">;
  constructor(
    factory: IDBFactory | undefined = globalThis.indexedDB,
    legacy: Pick<Storage, "getItem"> = { getItem: key => localStorage.getItem(key) },
    profile = CURRENT,
  ) { this.factory = factory; this.legacy = legacy; this.profile = profile; }

  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (!this.factory) throw new Error("IndexedDB storage is unavailable in this browser.");
    return new Promise((resolve, reject) => {
      const request = this.factory!.open(DATABASE, 1);
      let abandoned = false;
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        abandoned = true;
        reject(new Error("Storage upgrade is blocked. Close other CISO Journey tabs and retry."));
      };
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) { db.close(); return; }
        db.onversionchange = () => { db.close(); this.db = undefined; };
        this.db = db;
        resolve(db);
      };
    });
  }

  private async transaction<T>(
    work: (store: IDBObjectStore, existing: unknown, result: (value: T) => void) => void,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      let value: T;
      let failure: unknown;
      // Request success is not commit success: publish only after oncomplete.
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(failure ?? tx.error ?? new Error("Storage transaction was aborted."));
      const store = tx.objectStore(STORE);
      const read = store.get(this.profile);
      read.onsuccess = () => {
        try {
          work(store, read.result, result => { value = result; });
        } catch (error) { failure = error; tx.abort(); }
      };
    });
  }

  async load(): Promise<LearnerState> {
    // Capture raw v1 for recovery even when IndexedDB is unavailable. Never remove or update it.
    try { this.recovery = this.profile === CURRENT ? this.legacy.getItem(KEY) ?? undefined : undefined; } catch { /* IDB may still be usable. */ }
    const snapshot = await this.transaction<Snapshot>((store, existing, result) => {
      if (existing !== undefined) {
        this.recovery = JSON.stringify(existing, null, 2);
        result(validateSnapshot(existing));
        return;
      }
      // Read failure is a failure, not evidence of a new learner.
      const raw = this.profile === CURRENT ? this.legacy.getItem(KEY) : null;
      this.recovery = raw ?? undefined;
      const data = raw === null ? empty() : validateState(JSON.parse(raw));
      const migrated: Snapshot = { schemaVersion: 2, revision: 1, data };
      store.put(migrated, this.profile);
      result(migrated);
    });
    this.revision = snapshot.revision;
    return snapshot.data;
  }

  async save(candidate: LearnerState): Promise<void> {
    // Validate before opening a write transaction (also rejects corrupt runtime candidates).
    const data = validateState(candidate);
    const next = await this.transaction<Snapshot>((store, existing, result) => {
      if (this.revision === undefined) {
        // Recovery import may bypass damaged v1 input, whose original bytes stay untouched.
        // Never overwrite an unreadable/future IndexedDB snapshot.
        if (existing !== undefined) throw new Error("Stored data could not be loaded. Keep its recovery copy and restore a repaired backup in a separate browser profile.");
      } else if (existing === undefined || validateSnapshot(existing).revision !== this.revision) {
        throw new Error("Progress changed in another tab. Retry storage to load that progress before editing.");
      }
      const snapshot: Snapshot = { schemaVersion: 2, revision: (this.revision ?? 0) + 1, data };
      store.put(snapshot, this.profile);
      result(snapshot);
    });
    this.revision = next.revision;
    this.recovery = JSON.stringify(next, null, 2);
  }
}

# F03 storage, backups and recovery

Refs [F03 / #5](https://github.com/tomthemaker/ciso-journey/issues/5). Decision D021 in [shared memory](MEMORY.md). This increment introduces storage and backup versioning, not learning-history features or a release claim.

## Boundaries and evaluation

`src/storage.ts` is the only app module that accesses IndexedDB or the original localStorage key. Views submit an edit to a cloned candidate through `Change`; `main.ts` publishes it only after storage commit. `src/state.ts` defines unchanged legacy defaults; `src/backup.ts` shares complete validation across migration, import and saved snapshots. Static curriculum/content stays outside learner storage.

Native IndexedDB was selected over continued localStorage writes because its read/write transactions can atomically check a revision and replace state without blocking the DOM with synchronous serialization. A single `current` snapshot in database `ciso-journey`, object store `snapshots`, is sufficient for today's small state. No runtime storage package, future entity framework, cloud service or new learning tables were added. The database structure version is **1**; the snapshot/data schema is **2**. These versions serve different purposes.

The snapshot is `{ schemaVersion: 2, revision, data }`. A read/write transaction reads the current snapshot, validates it, checks the caller's revision, and writes a complete replacement. UI publication waits for transaction **complete**, not request success. Revision checks apply to edits, reset and import. A stale tab must **Retry storage** to load the latest committed state before trying again; nothing merges implicitly. Existing tabs do not update automatically.

On first load, an absent snapshot causes validation of the entire `ciso-journey-v1` value and one atomic insertion. An absent v1 value starts a new learner. A malformed value or denied read is an error, never evidence of an empty learner. Concurrent starts serialize within IndexedDB. Later starts validate the existing snapshot without rewriting it; migration is idempotent. The original v1 key remains **byte-for-byte untouched**, including after success, imports, edits and reset. It is a migration/rollback copy, not an up-to-date mirror. Once an IndexedDB snapshot exists it is authoritative; editing the old key does not change current progress.

Implementation references checked 2026-10-28: [IndexedDB transaction lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction) and [database/version-change usage](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB). Transactions prevent partial app writes; browser eviction, explicit site-data deletion and device loss still require external backups. Local persistence does not promise offline app launch.

## Full backups and compatibility

**Export backup** downloads `{ app: "CISO Journey", version: 2, exportedAt, data }`. `data` retains the v1 shape (`completed`, `scores`, `journal`, `achievements`) and every compatible unknown JSON field, including extra history metadata, task IDs and score categories. Partial legacy scores receive the six original defaults. Existing 37 task meanings and rating values do not change.

Local transaction revisions are regenerated on import; they are not learner records in the backup. The importer accepts complete v1 and v2 backups. It rejects invalid known fields, impossible dates and unsupported future envelope versions before confirmation or persistence. A cancelled import does not write. An accepted candidate commits before replacing the live state; failure preserves the previous snapshot. Version 2 keeps room for future learning records as separate named data fields, but these remain opaque until their owning feature adds validation and, if necessary, a schema migration. This increment does not reinterpret resource consumption, recall, attempts or applied assessment as task completion or legacy ratings.

V2 exports cannot be read directly by old v1-only apps. For a rollback, keep the latest full v2 export privately and create a separate v1-compatible copy by changing only the envelope's `version` from `2` to `1`; the data layout is unchanged in F03. The old app retains compatible extra data fields but cannot display future features. Never assume the untouched original localStorage key includes post-migration changes. Do not commit personal backup/recovery files, notes or evidence.

## Recovery without resetting progress

- **Save/quota/transaction failure:** the banner explains that no progress was replaced. The UI returns to the committed task/score/history state; an unsaved journal/achievement form stays filled. Export the committed backup, free disk space or allow site storage, close other CISO Journey tabs, and retry the action. **Retry storage** reloads the latest durable state; it does not replay an unsaved action.
- **First-load/migration failure:** editing and progress views stay blocked rather than presenting empty progress. **Download recovery copy** preserves the exact v1 text when readable. Restore storage access/free space and use **Retry storage**. An aborted insertion leaves no current snapshot and retries safely. A valid repaired backup can be explicitly imported while the damaged original v1 bytes remain untouched.
- **Damaged v1 field:** download the recovery copy privately. Work on a separate copy; wrap its complete data as `{ "app": "CISO Journey", "version": 1, "data": ... }` and repair only the invalid field using known values. Import that copy after validation. Keep the original raw recovery file. Do not reset or discard healthy records merely because one field is malformed.
- **Corrupt IndexedDB snapshot:** download its raw recovery snapshot. Work on a separate copy, use its `data` in a v2 backup envelope, and repair only known invalid values. Restore that backup in a **separate browser profile** on the same app URL, preserving the original profile and recovery file for investigation. The app intentionally refuses to overwrite an unreadable snapshot, including through import. A raw recovery snapshot is diagnostic input, not directly an import envelope.
- **Future snapshot/schema:** keep the raw recovery copy and open the app version that created it. Do not downgrade its version or clear storage. The older app refuses to overwrite it.
- **Storage unavailable or blocked:** allow storage for this origin, use a supported normal browsing profile, close other app tabs and retry. If IndexedDB cannot be read, its records cannot be downloaded through the app; preserve the profile. Any readable v1 original can still be downloaded. A missing recovery button means no raw copy could be read, not that the learner had no data.

The database and old key are scoped to the origin, not the Pages path. A different hostname/profile/device needs a private export/import transfer. Never use Reset or browser “clear site data” as a storage troubleshooting step. Reset is still an explicit user action that clears current learner state only; the historical original v1 key stays retained.

## Validation evidence

Node 24.4.1, isolated F03 worktree. Commands:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:browser -- --workers=4
git diff --check
```

Implementation results: **83/83** fast Node checks (68 preservation, 11 curriculum, four storage/backup), typecheck and production build pass. **26/26** local Chromium desktop/Pixel 7 checks pass (30.4 seconds), comprising the existing 16 preservation/Pages cases and ten storage cases. CI remains unit/type/build only, as D020 requires. No dependencies, lockfile, curriculum or content changed.

New real IndexedDB flows cover an abort after successful put request (no UI publication/no current snapshot), exact original recovery bytes, retry and no repeated migration writes; quota failures across tasks, ratings, history and reset with retained form draft; stale-tab import/reset refusal and reload; corrupt/future snapshots with raw download and refused replacement; and repaired v1 import without erasing its damaged original. Existing flows cover all 37 IDs, six legacy ratings, safe imported text, complete v1 fixture→v2 export→import round-trips, invalid/future imports with unchanged durable/live data, cancellation, failed import, mobile controls and built Pages subpath assets/hash refresh.

Tests use synthetic state only. Failure injection checks app transaction behavior; it does not emulate physical disk exhaustion, power-loss durability, browser eviction or every browser engine. The candidate SHA, PR, CI and fresh independent review evidence belong in the delivery record. Implementation evidence is not independent approval.

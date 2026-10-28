# L02 resource progress and recovery

Refs [L02 / #10](https://github.com/tomthemaker/ciso-journey/issues/10), decision D025 in [shared memory](MEMORY.md). Courses supplement the original lessons. This increment does not implement mastery assessment, recall or question grading.

Expand **Learning resources** under a roadmap task. Save a course or reference as Not started, In progress or Completed, with notes and an optional evidence HTTPS URL. Completed requires a calendar date; the initial suggestion uses the device's local date. Resource completion is manual: opening a link changes nothing. Discovery searches are visibly labeled and cannot be completed. Add the specific course/reference found in a search as a custom resource.

The roadmap shows resources completed separately from tasks and legacy ratings. The count includes archived resources with completed progress, so archiving does not erase consumption history. Each task's resource panel explains that these are participation records, not evidence of task completion, reading, recall, question performance or competency.

## Stable identity and history

The optional `resourceProgress` namespace has schema version 1 and concrete `entries`. Each entry has its stable `id`, original `taskId`, `isCustom`, metadata `revisions` and saved `progress` records. Bundled IDs are explicit task slots (`w1-linkedin`, `w1-official`, and applicable `p2a-coursera-governance` slots); URLs and array positions are not identity. A genuinely different replacement resource needs a new ID. Custom resources use `custom-` plus a UUID. The same course offered for two tasks has two task-specific records.

A resource is copied into learner state only on the first explicit save/archive. The copied title/platform/type/URL are retained even if a future bundled catalog changes. Custom edits append a metadata revision under the same ID. Archive/restore append metadata revisions and preserve all progress, notes, completion dates and original URLs. **Saved resource history** displays both metadata and progress. Each saved progress record pins the metadata revision used, with a UTC recording time. Changing a completed resource back to In progress retains its earlier completion record in history; the current completed count follows its latest saved status.

Archiving is the reversible removal action; this increment does not permanently delete custom records or history. Notes/evidence are private browser data and must never be committed to this public repository. Rendering uses text nodes, and all resource/evidence links require credential-free HTTPS. Validation checks archived and historical URLs too; imported HTML remains literal text.

## Backup and failed-save behavior

Full v2 exports include this entire namespace, compatible extra JSON fields and unchanged legacy/reading/other learner data. Complete v1 envelopes remain accepted. Original `ciso-journey-v1` bytes remain untouched. Older v1 apps cannot display resource tracking; keep a full current backup before any rollback.

Migration, stored snapshots, imports and edits share complete validation. Future resource schema versions, duplicates, unknown task associations, invalid revisions/statuses/dates and unsafe URLs reject the entire candidate before a durable replacement. No field is reset to repair a damaged namespace. Keep a private recovery copy and follow [F03 recovery](F03_STORAGE_AND_RECOVERY.md#recovery-without-resetting-progress); future data needs the creating app version. A failed storage write leaves saved status/count/history unchanged and keeps the current resource form draft and expanded panels. Retry storage loads committed state; it does not replay the draft.

## Validation

Node 24.4.1: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser -- --workers=4`, `git diff --check`. CI remains fast unit/type/build only (D020). Candidate SHA, final results and independent task review are recorded in the implementation PR linked from #10.

New unit cases check sibling-state independence, exact v1/v2 backup round-trips, edited/archived/restored history, stable catalog identity and complete corrupt/future/unsafe rejection. New local desktop/Pixel 7 flows check manual resource tracking under `/ciso-journey/`, original v1 bytes and reading preservation, custom lifecycle/history, literal imported text, safe URLs, aborted transactions with retained drafts, and rejected imports with unchanged snapshots. Existing preservation, storage, reader and Pages flows remain required. Synthetic learner data only; Chromium emulation does not cover every browser or physical storage failure.

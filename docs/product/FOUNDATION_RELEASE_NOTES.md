# Foundation weeks 1–4 provisional pilot

2026-10-28. **Provisional AI-authored study material; independent educator review is outstanding.** This is a functional pilot, not a validated R1 teaching release, certification or readiness assessment. [Release gates and exact evidence](G01_RELEASE_GATE.md) record what has and has not passed.

Read four original lessons on security foundations, identity, architecture and data/recovery. Practice with 20 explained questions, 12 retrieval cards and one fictional executive case with a self-assessment rubric. Optional course/reference tracking supplements the lessons. The case retains its original revision and offers a newer revision explicitly; saved answers always refer to the revision used.

Reading/resource participation, task checkoffs, retrieval ratings, question attempts and case self-assessment are separate records. None automatically raises the six legacy competency ratings or establishes mastery. FSRS recall is a model estimate. The worked responses are examples; open answers are not automatically graded. Use fictional information in practice; keep employer information and private evidence outside the public repository.

The pilot uses local browser storage with no account or cross-device sync. Browser storage alone does not guarantee the app launches offline. Desktop and mobile Chromium flows are checked; this is not a promise of support for every browser or an accessibility audit. Technical source inspection does not supply independent teaching/legal approval, legal advice or certification equivalence.

## Keep and recover your progress

1. Before upgrading, changing browser/profile/device or changing app origin, select **Export backup** and retain the full JSON privately. Export regularly after study. Never commit learner backups, notes, credentials or employer evidence.
2. In the destination app, export any existing destination progress first. Select **Import backup**, choose the complete v1 or v2 file, then confirm replacement. Import replaces the whole current snapshot. Check tasks/ratings and study history, refresh, then export again before discarding any old copy.
3. Invalid/future imports are rejected before replacement. If saving fails, committed progress stays unchanged; retain the current-tab form draft and retry after resolving storage access/space. **Retry storage** reloads committed state and does not replay your unsaved action. Drafts do not survive closing/refreshing the tab.
4. For a storage error, use **Download recovery copy** when offered, preserve the original browser profile and follow the [recovery guide](F03_STORAGE_AND_RECOVERY.md#recovery-without-resetting-progress). A raw recovery snapshot is diagnostic data, not directly an import file. Do not use Reset or clear site data to troubleshoot storage.

Exports use envelope version 2 and contain all current private histories/settings/evidence metadata and exact content refs. Version 1 backups remain accepted; the actual 37 task IDs and all six legacy 0–4 ratings retain their meanings. The untouched `ciso-journey-v1` localStorage key is the original migration copy, **not** a current backup after IndexedDB migration. Future/corrupt snapshots require the matching app or repair of a separate copy in a separate profile; the app refuses to overwrite unreadable data.

## Maintainer rollback

Keep the current full v2 export privately before changing app versions. To reproduce a previously approved build without altering this checkout:

```sh
git worktree add --detach /tmp/ciso-approved-pilot APPROVED_COMMIT_SHA
cd /tmp/ciso-approved-pilot
npm ci
npm test
npm run typecheck
npm run build
npm run preview
```

Replace `APPROVED_COMMIT_SHA` with the recorded approved candidate; use an unused worktree path. A preview on another port is another storage origin: use a separate browser profile and private export/import to verify compatibility before touching the original. Keep the app version capable of reading your backup; never downgrade a schema number to bypass validation. Older versions cannot display later histories. A v1-only emergency rollback needs a separate compatible copy and the complete retained v2 backup; follow [F03 compatibility](F03_STORAGE_AND_RECOVERY.md#full-backups-and-compatibility).

For production rollback, prepare a reviewed revert to an approved Vite commit, run critical checks, merge through repository protections and verify the rebuilt Pages artifact/live URL. Retain GitHub Actions publishing. The old single-file F01 fallback in [the deployment guide](F02_BUILD_AND_DEPLOY.md#rollback) is for hosting emergencies and cannot display the later learning loop. Source rollback does not restore lost browser data; preserve current exports and storage throughout.

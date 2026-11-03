# Required account state

D045 / [#123](https://github.com/tomthemaker/ciso-journey/issues/123), parent [#23](https://github.com/tomthemaker/ciso-journey/issues/23). GitHub login is required. One Postgres state is authoritative; online browser memory is a rendering/editing buffer. No persistent browser learner cache, token store, outbox, anonymous mode or automatic local import exists in the new contract. Existing browser bytes remain untouched. The separate frontend task delivers that browser behavior; this change delivers the database API.

## API

Use only the public project key and current bearer access token against PostgREST `/rest/v1/rpc/`. There is no owner parameter. Ownership is the verified JWT subject with a live confirmed, nonanonymous, nondeleted, nonbanned Auth user and live matching Auth session. The server locks that user's row before the state row, serializing bootstrap, saves, reset, closure and Auth deletion. Default-deny RLS, unexposed private schemas, revoked table/helper grants and empty definer search paths protect the boundary.

| RPC | JSON arguments | Result |
|---|---|---|
| `account_load` | `{}` | Atomically bootstrap defaults once, or return current envelope. |
| `account_save` | `{p_expected_revision: string, p_snapshot: snapshot}` | Compare current UUID revision, validate and replace state atomically; return new envelope. |
| `account_reset` | `{p_expected_revision: string}` | Explicitly erase current state/observation fingerprints and return defaults with a new revision. |
| `account_close` | `{p_expected_revision: string}` | Purge current payload/fingerprints and Auth identity/sessions; retain disabled owner tombstone; return `{closed:true}`. |

Load/save/reset return exactly:

```json
{
  "protocol": 1,
  "owner": "verified-auth-subject-uuid",
  "revision": "opaque-server-generated-uuid",
  "snapshot": { "schemaVersion": 2, "data": "complete LearnerState object" }
}
```

`data` is an object, not a string. Defaults match `empty()` exactly: empty completions/journal/achievements and the six original competency scores (0/1/0/0/0/2). The client must verify protocol, owner, revision and snapshot schema, then run `validateState` before rendering. Preserve compatible unknown JSON extensions. No ownership or revision metadata is added to the LearnerState or v1/v2 file backup.

SQL bounds snapshots to 16 MiB and validates the envelope, base value types/history, known namespace versions/collection shapes and immutable observation identities. It deliberately does not reimplement the TypeScript FSRS/domain validators: a malicious owner could submit domain-invalid data for their own account. A compatible client must reject that data before rendering or overwriting it, surface recovery, and never replace it with defaults automatically. The 100,000 retained observation identity limit fails atomically, leaving the previous state intact. Fingerprints cover complete review events, attempts/assessments, case responses/assessments and portfolio appraisals; referenced content, timestamps and before/after schedules are never rewritten. Removed observation IDs cannot later be reused with different data. Explicit reset clears the registry, as a new dataset. Mutable notes and file imports replace state deliberately under the same CAS contract.

A single JSONB row is the smallest sufficient model for today's whole-state validators and file formats. It stores the current snapshot once, without old snapshot duplication/chunk trees or operation journals. Observation hashes retain only identity integrity metadata. PostgreSQL TOAST handles large values; writes still transfer the whole snapshot, so this is a bounded current-scale design, not a claim of efficient arbitrarily large histories. Optimizing serialization/storage later requires evidence of need.

## Failure behavior

- SQLSTATE `PT409`, HTTP 409, `account_revision_stale`: another write/reset won, or a successful response was lost. No retry is acknowledged as current success; no operation changes data without the expected revision. Load again, then make a deliberate fresh edit. Never silently rebase the rejected snapshot.
- SQLSTATE `42501`, HTTP 403 for an authenticated caller, `account_identity_unavailable` / `account_unavailable`: clear private UI and require authentication. Invalid/expired/forged bearer tokens fail at the gateway (normally HTTP 401). Revoked/deleted sessions are checked live even if their JWT has not expired.
- SQLSTATE `22023` (HTTP 400): malformed/future/oversized snapshot or changed observation identity; previous state stays intact. Structural errors inherited from the sealed validator retain `sync_*` message names, but expose no branching capability.
- `legacy_account_requires_recovery` (`P0001`, HTTP 400): existing server branch data is sealed; stop and arrange deliberate recovery. No blank state is created.
- Network timeout/lost response: completion is unknown. Keep drafts only in memory; reload from the server before any further save. Never show unacknowledged state as saved or queue it offline. Reload/sign-out can lose an unsaved draft; the UI must state that limitation.

No browser retry identifier is required: all stale retries fail safely. Reset generates a fresh UUID, preventing any pre-reset save from reviving erased state. Closing twice fails live Auth rather than claiming another successful deletion. Raw administrator deletion from `auth.users` also blocks every old token, but is not the supported learner-data erasure procedure: administrators must use/replicate the documented payload purge, including retained backups under their retention policy.

## Existing data and recovery

The migration creates new tables and revokes the seven old `sync_*` RPC grants; it never drops or rewrites old accounts/revisions/chunks/observations. The original functions remain operator-only for recovery. Any populated old account blocks new `account_load/save/reset/close`; disabled legacy accounts stay disabled. Empty enabled old accounts can bootstrap normally. No browser exposes a second protocol or branch UI.

For an existing populated account, an authorized operator must first export its complete sealed revisions/chunks/observations through a private administrative channel, preserving every branch and original fingerprint. Confirm a recoverable export outside Git, identify the exact desired snapshot with the owner, validate it with the current TypeScript validators, and plan/import it into the new private state plus observation registry in one transaction. Archive disposition and release of the legacy block require an explicit owner-approved data migration; **this PR intentionally does not automate that choice or destructive cleanup**. Do not simply delete old revisions to unblock login. Real server data, backups or tokens must never appear in tests, Git or issue text. Hosted backups/deletion-ledger retention remain operations gates.

## Reproduce and evidence

Use Node 24.4.1+, Docker and the existing pinned CLI 2.122.0/locked local stack. From an isolated synthetic-only worktree:

```sh
npm ci
npm run sync:start
npm run test:sync
npm test
npm run typecheck
npm run build
```

`sync:reset` is destructive only to the confirmed isolated synthetic worktree; never reset the main operator stack or another agent's stack. `test:sync` is explicit and outside fast CI. The suite uses captured synthetic email OTP solely to mint real Auth sessions, not as a product login option. GitHub application credentials, real callback/PKCE/cancellation/refresh validation and hosted deployment are separate unfulfilled gates. The original [local setup](LOCAL_SYNC_FOUNDATION.md#github-login-handoff) describes private server configuration; the new frontend uses memory-only sessions rather than the historical partition instructions.

Implementation evidence (2026-11-03, candidate SHA recorded in PR): isolated API `http://127.0.0.1:21505`, mail `http://127.0.0.1:20282`, PostgreSQL 17.11, pinned CLI 2.122.0. Migration replay succeeded; the final function revisions were applied to this isolated stack without resetting other agents' fixtures. `npm run test:sync` passed all 8 scenarios (9 Node tests including their parent): anonymous/forged/two-account isolation, concurrent bootstrap/CAS, lost-acknowledgement rejection, reset/closure, malformed/future envelopes and exact observation IDs, RLS/helper/old-RPC restrictions, live bans/session revocation/Auth deletion, staged legacy data and v1/v2/year-zero calendar preservation.

`npm test` passed 172 checks plus curriculum coverage; typecheck/build passed (existing large-bundle warning). Existing browser sources/fixtures/config/lockfile are unchanged: local desktop/mobile preservation and Pages smoke passed 15/16 in the initial six-worker run; the desktop 37-ID loop hit its 30-second timeout, then passed 1/1 in a single-worker focused rerun (17.4 seconds). These are compatibility checks for the unchanged frontend at this backend candidate, **not** proof of the new account UI. The separate frontend task has its own real-Auth account browser acceptance and exact-candidate evidence. Database/browser installation or execution was not added to CI.

Fresh independent exact-candidate security review is required; no self-approval, actual GitHub provider validation, hosted release or educator/legal content validation is claimed.

# Local Supabase foundation

Implemented for [#117](https://github.com/tomthemaker/ciso-journey/issues/117), pending independent security review. Parent [#23](https://github.com/tomthemaker/ciso-journey/issues/23) remains open. This is executable local Postgres/Auth/API infrastructure and a client protocol, **not a shipped browser sync client or a hosted deployment**. D041 selects Supabase Zurich and, following the owner's later instruction, **GitHub OAuth as the only product login**. Earlier email OTP selection is superseded.

## Reproduce locally

Requires Node >=24.4.1 and a running Docker-compatible engine. On the development Mac, `open -a Docker` starts the installed Docker Desktop. From this worktree:

```sh
npm ci
npm run sync:start
npm run sync:status
npm run sync:reset
npm run test:sync
npm test
npm run typecheck
npm run build
npm run sync:stop
```

`sync:reset` destroys **only this worktree's synthetic local database** and replays migrations. Never use `--linked`, remote URLs, or a production project. Tests create random `example.test` identities and fictional learning records. No actual GitHub user, learner backup or employer evidence is involved. Local data remains outside Git; stop preserves it. The local integration suite is explicit and excluded from fast CI and `npm test`.

The runner pins CLI **2.122.0**, uses its experimental Docker stack and the committed `supabase/supabase.lock` service hashes. This is intentional: Docker Desktop 29.8.2 published the legacy stack on all interfaces despite the documented loopback network setting. That stack was stopped; the experimental runtime explicitly binds ports to `127.0.0.1`. The runner verifies project-root identity, Docker runtime and actual published bindings before reset. It never prints generated credentials. Stack commands/outputs are experimental, so upgrade and rerun this suite deliberately; do not silently float the CLI. See official [runtime choices](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes) and [multiple local projects](https://supabase.com/docs/guides/local-development/running-multiple-local-projects).

Ports persist per worktree across resets; a different worktree has different ports. `sync:status` reports current public URLs. This implementation worktree used API `http://127.0.0.1:27009`, mail capture `http://127.0.0.1:29521`. Services start lazily. Realtime, Storage, Studio, functions and analytics are disabled. There are no buckets or binary uploads to authorize. The stack's development credentials and HTTP are suitable only for local synthetic testing.

## GitHub login handoff

After merge, start the stack from the long-lived main checkout and use `sync:status` to obtain that checkout's stable API/callback. Keep that checkout path and stack data stable. Do not configure the operator OAuth App against this temporary implementation worktree's `27009` callback. Independent test/review worktrees get separate ports and use synthetic fixtures. Use a dedicated GitHub OAuth App for the long-lived local development stack. No relevant GitHub/Supabase/OAuth credential environment variable names were present during implementation; no real provider login was tested. An existing `gh` login is not an OAuth application's client secret.

1. In GitHub Developer Settings, register the local OAuth App with the actual app URL as Homepage URL. Set Authorization callback URL to **the local Supabase API URL plus `/auth/v1/callback`**, for that long-lived checkout (the temporary implementation callback was `http://127.0.0.1:27009/auth/v1/callback`). A hosted project's callback is `https://<project-ref>.supabase.co/auth/v1/callback`; use a separate OAuth App for production.
2. Create ignored root `.env.oauth.local` in a private editor with `CISO_GITHUB_CLIENT_ID=...` and `CISO_GITHUB_CLIENT_SECRET=...`. These are server configuration, **never `VITE_` variables**, browser code, backups, Git or chat text. `[auth.external.github]` already references them through `env(...)`; set its `enabled = true` locally. Configure `auth.site_url` / `additional_redirect_urls` for the exact actual application URL, including the Pages base path for hosted use. The committed app URL is `http://127.0.0.1:5173/ciso-journey/`, with exact local test/preview entries `http://127.0.0.1:4174/ciso-journey/` and `http://127.0.0.1:5179/ciso-journey/`. Avoid wildcard redirects.
3. Load the private file in a local terminal and restart this worktree stack:

```sh
set -a
source .env.oauth.local
set +a
npm run sync:stop
npm run sync:start
```

4. The frontend uses only ignored `.env.local` public configuration: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Obtain the public key locally from the CLI status `env.PUBLISHABLE_KEY` without copying its secret/service-role fields. Use the Supabase SDK with `auth.flowType: 'pkce'` and `signInWithOAuth({ provider: 'github', options: { redirectTo: exactAppBaseURL } })`. Exchange the returned authorization code before ordinary hash routing, remove it from the URL, and validate the authenticated subject before opening its local partition. There is no email/password/sign-up control, extra GitHub repository scope, or provider-token persistence in learner data.
5. Before hosted use, disable the Email provider in Supabase Auth configuration and leave every provider except GitHub disabled. The committed local configuration intentionally enables captured email solely to mint real Auth sessions for synthetic integration fixtures; **it is not a production configuration**. The experimental stack cannot serve custom mail templates, so fixtures verify the captured one-time link token via `/auth/v1/verify`. This proves real Auth/JWT behavior, not GitHub OAuth callback/PKCE integration. Real GitHub callback, cancellation, expired code, refresh and sign-out tests remain required with app credentials.

Source contracts: [Supabase GitHub login](https://supabase.com/docs/guides/auth/social-sign-in/auth-github), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow). OAuth identity/login is distinct from explicit sync enrollment. Signing in must never upload or relabel existing local study.

## Protocol 1

Ownership is the stable Supabase `user.id`, never email, username or an input owner field. An account partition is `(Supabase project/API origin, subject, generation)`. Anonymous local study is a separate partition. All calls below use only the public project key and current user's access token. RPCs take **no owner argument**.

| RPC | Arguments | Result / rule |
|---|---|---|
| `sync_enroll` | none | Explicit opt-in creates an empty account once; returns status. Login alone does not call it. |
| `sync_status` | none | `{protocol:1,owner,generation,sequence,head,tips,archiveBytes,archiveLimitBytes}`. A null head is an empty enrolled account. |
| `sync_commit` | `p_request` below | Immutable accepted/conflict result; an identical retry returns its original result, not current status. |
| `sync_pull` | `p_generation,p_after,p_through,p_limit=1,p_compact=false` | Owner/generation plus ordered revisions through a frozen sequence. Limit 1–2. Each revision has `id,sequence,request,result`. |
| `sync_chunks` | `p_generation,p_after=''` | Compact archive chunks in hash order. Continue from the last hash until empty. Pages have <=100 nodes, targeting 1 MiB; one large value may occupy a larger page. |
| `sync_erase` | `p_generation,p_sequence,p_id,p_snapshot` | Explicit destructive purge and server-generated new generation seeded with exactly the learner-selected retained snapshot. |
| `sync_close` | `p_generation,p_sequence` | Atomically disables the account, purges all revisions/chunks/observations and deletes the Auth user/sessions. A minimal disabled owner tombstone remains. |

An append request contains **exactly** these seven fields:

```json
{
  "protocol": 1,
  "generation": "server-generation-uuid",
  "id": "stable-operation-uuid",
  "kind": "append",
  "parent": "previous-revision-uuid-or-null",
  "frontier": null,
  "snapshot": { "schemaVersion": 2, "data": "the complete validated LearnerState object" }
}
```

`data` above denotes an object, not a JSON string. Resolution uses `kind:"resolve"`, `parent:null`, `frontier:{sequence:<observed>,tips:[<every current tip>]}` and the explicitly selected/combined snapshot. Unknown request fields, unsupported protocol, missing parents, unsupported known namespace versions and oversized bodies fail before any durable effect. SQL validates the envelope/version fence and immutable observation identities; it **does not duplicate TypeScript learning validators or execute FSRS**. The client must fully validate every incoming/staged snapshot using its compatible `validateState`, including exact FSRS provenance/chains, and quarantine unsupported/invalid data without replacing live state. A malicious owner can corrupt their own submitted learning semantics; cannot cross account boundaries or mutate prior accepted evidence.

Every server call checks the live verified Auth user (not anonymous/deleted/banned) and locks the enabled account row. Anonymous callers have no function grants. Tables live in unexposed `sync_private` with default-deny RLS and no browser table privileges; helper functions are private. Only the listed functions are executable by `authenticated`; all definer functions pin an empty search path and derive/check identity. Changing ownership through REST, RPC extra fields, nested foreign references, direct SQL grants or a forged JWT provides no bypass. Nested IDs are data within that owner's snapshot, never dereferenced into another account. See [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [function privileges](https://supabase.com/docs/guides/database/functions).

### Conflicts and exact observations

Each accepted snapshot is immutable. A direct child of the sole current head advances it. A snapshot from an older/null parent becomes a preserved competing tip. If conflicts already exist, further descendants replace their own tips while the selected head remains unchanged. No clock chooses a winner. At most 64 competing tips are accepted; exceeding that limit leaves local work pending for explicit resolution/export.

Resolution CAS checks the complete frontier and sequence, preserving every original revision and parent. A simultaneous resolution loses its CAS and must be shown the updated frontier. A later offline child of an old resolved-away branch reopens a conflict. Missing-parent requests wait in the local durable queue and retry only after that exact parent arrives.

For notes, show the common base and each version with an explicit keep/combined choice. This release intentionally conflicts the **whole snapshot**, including otherwise independent edits. It does not automatically merge fields. Show a complete difference inventory so selecting one snapshot cannot silently remove another device's task, resource, note or portfolio edits from the active view.

For FSRS, preserve each complete existing valid chain. Never concatenate, replay, rerate, retimestamp or synthesize before/after schedules to fit one old-schema array. The user selects the active complete chain/snapshot; unchosen observations remain in the full archive with their original IDs, content refs, times, provenance and logs. Only the selected snapshot supplies ordinary active-chain progress calculations; surface the existence/count of archived unchosen observations separately. No mastery/readiness change is inferred.

The server registers immutable fingerprints for review events, question attempts and self-assessments, case responses and self-assessments, and portfolio appraisals. A repeated `(owner,generation,kind,id)` with a different value fails even across branches. Different assessment IDs for one response can exist in separate valid snapshots; do not union them into an invalid one-assessment namespace. Resource version numbers remain local to their original full snapshots; do not renumber them. Mutable notes/evidence revisions remain recoverable in every original snapshot. All 37 task IDs, legacy scores, compatible extension fields and current namespaces (including portfolio and `studyPreferences` schema 1) survive unchanged.

### Durable client transition requirements (next task)

1. Before opt-in upload, show the target account and private-data inventory, offer a full backup, classify compatible unknown extension fields and obtain an explicit copy choice. Retain raw v1/v2 originals. Existing remote data becomes a conflict with the local copy, never an automatic replacement. Unknown extensions stay recoverable and block automatic upload until explicitly classified for disclosure.
2. A new account-partitioned IndexedDB schema must atomically commit local snapshot plus immutable outbox request. Record owner/project/generation and stable parent/ID with the request; retries never mutate it. Compatible old snapshots remain isolated and recoverable. No account metadata is disguised as compatible extra learner fields.
3. Pull status, freeze `sequence`, fetch pages through that value, validate all snapshots, then commit local acknowledgement/frontier plus cursor atomically. Do not treat an old retry response's head/tips as current. New server writes require another pull. Never overwrite pending local work with a remote snapshot; turn it into its original branch.
4. Freeze writes and advance a persistent session epoch on sign-out/switch; cancel transport, clear visible private data/drafts/tokens and notify other tabs. Check both captured epoch and immutable partition before any delayed callback or storage commit. An old account's queue never runs with another account's credentials. Retained caches/outboxes remain hidden and recoverable only after the same account reauthenticates; provide explicit local export/erasure. Anonymous local study remains separately selectable, not automatically shown as a residual signed-out copy.
5. Auth expiry pauses upload while an already-open local partition may continue durable study. Explicit sign-out requires authentication to reopen it. Supabase access tokens may survive sign-out until expiry (local setting 3600 seconds); immediate local isolation is essential. Account disable/closure is checked live server-side, so otherwise-valid JWTs cannot bypass it. No offline app-launch caching is added here.

### Erasure and recovery

Ordinary edits produce historical revisions; removing text from the current snapshot **is not erasure of its history**. Privacy erasure uses `sync_erase`: freeze the current frontier, export if wanted, explain all affected history, select the exact retained state and confirm purge. A stale sequence rejects the operation instead of deleting unseen writes. Server transaction deletes all old-generation revisions/chunks/fingerprints and seeds a fresh generation. This coarse erasure deliberately trades selective tombstones for an easily audited fence. It can retain a current sanitized snapshot but cannot retain unchosen branch payloads that include erased material. Display that consequence before confirmation.

Every pre-erasure queue, read cursor, old retry and backup-bound generation is rejected. A client must never merely substitute the new generation into old work. Quarantine the old partition for explicit local recovery/removal; show that server deletion cannot remove bytes on offline devices or learner-held exports. Any later upload from an old backup requires an explicitly reviewed new local copy, not reconnect replay. Last-erasure retry returns the same receipt only for the same old generation, sequence, ID and snapshot fingerprint. It retains no erased snapshot. Older erasure receipts may be rejected after another erasure; they never recreate data.

Closure removes the Auth identity and all account payloads atomically. A lost closure response is followed by access denial, not a promise that an error-free retry response exists. The disabled owner tombstone prevents same-subject re-enrollment. Recreating a GitHub-backed identity later must create a fresh subject/empty account. Local caches and provider-side OAuth grants have separate removal semantics. No hosted provider backup expiry or secure media erasure is claimed.

A database restore from before deletion could revive the old state. **Hosted deployment remains blocked until an independently durable deletion ledger, restore/revocation replay runbook, operational retention and qualified security review are implemented and exercised.** The local migration/reset test rebuilds schema and isolation; it is not that disaster-recovery proof.

## Storage and full backup format

The database stores exact logical JSON through account/generation-scoped SHA-256-addressed chunks. Small objects/scalars are values; larger objects reference child hashes; arrays use persistent 32-way blocks. Appending an event shares unchanged observations and blocks, adding a new tail and logarithmic ancestors. Revision metadata and operation fingerprints remain immutable. Old offline parents are never pruned. Internal hashing uses PostgreSQL's JSONB representation; JSON member order/whitespace is not a learner-data guarantee, and hashes are not signatures or client authorization.

Bounds: 16 MiB logical snapshot, 64 MiB account logical archive budget including conservative row metadata allowances, 100,000 revisions, 64 competing tips. A quota rejection rolls back all chunks, fingerprints and metadata, preserving the local request for retry/export. This is a bounded integrity service, not unlimited storage; logical quota is not exact physical database/disk usage. Meaningful larger-history limits need workload evidence before changing them. Whole snapshots still cross the wire and undergo validation per save; content addressing currently optimizes retained storage/backups, not bandwidth. Batch queued local observations into a final complete snapshot where parent semantics permit, without rewriting already enqueued operations; optimize transport separately if measured usage requires it.

A full sync backup is a **separate** `{format:"ciso-journey-sync",version:1,status,revisions,chunks}` envelope, extended by the client with its project identity, all local pending branches/outboxes, drafts, raw import recovery copies and exported timestamp. This file is private, never a repository fixture. Freeze status; fetch `sync_pull(...,p_compact:true)` through that sequence, then `sync_chunks` until exhausted. Compact requests contain `snapshotHash` instead of `snapshot`. All needed immutable chunks predate that frontier; concurrent extra chunks are harmless. A generation change aborts the export. Chunk nodes are `value:{value}`, `object:{children:{key:hash}}`, `array:{children:[hash]}` or `concat:{children:[hash]}`, selected by `kind`. Reassemble recursively, concatenating only internal array blocks, and validate every original snapshot and reference before import. Detect missing/cyclic/unsupported nodes and reject without mutation. Integration tests independently reassemble this format.

V1/v2 import remains unchanged. A v2 export can represent one selected valid snapshot **only**; label it incomplete if archived/unresolved branches or pending work exist. It is never a substitute for the full sync archive. Full client archive import/export UI and account storage migration remain unimplemented next-task gates.

## Validation evidence

See the PR's frozen candidate and independent verdict. The local suite exercises actual Auth verification/JWTs, PostgREST and PostgreSQL: two accounts, anonymous/forged-owner/JWT attempts, absent table/helper grants, default-deny RLS even with rolled-back test grants, immutable retries/observations, concurrent notes/FSRS, late branches, stale simultaneous resolutions, all-snapshot/compact reconstruction, live account ban/disable, deletion/reconnect and closure with stale JWTs, quota rollback, and growing-history deduplication. `sync:reset` replays the migration from scratch; rerun the suite after reset to prove rebuild behavior. Tests are synthetic; no claim of real GitHub OAuth, browser sync convergence or hosted security certification follows.

The 2026-10-29 initial growth run sent 400 growing snapshots totaling **239,285,951 bytes** and retained **3,018,114 logical bytes** with all original parents present. It also round-tripped a >1 MiB state and 1,057 ordered entries across multiple array-tree levels. Final compact export, all checks and exact versions/results are recorded below before review.

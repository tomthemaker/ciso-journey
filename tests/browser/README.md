# Local authenticated browser checks

`npm run test:browser` requires an already-running isolated loopback Supabase
Auth/Postgres stack with the account-state migration, local mail service, and
these public/test endpoint variables:

- `VITE_SUPABASE_URL`: local API URL; also embedded in the production test build.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: public anonymous/publishable key only.
- `TEST_MAIL_URL`: local Mailpit URL.

The command builds the app and runs desktop/mobile Chromium with two workers.
It does not install, provision, reset or stop a database. CI remains unit/type/build
only. `scripts/sync-local.mjs` provides explicit owner-run local stack lifecycle
commands; its `settings()` helper returns the public key without logging private
CLI status. Reuse a healthy synthetic stack; never reset another task's stack.

`account-fixture.cjs` creates unique fictional email identities using the local
one-time-mail-token flow. The only authentication mock substitutes a successful
provider PKCE exchange with a real verified local Auth session. Live `getUser`,
account ownership checks, versioned RPC reads/writes, CAS and Postgres remain real.
No privileged key is used. This is **not actual GitHub OAuth end-to-end evidence**;
provider credentials and an interactive callback remain an external gate.

Feature tests explicitly simulate a new provider redirect on each `page.goto()`
and `page.reload()`, because session tokens deliberately do not survive a document
reload. The fixture changes provider response expiry metadata only to prevent its
refresh timer from interfering with FSRS clock travel; the genuine signed access
token remains unchanged. Raw sign-in, sign-out, refresh and expiry behavior is
checked separately by `required-account.spec.cjs` and the raw PKCE test. Credentials
stay in Node memory and browser request memory, never learner state or persistent
browser storage. Each test closes only its own synthetic account through the public
owner API. No suite-wide deletion or privileged cleanup exists.

The review harness is built only after the production artifact, receives an
explicit ephemeral account, and is excluded from production/Pages builds. It is
not a product login bypass. Browser traces can contain synthetic session headers;
keep ignored runtime artifacts local and never commit real learner material.

## Replaced obsolete assertions (D046, issues #120 and #23)

No product decision changes here. Existing lesson/resource/question/case/portfolio,
37-task, six-score, backup, literal-text, keyboard/mobile and Pages assertions remain.
A real authenticated v1/v2 file round-trip also covers long observation IDs and
NUL-containing JSON values/keys across reload and download.

| Retired local-only assertion | Required-account replacement |
| --- | --- |
| Anonymous/local profile loads and can study without account configuration | Raw required-account tests block private UI/import/export until verified sign-in; an invalid build configuration also fails closed. PKCE test checks GitHub provider and exact Pages callback. |
| Auth sessions are recovered from localStorage; other tabs mutate that shared session; sign-out/invalid stored sessions offer local fallback | Memory-only Auth, revoked-session/refresh/callback gates in required-account tests, authenticated account isolation/CAS, deliberate sign-out gate and clean persistent-storage assertion. Obsolete browser Auth bytes are retained unused. |
| Startup automatically migrates v1 bytes, including aborted/idempotent migration and malformed-v1 recovery downloads | Legacy localStorage and future IndexedDB bytes remain exact, unused and undeleted through sign-in/edit/sign-out. Explicit authenticated v1 file import retains defaults/extensions and export compatibility. Malformed local bytes do not control server study. |
| IndexedDB quota/transaction abort rolls back task/score/history/reset/feature writes | HTTP503 and network failures keep Postgres/committed UI unchanged; drafts survive Reload progress and retry. Lost acknowledgement separately commits in Postgres but never falsely confirms success in UI. |
| Numeric IndexedDB revision increments and stale-tab errors | Opaque server revision changes and real stale-device CAS rejection for edits/import/reset; Reload progress retrieves the winning account state. |
| Corrupt/future local snapshot is downloaded and blocks defaults | Corrupt/future authenticated server responses block UI/export/import without fabricated defaults or writes; server payload remains unchanged. Explicit backup validation still rejects malformed/future files before confirmation. |
| Editing a historical attempt/case under the same ID is a valid fixture import | Same-ID observation rewrites explicitly fail on the server; separate fictional historical observations use fresh IDs with consistent assessment references, retaining literal/unknown-version/rubric rendering checks. |
| FSRS retries inspect intercepted IndexedDB put payloads and revision +1 | Real Postgres event+schedule equality/deduplication; failed/successful account-save payloads preserve exact event ID/time/rating/schedule across Reload progress, double click and reauthentication. |
| Browser back/forward follows anonymous document refreshes | Every Pages section explicitly reauthenticates after document refresh; within-document authenticated back/forward retains section navigation. |

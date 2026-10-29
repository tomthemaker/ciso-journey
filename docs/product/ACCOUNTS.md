# GitHub accounts: setup and validation

Issue [#120](https://github.com/tomthemaker/ciso-journey/issues/120). Accounts are optional. Anonymous and account profiles are separate browser snapshots; signing in does not copy, enroll or upload either profile. No cloud sync is implemented here. The full normalized API base URL, including port and path, scopes both session storage and account snapshots; the server-verified subject further scopes snapshots. Full exports contain only the selected learner state, not authentication sessions. The original v1 localStorage bytes remain untouched.

## Configuration

Use Node 24 and set only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in an ignored `.env.local` or the build environment. Both are public, embedded in the static build, and must never contain a service-role key or other secret. Rebuild to change them. Without both, local study remains available and sign-in is disabled.

Configure Supabase Auth's redirect allowlist with the exact app base URL, including the trailing slash: for the local Pages rehearsal `http://127.0.0.1:4174/ciso-journey/`; for deployment use the exact deployed origin and `/ciso-journey/` base. Use exact preview URLs only when needed, never a wildcard. The app passes that base to GitHub OAuth and exchanges the PKCE code before routing. Supabase's [PKCE guide](https://supabase.com/docs/guides/auth/sessions/pkce-flow) and [getUser documentation](https://supabase.com/docs/reference/javascript/auth-getuser) describe the code exchange and server verification.

For the isolated stack in #117, configure a GitHub OAuth App with its authorization callback `http://127.0.0.1:27009/auth/v1/callback`; put its client ID and secret in the server-only ignored `.env.oauth.local` using `CISO_GITHUB_CLIENT_ID` and `CISO_GITHUB_CLIENT_SECRET`, following the backend setup. Do not use `VITE_` for those credentials or commit them. The local provider was disabled during implementation because credentials were absent. A hosted setup is separate.

## Checks and limitations

`npm test`, `npm run typecheck`, and `npm run build` are fast checks. With the isolated local stack running, set the two public variables and run `npm run test:browser -- --workers=2`; `tests/accounts.spec.cjs` creates synthetic users through local captured email solely as a test fixture, tests real Supabase sessions and local profile separation, and checks the GitHub PKCE request and failure callback. This does not verify an actual GitHub-provider login. The ordinary browser suite includes the Pages subpath and preservation flows. No browser or database setup is added to CI.

Account verification requires an Auth network request on load. If verification or callback handling fails, learning views stay blocked until reload succeeds; they do not fall back to a previous account. Account snapshots remain on this browser after sign-out; clearing browser storage removes them, so export backups as needed. Sync, device convergence and account deletion are separate work under #23.

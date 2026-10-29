# p2a validation — 2026-10-29

Task [#90](https://github.com/tomthemaker/ciso-journey/issues/90). Tested integrated candidate `af88c665e9ab1ab3ec6208726e58ad2374bc71fa` includes reviewed A02 main `a59132d8a176d2a2273772b01cd7869c12313c4f`; D038 and D040 retained. Source [authorship/inspection evidence](p2a.md) is separate from agent task review and human publication validation.

Pin: `docs/curriculum/drafts/p2a.json`, preceding authored commit `3900ff481694ffd836a87a8306955060d02d9b32`, SHA-256 `e77ec787d6871e1f9e0d1b8fb5a0e02933bb463be806f97cc8223cb405ee38dc`, content version `c06-p2a-draft-2026-10-29.1`, 21 revisions. Source bytes match that commit. The baseline and all fourteen original source artifacts are byte-identical to base `0173c941e557da9637add5d5616c936b7e045989`; their manifest entries, records, actors and editorial arrays remain unchanged. New total: 362 exact revisions, thirteen lessons, 65 questions, 45 cards, sixteen cases. No `src/`, storage, backup, dependency, fixture, configuration or CI changes relative to integrated main.

Node 24.4.1; clean `npm ci` passed. On the integrated candidate:

- `npm test`: 172/172 unit checks plus generated C01 matrix consistency.
- `npm run typecheck`: pass.
- `npm run build`: pass (also run by the local browser command).
- C02 composed candidate versus separately composed original 341-revision delivery, with a synthetic attempt reference to every prior revision: pass. CLI `node scripts/validate-content.mjs <composed362.json> --previous <original341.json> --attempts <synthetic341.json> --as-of 2026-10-29` passed. The generalized provisional-study unit test reproduces full previous-reference validation and exact original record/actor/editorial/hash equality; explicit original fourteen artifact hashes/commits and foundation 12-week/60-question/41-card/15-case guarantees remain enforced while advanced additions are allowed.
- `npm run test:browser -- tests/provisional-study.spec.cjs tests/pages.spec.cjs --grep 'p2a task|built Pages|all section' --workers=2`: 6/6 local Chromium desktop/mobile checks, 23.8 seconds. Covers actual p2a Roadmap/lesson/prerequisite/read/refresh links; both explained MCQs and all three constructed question/model/rubric paths; explicit card enrollment/reveal/rating; five-decision case/save/self-assessment; full synthetic backup export/import; independent legacy completion/scores; Pages subpath assets, refresh and history. No page errors or horizontal overflow. No browser CI or full inherited browser rerun for this content append.
- `git diff --check`: pass.

No real learner/employer data used. Source text inspection and these structural/runtime checks are not independent educator/legal approval or a validated curriculum release. All new editorial records remain AI-authored draft with empty human review arrays. Fresh exact-candidate independent task review, required GitHub checks and merge gates remain required. Any later evidence-only commit may reuse these browser results only after app/content/tests/fixtures/configuration/lockfile equality is confirmed; any runtime change requires updated evidence.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCurriculum, root, validateCurriculum } from './validate-curriculum.mjs';

const data = loadCurriculum();
const errors = validateCurriculum(data);
if (errors.length) throw new Error(errors.join('\n'));
const escape = value => String(value).split('|').join('\\|').split('\n').join(' ');
const objectives = new Map(data.objectives.map(item => [item.id, item]));
const fwAliases = { 'nist-csf-2.0': 'NIST', 'iso27001-2022-amd2024': 'ISO', 'cissp-2024': 'CP', 'cism-2022': 'CM' };
const table = (headers, rows) => [headers, headers.map(() => '---'), ...rows].map(row => `| ${row.map(escape).join(' | ')} |`).join('\n');
const output = [
 '# Curriculum coverage matrix',
 `Generated from [c01.v1.json](../../curriculum/c01.v1.json), version **${data.contentVersion}**. Refs [C01 / #6](${data.issue}). Run \`node scripts/render-curriculum.mjs\` to regenerate; use \`--check\` in validation.`,
 '**Draft curriculum design.** All objectives, assessments and framework alignments are provisional. This document contains plans, not released lessons, authored question banks, validated rubrics or learner results. No independent educator or legal review has occurred. Agent delivery review is a separate procedural gate.',
 '## How to read the mappings',
 data.mappingPolicy.meaning + ' Each task row selects framework targets for its planned objectives collectively; this is not an assertion that every objective covers every selected target. Broad integrated tasks have broader targets and require later objective-level editorial verification. No exhaustive exam syllabus or standard coverage is claimed.',
 'NIST = CSF 2.0 category; ISO = locally named overview theme only; CP = CISSP 2024 exam domain; CM = CISM 2022 job-practice domain. The frameworks use different kinds of outcomes. Certification domains are used as subject alignment, not as a promise of exam preparation. ISO targets are deliberately broad because the full licensed standard was not inspected; the public overview supports an ISMS connection, not technical control or clause completeness.',
 '## Editions and validity',
 table(['Version ID', 'Selected edition / outline', 'Valid from', 'Until (exclusive)', 'Basis / limitation'], data.frameworkVersions.map(f => [f.id, f.label, f.validFrom ?? 'Not verified / no universal date', f.validUntilExclusive ?? 'No expiry identified', f.dateBasis + (f.limitation ? ' ' + f.limitation : '')])),
 '**Transition gate:** CISM must be re-mapped before 2026-11-03 and CISSP before 2027-04-15 to present alignment as current. No replacement-outline mapping is claimed. Historical versions remain usable for provenance after expiry. A null boundary means unknown or inapplicable, never indefinite verified validity.',
 ...data.frameworkVersions.flatMap(f => [`### ${fwAliases[f.id]} targets — ${f.label}`, table(['ID', 'Target / local theme'], Object.entries(f.targets))]),
 '## Domains and preserved competencies',
 table(['Competency ID', 'Legacy category', 'Legacy default (0–4)'], data.competencies.map(c => [c.id, c.legacyName, c.legacyDefault])),
 'These defaults are compatibility metadata, not a current assessment. Runtime self-ratings and user overrides remain untouched. Recognize/Explain/Apply/Lead assessment provenance, question attempts, recall estimates, resource completion and task completion remain separate.',
 table(['Domain', 'Scope', 'Tasks', 'Competencies'], data.domains.map(d => [d.id + ' — ' + d.title, d.scope, data.tasks.filter(t => t.domainIds.includes(d.id)).map(t => t.id).join(', '), d.competencyIds.join(', ')])),
 '## All 37 task mappings',
 'The title and expected output below reproduce the actual legacy roadmap. Objectives extend the planned learning without changing the meaning of completion. Prerequisites guide learning order; they do not retroactively invalidate legacy completions or prevent access. No learner-specific time budget or exam deadline is assumed.',
 table(['Task and original title', 'Original expected output', 'Domains / competencies', 'Framework targets (provisional)', 'Objective IDs / task prerequisites / priority'], data.tasks.map(t => [t.id + ' — ' + t.legacyTitle, t.legacyOutcome, t.domainIds.join(', ') + ' / ' + t.competencyIds.join(', '), t.frameworkMappings.map(m => fwAliases[m.frameworkVersionId] + ': ' + m.targetIds.join(', ')).join('; '), t.objectiveIds.join(', ') + ' / ' + (t.prerequisiteTaskIds.join(', ') || 'Entry; no security study assumed') + ' / ' + t.priority])),
 '## Explicit technical and leadership coverage',
 table(['Topic', 'Planned tasks'], ['secure-software', 'cloud', 'cryptography', 'networking', 'leadership'].map(tag => [tag, data.tasks.filter(t => t.topicTags.includes(tag)).map(t => t.id).join(', ')])),
 'Secure software is introduced through delivery-stage checks in w5 and threat modeling in w6, then revisited in control selection p3b. Cloud responsibilities, cryptographic key ownership and network boundaries are assessed explicitly in w5, w4 and w3. Leadership includes authority, ethical escalation, stakeholder communication and awareness/culture design; attendance alone supplies no evidence.',
 '## Foundation objectives and planned assessments',
 'Weeks 1–4 are the first release priority. Each objective below has a version, explicit prerequisites and assessable evidence. Criteria are proposed review anchors, not calibrated pass scores or validated competency thresholds. Each second objective builds on the first; task dependencies link to the prerequisite task’s final objective. Free-form responses require authored rubrics and examples in later content work.',
 ...data.tasks.filter(t => t.id.startsWith('w')).flatMap(t => [`### ${t.legacyTitle}`, ...t.objectiveIds.flatMap(id => { const o = objectives.get(id); return [`**${o.id} v${o.version}:** ${o.statement}`, `Prerequisites: ${o.prerequisiteObjectiveIds.join(', ') || o.entryRequirement}`, `Planned ${o.assessmentPlan.kind}: **${o.assessmentPlan.artifact}**. Criteria: ${o.assessmentPlan.criteria.join('; ')}.`, '']; })]),
 '## Advanced objective and assessment plans',
 'One observable planning objective per advanced task reserves coverage for R3 authorship. These do not satisfy the advanced lesson publication gate. p6b adds an eligibility-source verification gate before any certification advice.',
 table(['Task / objective', 'Observable objective', 'Planned evidence and criteria'], data.tasks.filter(t => !t.id.startsWith('w')).map(t => { const o = objectives.get(t.objectiveIds[0]); return [t.id + ' / ' + o.id, o.statement, o.assessmentPlan.artifact + ': ' + o.assessmentPlan.criteria.join('; ')]; })),
 '## Swiss and EU scope',
 data.jurisdictionScope.default, data.jurisdictionScope.switzerland, data.jurisdictionScope.eu, data.jurisdictionScope.publicationGate,
 'For p3d, the intended artifact records each instrument, legal entity, territorial/sector nexus, authority, operative dates, applicable national implementation, source version, unresolved question and reviewer. Legal obligations, notification periods, eligibility and AI classifications must be verified during lesson authorship. A Swiss company is not assumed subject to every EU instrument. This matrix does not assign definitive obligations to a learner or employer.',
 '## Sources and verification limits',
 'Official pages were checked on 2026-10-27 using web browsing. A successful page retrieval verifies only the described reference metadata/scope; automated reference checks below validate IDs and official HTTPS hosts, not live availability or substantive educational correctness. Legal entries returned access challenges and were not substantively verified. No standards, exam questions or paid course content are reproduced.',
 table(['Source', 'Publisher / edition', 'Publication date', 'Checked / review due', 'Verification'], data.sources.map(s => [`[${s.id}: ${s.title}](${s.url})`, s.publisher + ' / ' + s.version, s.publicationDate ?? 'Not established', s.checkedAt + ' / ' + s.reviewDueAt, s.verification])),
 '## Release and review handoff',
 'C01 supplies curriculum planning inputs for C02 content contracts and C04/C11 lesson authorship. It does not prescribe their implementation schemas. Before publishing: an educator checks alignment, prerequisites, scope, original teaching and assessment quality; an appropriately qualified legal reviewer verifies relevant Swiss/EU claims. Record real reviewer identity/role/date and reviewed version. Keep AI authorship distinct from independent validation.',
 'When an objective is used in an assessment, retain the version shown. A correction creates a new immutable content version and records its impact; never reinterpret old learner results or automatically change legacy scores/completion. New lessons, sources, cards and questions receive their own identifiers and review provenance in subsequent work.',
 'Open learner preferences remain in [product memory](../product/MEMORY.md): weekly study budget/timeline; industry, organization size, canton and EU exposure; educator/legal reviewer availability; mentor participation; content capacity; and whether certification alignment is a study aid or an actual exam goal.',
 '## Validation commands',
 'Use Node.js 22+ for the test runner (the data scripts also run on the repository’s older Node 14). No app dependency or runtime change is introduced.',
 '```sh\nnode scripts/validate-curriculum.mjs\nnode scripts/render-curriculum.mjs --check\nnode --test tests/curriculum/validation.test.mjs\n```',
 'Validation covers the exact 37 IDs/titles/outcomes, legacy competency metadata, ten-domain and explicit-topic coverage, framework targets and date transitions, source references/official hosts, observable action verbs, assessment criteria, objective ownership and both prerequisite graphs. Mutation tests exercise missing coverage, invented IDs, cycles, invalid references, unsupported clause precision, missing assessment evidence and false review provenance. It does not establish teaching correctness, legal applicability or real learner achievement.'
].join('\n\n') + '\n';
const destination = resolve(root, 'docs/curriculum/COVERAGE.md');
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== output) throw new Error('COVERAGE.md differs from curriculum data; regenerate it');
  console.log('Coverage document matches the versioned curriculum data.');
} else { writeFileSync(destination, output); console.log('Rendered docs/curriculum/COVERAGE.md'); }

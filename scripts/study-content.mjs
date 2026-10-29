import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { composeContent } from '../src/content-catalog.ts';
import { validateContent } from './validate-content.mjs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
export const studyManifest = read('content/provisional-study.manifest.json');
export const studyInputs = [studyManifest.baseline, ...studyManifest.artifacts].map(artifact => ({ artifact, bundle: read(artifact.path) }));
export const studyBundle = composeContent(studyManifest.contentVersion, studyInputs.map(input => input.bundle));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const previous = studyInputs[0].bundle;
  const attempts = previous.records.map((record, index) => ({ id: `synthetic-prior-${index}`, contentRef: { id: record.id, version: record.version } }));
  const errors = validateContent(studyBundle, { previous, attempts });
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Provisional study contract valid: ${studyBundle.records.length} exact revisions. No educator/legal approval claimed.`);
}

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateContent } from './validate-content.mjs';
import study from './study-content.cjs';

export const { studyManifest, studyInputs, studyBundle } = study;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const previous = studyInputs[0].bundle;
  const attempts = previous.records.map((record, index) => ({ id: `synthetic-prior-${index}`, contentRef: { id: record.id, version: record.version } }));
  const errors = validateContent(studyBundle, { previous, attempts });
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Provisional study contract valid: ${studyBundle.records.length} exact revisions. No educator/legal approval claimed.`);
}

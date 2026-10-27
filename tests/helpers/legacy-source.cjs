const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');

// Transitional adapter for the dependency-free, inline app. Execute exact shipped
// declarations, without a DOM/storage stub or a second validator implementation.
// F02 replaces this adapter with direct imports from src/data.ts and src/backup.ts.
const source = readFileSync(join(__dirname, '../../index.html'), 'utf8');
function region(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert(from >= 0 && to > from, `Inline source boundary changed: ${start} … ${end}`);
  return source.slice(from, to);
}
module.exports = new Function(
  region('const phases=', "const KEY=") +
  region('const empty=', ';let state=') + ';\n' +
  region('function validCalendarDate(', 'function node(') +
  'return { phases, taskLearningResources, competencies, resources, empty, validateBackup };'
)();

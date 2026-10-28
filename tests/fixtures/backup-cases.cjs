// Synthetic validation matrix; shared with the browser's representative cases.
const allComplete = require('./v1/all-complete.json');
const bad = mutate => { const backup = structuredClone(allComplete); mutate(backup); return JSON.stringify(backup); };
const malformedInputs = [
  ['truncated JSON', '{truncated'], ['null envelope', 'null'], ['array envelope', '[]'], ['missing envelope fields', '{}'],
  ['wrong app', bad(b => { b.app = 'Other app'; })], ['future version', bad(b => { b.version = 3; })], ['string version', bad(b => { b.version = '1'; })],
  ['null data', bad(b => { b.data = null; })], ['missing completed', bad(b => { delete b.data.completed; })],
  ['null completed', bad(b => { b.data.completed = null; })], ['array completed', bad(b => { b.data.completed = []; })], ['string completion', bad(b => { b.data.completed.w1 = 'true'; })],
  ['null scores', bad(b => { b.data.scores = null; })], ['array scores', bad(b => { b.data.scores = []; })], ['out-of-range score', bad(b => { b.data.scores.Governance = 5; })], ['string score', bad(b => { b.data.scores.Governance = '2'; })], ['fractional score', bad(b => { b.data.scores.Governance = 1.5; })],
  ['object journal', bad(b => { b.data.journal = {}; })], ['null achievements', bad(b => { b.data.achievements = null; })],
  ['null journal entry', bad(b => { b.data.journal[0] = null; })], ['numeric date', bad(b => { b.data.journal[0].date = 123; })], ['unparseable date', bad(b => { b.data.journal[0].date = 'not a date'; })],
  ['object title', bad(b => { b.data.achievements[0].title = {}; })], ['missing body', bad(b => { delete b.data.achievements[0].body; })],
  ['duplicate entry ID', bad(b => { b.data.journal.push(b.data.journal[0]); })]
];
const invalidDates = ['2026-02-30', '2026-02-29', '1900-02-29', '2100-02-29', '2024-02-30', '2026-04-31', '2026-06-31', '2026-09-31', '2026-11-31', '2026-00-10', '2026-13-10', '2026-01-00', '2026-01-32'];
const validDates = ['2024-02-29', '2000-02-29', '2026-04-30', '2026-12-31', '0001-01-01', '10000-02-29'];
module.exports = { malformedInputs, invalidDates, validDates };

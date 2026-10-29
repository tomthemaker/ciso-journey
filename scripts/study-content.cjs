// Node/local-browser adapter; the application uses the same manifest and composer in lesson-data.ts.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { composeContent } = require('../src/content-catalog.ts');
const read = path => JSON.parse(readFileSync(resolve(__dirname, '..', path), 'utf8'));
const studyManifest = read('content/provisional-study.manifest.json');
const studyInputs = [studyManifest.baseline, ...studyManifest.artifacts].map(artifact => ({ artifact, bundle: read(artifact.path) }));
const studyBundle = composeContent(studyManifest.contentVersion, studyInputs.map(input => input.bundle));
module.exports = { studyManifest, studyInputs, studyBundle };

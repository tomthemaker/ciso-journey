const { test, expect } = require('@playwright/test');
const { studyBundle: bundle } = require('../scripts/study-content.cjs');
const mixed = require('./fixtures/v1/mixed-progress.json');
const scenario = bundle.records.find(r => r.kind === 'scenario' && r.version === 2);
const rubric = bundle.records.find(r => r.id === scenario.payload.rubricRef.id && r.version === 2);
const route = './#cases/' + scenario.id + '/2';
const ready = page => expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
async function snapshot(page) {
  await ready(page);
  return page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('ciso-journey', 1);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('snapshots'), read = tx.objectStore('snapshots').get('current');
      tx.oncomplete = () => { db.close(); resolve(read.result); };
    };
  }));
}
async function fill(page) {
  for (const name of ['impact', 'options', 'accountableOwner', 'recommendation', 'residualRisk']) await page.locator('#case-' + name).fill('Synthetic ' + name + ' <img src=x onerror=globalThis.syntheticUnsafe=1>');
  await page.getByLabel('Evidence title', { exact: true }).fill('Synthetic private exercise');
  await page.getByLabel('Private evidence link (optional HTTPS)', { exact: true }).fill('https://example.test/private-evidence');
  await page.getByLabel('Private evidence notes and limitations', { exact: true }).fill('<script>globalThis.syntheticUnsafe=1</script> Synthetic notes');
}
async function importBackup(page, backup) {
  const accept = d => d.accept(); page.on('dialog', accept);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-cases.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue(''); page.off('dialog', accept);
}
test('executive case, worked tradeoffs, keyboard response and rubric stay distinct and round-trip privately on Pages', async ({ page }) => {
  await page.addInitScript(v => localStorage.setItem('ciso-journey-v1', v), JSON.stringify(mixed.data));
  await page.goto(route); const original = await snapshot(page);
  await expect(page.locator('#cases')).toBeVisible();
  await expect(page.locator('.case-body')).toContainText('Status: draft');
  await expect(page.locator('.case-body')).toContainText('No independent educator or legal approval');
  await page.getByText('Complete worked response · ' + scenario.id + '@2', { exact: true }).click();
  await expect(page.locator('.case-example')).toContainText(scenario.payload.annotatedExample);
  await expect(page.locator('.case-body')).toContainText('Recognize:'); await expect(page.locator('.case-body')).toContainText('Lead:');
  await fill(page);
  await page.locator('#saveCaseResponse').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#caseHistoryHeading')).toBeFocused();
  await expect(page.locator('.case-result')).toHaveCount(1);
  await expect(page.locator('.case-result').first()).toContainText('Independent review: none recorded');
  const beforeAssessment = await snapshot(page), first = beforeAssessment.data.scenarioResponses.responses[0];
  expect(first.contentRef).toEqual({ id: scenario.id, version: 2 }); expect(first.rubricRef).toEqual(scenario.payload.rubricRef);
  expect(beforeAssessment.data.scenarioResponses.selfAssessments).toHaveLength(0);
  const form = page.getByRole('form', { name: 'Self-assess case response 1' });
  for (const criterion of rubric.payload.criteria) await form.getByLabel(criterion.description, { exact: true }).selectOption('4');
  await form.getByRole('button', { name: 'Save case self-assessment' }).click(); await ready(page);
  await expect(page.locator('.case-result')).toContainText('Learner-selected anchors; no independent review');
  const assessed = await snapshot(page);
  expect(assessed.data.scenarioResponses.responses[0]).toEqual(first);
  expect(assessed.data.scenarioResponses.selfAssessments[0].provenance).toBe('self-assessment');
  const { scenarioResponses, ...rest } = assessed.data; expect(rest).toEqual(original.data);
  await fill(page); await page.locator('#saveCaseResponse').dblclick();
  await expect(page.locator('.case-result')).toHaveCount(2);
  const saved = await snapshot(page);
  const downloadPromise = page.waitForEvent('download'); await page.locator('#exportBtn').click();
  const download = await downloadPromise; const fs = require('node:fs/promises');
  const exported = JSON.parse(await fs.readFile(await download.path(), 'utf8')); expect(exported.data).toEqual(saved.data);
  await importBackup(page, exported); await page.reload(); await ready(page);
  expect((await snapshot(page)).data).toEqual(saved.data);
  await expect(page.locator('.case-result').first().getByRole('link', { name: 'Open private evidence reference' })).toHaveAttribute('href', 'https://example.test/private-evidence');
  await expect(page.locator('#caseBank img, #caseBank script, #caseBank iframe')).toHaveCount(0);
  expect(await page.evaluate(() => window.syntheticUnsafe)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('failed response and assessment writes keep drafts and committed history; unsafe/future imports do not replace it', async ({ page }) => {
  await page.goto(route); const original = await snapshot(page); await fill(page);
  await page.evaluate(() => {
    window.syntheticPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) { const r = window.syntheticPut.apply(this, args); r.addEventListener('success', () => this.transaction.abort()); return r; };
  });
  await page.locator('#saveCaseResponse').click();
  await expect(page.locator('#storageStatus')).toContainText('No progress was replaced');
  await expect(page.locator('#case-impact')).toHaveValue('Synthetic impact <img src=x onerror=globalThis.syntheticUnsafe=1>');
  await expect(page.locator('.case-result')).toHaveCount(0); expect((await snapshot(page)).data).toEqual(original.data);
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.syntheticPut; });
  await page.locator('#saveCaseResponse').click(); await expect(page.locator('.case-result')).toHaveCount(1);
  const form = page.getByRole('form', { name: 'Self-assess case response 1' });
  for (const criterion of rubric.payload.criteria) await form.getByLabel(criterion.description, { exact: true }).selectOption('2');
  await page.evaluate(() => { IDBObjectStore.prototype.put = function (...args) { const r = window.syntheticPut.apply(this, args); r.addEventListener('success', () => this.transaction.abort()); return r; }; });
  await form.getByRole('button', { name: 'Save case self-assessment' }).click(); await ready(page);
  for (const criterion of rubric.payload.criteria) await expect(form.getByLabel(criterion.description, { exact: true })).toHaveValue('2');
  expect((await snapshot(page)).data.scenarioResponses.selfAssessments).toHaveLength(0);
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.syntheticPut; });
  await form.getByRole('button', { name: 'Save case self-assessment' }).click(); await ready(page);
  const saved = await snapshot(page);
  for (const alter of [p => p.schemaVersion = 99, p => p.responses[0].response.evidence.url = 'javascript:alert(1)']) {
    const backup = { ...mixed, version: 2, data: structuredClone(saved.data) }; alter(backup.data.scenarioResponses);
    await importBackup(page, backup); expect((await snapshot(page)).data).toEqual(saved.data);
    await expect(page.locator('#storageStatus')).toContainText('Invalid or unsupported executive case responses');
  }
});
test('unknown and incompatible historical scenario/rubric refs survive import/reload and never borrow current feedback', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(route); await fill(page); await page.locator('#saveCaseResponse').click();
  const saved = await snapshot(page);
  for (const ref of [{ id: 'source-csf', version: 1 }, { id: 'rubric-unavailable', version: 8 }]) {
    const backup = { ...mixed, version: 2, data: structuredClone(saved.data) };
    backup.data.scenarioResponses.responses[0].rubricRef = ref;
    await importBackup(page, backup); await page.reload(); await ready(page);
    await expect(page.locator('.case-result')).toContainText('is unavailable or incompatible');
    await expect(page.getByRole('button', { name: 'Save case self-assessment' })).toHaveCount(0);
    expect((await snapshot(page)).data).toEqual(backup.data);
  }
  const backup = { ...mixed, version: 2, data: structuredClone(saved.data) };
  backup.data.scenarioResponses.responses[0].contentRef = { id: 'scenario-unavailable', version: 7 };
  await importBackup(page, backup); await page.getByRole('link', { name: 'scenario-unavailable@7', exact: true }).click();
  await page.reload(); await ready(page);
  await expect(page.locator('#caseHeading')).toHaveText('Case revision unavailable');
  await expect(page.locator('.case-result')).toContainText('worked feedback is unavailable');
  await expect(page.locator('.case-example')).toHaveCount(0);
  expect((await snapshot(page)).data).toEqual(backup.data); expect(errors).toEqual([]);
});
test('legacy lesson case links keep v1 exact and offer the current case revision', async ({ page }) => {
  const lesson = bundle.records.find(r => r.kind === 'lesson' && r.payload.practiceRefs.some(ref => ref.id === scenario.id));
  await page.goto('./#lessons/' + lesson.id + '/1'); await ready(page);
  const details = page.locator('.lesson-body details').filter({ has: page.locator('a[href^="#cases/"]') });
  await details.locator('summary').click(); await details.getByRole('link', { name: 'Attempt this executive case' }).click();
  await expect(page.locator('#caseHeading')).toBeFocused(); expect(page.url()).toContain('/scenario-foundation-decision/1');
  await expect(page.locator('.case-body')).toContainText('rubric-foundation-case@1');
  await page.getByRole('link', { name: 'Optional newer case revision v3', exact: false }).click();
  await expect(page.locator('.case-body')).toContainText('rubric-foundation-case@3');
});


test('current lesson links the revised case and rubric without changing the historical route', async ({ page }) => {
  const lesson = bundle.records.find(r => r.kind === 'lesson' && r.version === 2 && r.payload.practiceRefs.some(ref => ref.id === scenario.id));
  await page.goto('./#lessons/' + lesson.id + '/' + lesson.version); await ready(page);
  const details = page.locator('.lesson-body details').filter({ has: page.locator('a[href^="#cases/"]') });
  await details.locator('summary').click(); await details.getByRole('link', { name: 'Attempt this executive case' }).click();
  await expect(page).toHaveURL(/#cases\/scenario-foundation-decision\/3$/);
  await expect(page.locator('.case-body')).toContainText('rubric-foundation-case@3');
});

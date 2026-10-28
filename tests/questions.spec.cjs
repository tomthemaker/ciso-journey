const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const bundle = require('../content/foundation.v1.json');
const mixed = require('./fixtures/v1/mixed-progress.json');
const questions = bundle.records.filter(r => r.kind === 'question');
const mcq = questions.find(r => r.payload.format === 'mcq');
const route = q => './#questions/' + q.id + '/' + q.version;
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
async function importBackup(page, backup) {
  const accept = dialog => dialog.accept(); page.on('dialog', accept);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-questions.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue(''); page.off('dialog', accept);
}

test('MCQ feedback waits for a committed answer; keyboard retries preserve history and legacy state on Pages', async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem('ciso-journey-v1', value), JSON.stringify(mixed.data));
  await page.goto(route(mcq));
  const original = await snapshot(page);
  await expect(page.locator('#questions')).toBeVisible();
  await expect(page.locator('#questionHeading')).toHaveText(mcq.title);
  await expect(page.locator('.question-body')).toContainText('Status: draft');
  await expect(page.locator('.question-body')).toContainText('No independent educator or legal approval');
  await expect(page.locator('.option-feedback')).toHaveCount(0);
  await page.locator('#submitAttempt').click();
  expect((await snapshot(page)).data.questionAttempts).toBeUndefined();
  const wrong = mcq.payload.options.find(o => o.id !== mcq.payload.correctOptionId);
  await page.locator('#answer-' + wrong.id).focus(); await page.keyboard.press('Space');
  await page.locator('#submitAttempt').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#attemptHistoryHeading')).toBeFocused();
  await expect(page.locator('.attempt-result').first()).toContainText('Different from the keyed answer');
  for (const option of mcq.payload.options) await expect(page.locator('.option-feedback').first()).toContainText(option.explanation);
  await page.locator('#answer-' + mcq.payload.correctOptionId).check();
  await page.locator('#submitAttempt').dblclick();
  await expect(page.locator('.attempt-result')).toHaveCount(2);
  const saved = await snapshot(page), { questionAttempts, ...rest } = saved.data;
  expect(rest).toEqual(original.data);
  expect(questionAttempts.attempts.map(a => a.correct)).toEqual([false, true]);
  expect(questionAttempts.attempts[0].contentRef).toEqual({ id: mcq.id, version: mcq.version });
  expect(await page.evaluate(() => localStorage.getItem('ciso-journey-v1'))).toBe(JSON.stringify(mixed.data));
  await page.reload();
  await expect(page.locator('.attempt-result')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const backup = JSON.parse(await fs.readFile(await (await downloadEvent).path(), 'utf8'));
  await importBackup(page, { ...mixed, version: 1 });
  await expect(page.locator('.attempt-result')).toHaveCount(0);
  await importBackup(page, backup);
  expect((await snapshot(page)).data).toEqual(saved.data);
  backup.data.questionAttempts.schemaVersion = 99;
  await importBackup(page, backup);
  await expect(page.locator('#storageStatus')).toContainText('unsupported question attempts');
  expect((await snapshot(page)).data).toEqual(saved.data);
});

test('open/scenario use scoped rubrics, delayed examples and explicit self-assessment without automatic grading', async ({ page }) => {
  for (const format of ['open', 'scenario']) {
    const question = questions.find(r => r.payload.format === format);
    const rubric = bundle.records.find(r => r.id === question.payload.rubricRef.id);
    await page.goto(route(question)); await ready(page);
    await expect(page.getByRole('heading', { name: 'Annotated example', exact: true })).toHaveCount(0);
    for (const criterion of rubric.payload.criteria) await expect(page.locator('.question-body')).toContainText(criterion.description);
    const marker = '<img src=x onerror=globalThis.syntheticUnsafe=1>';
    await page.locator('#questionResponse').fill(marker + ' Fictional answer; independent reasoning.');
    await page.locator('#submitAttempt').click();
    await expect(page.getByRole('heading', { name: 'Annotated example', exact: true })).toBeVisible();
    await expect(page.locator('.attempt-result').first()).toContainText(question.payload.annotatedExample);
    let saved = await snapshot(page), attempt = saved.data.questionAttempts.attempts.at(-1);
    expect(attempt.correct).toBeNull(); expect(attempt.provenance).toBe('unassessed-response');
    const before = structuredClone(saved.data.questionAttempts.attempts);
    expect(saved.data.questionAttempts.selfAssessments).toHaveLength(format === 'open' ? 0 : 1);
    const form = page.getByRole('form', { name: 'Self-assess attempt 1' });
    for (const criterion of rubric.payload.criteria) await form.getByLabel(criterion.description, { exact: true }).selectOption(String(criterion.levels.at(-1).score));
    await form.getByRole('button', { name: 'Save rubric self-assessment' }).click();
    await ready(page);
    saved = await snapshot(page);
    expect(saved.data.questionAttempts.attempts).toEqual(before);
    expect(saved.data.questionAttempts.selfAssessments.at(-1).provenance).toBe('self-assessment');
    await expect(page.locator('.attempt-result').first()).toContainText('no independent review or applied mastery');
    await expect(page.locator('#questionBank img, #questionBank script, #questionBank iframe')).toHaveCount(0);
    expect(await page.evaluate(() => window.syntheticUnsafe)).toBeUndefined();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('aborted writes keep drafts and hide feedback until retry commits; imported history stays literal and version-pinned', async ({ page }) => {
  const question = questions.find(r => r.payload.format === 'open');
  await page.goto(route(question));
  const original = await snapshot(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    window.syntheticPut = put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args);
      request.addEventListener('success', () => this.transaction.abort()); return request;
    };
  });
  await page.locator('#questionResponse').fill('Synthetic retained draft with a risk chain.');
  await page.locator('#submitAttempt').click();
  await expect(page.locator('#storageStatus')).toContainText('No progress was replaced');
  await expect(page.locator('#questionResponse')).toHaveValue('Synthetic retained draft with a risk chain.');
  await expect(page.getByRole('heading', { name: 'Annotated example', exact: true })).toHaveCount(0);
  expect((await snapshot(page)).data).toEqual(original.data);
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.syntheticPut; });
  await page.locator('#submitAttempt').click();
  await expect(page.locator('.attempt-result')).toHaveCount(1);
  const saved = await snapshot(page), backup = { ...mixed, version: 2, data: saved.data };
  backup.data.questionAttempts.attempts[0].response = '<img src=x onerror=globalThis.syntheticUnsafe=1>';
  backup.data.questionAttempts.attempts[0].contentRef.version = 12;
  await importBackup(page, backup);
  await expect(page.locator('.attempt-result')).toContainText('exact question revision is unavailable');
  await expect(page.getByRole('heading', { name: 'Annotated example', exact: true })).toHaveCount(0);
  await expect(page.locator('#questionBank img')).toHaveCount(0);
  await expect(page.locator('.attempt-result')).toContainText('<img src=x');
  await page.goto('./#questions/question-unavailable/12');
  await expect(page.locator('#questionHeading')).toHaveText('Revision unavailable');
  await page.goto('./#lessons/' + bundle.records.find(r => r.kind === 'lesson').id + '/1');
  const link = page.getByRole('link', { name: 'Attempt this question' }).first();
  await page.locator('.lesson-body details summary').first().click();
  await link.click();
  await expect(page.locator('#questionHeading')).toBeFocused();
});

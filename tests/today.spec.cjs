const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const bundle = require('../content/foundation.v1.json');
const cards = bundle.records.filter(r => r.kind === 'card');
const first = cards[0];
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
async function deck(page) {
  const details = page.locator('#todayDeck');
  if (!await details.evaluate(el => el.open)) await details.locator('summary').click();
}
async function enroll(page, all = true) {
  await deck(page);
  await page.locator(all ? '#todayEnrollAll' : '#enroll-' + first.id + '-1').click(); await ready(page);
}
async function cap(page, limit) {
  await deck(page); await page.locator('#todayCap').fill(String(limit));
  await page.getByRole('button', { name: 'Save new-card limit', exact: true }).click(); await ready(page);
}
async function exported(page) {
  const download = page.waitForEvent('download'); await page.locator('#exportBtn').click();
  return JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
}
async function imported(page, backup) {
  const accept = d => d.accept(); page.on('dialog', accept);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-today.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue(''); page.off('dialog', accept);
}
test('Today connects original reading, question and case; keyboard review and all five namespaces survive restart/export/import', async ({ page }) => {
  await page.goto('./#today'); await ready(page);
  const original = await snapshot(page);
  await expect(page.locator('#todayPrompt')).toHaveCount(0); // Enrollment is explicit.
  await enroll(page); await cap(page, 1);
  await expect(page.locator('#todayQueue')).toContainText('0 due or overdue reviews before 1 allowed new cards');
  await expect(page.locator('#todayTime')).toContainText('planning assumptions');
  await expect(page.locator('#todayAnswer, #todayRateAgain, #todayRateHard, #todayRateGood, #todayRateEasy')).toHaveCount(0);
  await page.locator('#todayStudy').getByRole('link', { name: /^Original lesson:/ }).click();
  await page.locator('#readingComplete').click(); await ready(page);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.locator('#todayStudy').getByRole('link', { name: /^Related question:/ }).click();
  await page.locator('input[name="answer"]').first().check();
  await page.locator('#submitAttempt').click(); await ready(page);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.locator('#todayStudy').getByRole('link', { name: /^Optional executive case:/ }).click();
  for (const key of ['impact', 'options', 'accountableOwner', 'recommendation', 'residualRisk']) await page.locator('#case-' + key).fill('Synthetic daily loop ' + key);
  await page.getByLabel('Evidence title', { exact: true }).fill('Synthetic daily practice');
  await page.locator('#saveCaseResponse').click(); await ready(page);
  const form = page.getByRole('form', { name: 'Self-assess case response 1' });
  for (const select of await form.locator('select').all()) await select.selectOption('1');
  await form.getByRole('button', { name: 'Save case self-assessment' }).click(); await ready(page);
  await page.getByRole('button', { name: 'Roadmap', exact: true }).click();
  await page.locator('#w1-resources > summary').click();
  const resource = page.locator('[data-resource-id="w1-official"]');
  await resource.getByLabel('Resource status', { exact: true }).selectOption('completed');
  await resource.getByLabel('Completion date').fill('2026-10-28');
  await resource.getByRole('button', { name: 'Save resource progress' }).click(); await ready(page);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
  await page.locator('#todayReveal').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#todayAnswer')).toBeFocused();
  await expect(page.locator('#todayAnswer')).toHaveText(first.payload.answer);
  await page.locator('#todayRateGood').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#todayMessage')).toContainText('Good saved');
  await expect(page.locator('#todayQueueHeading')).toBeFocused();
  await expect(page.locator('#todaySignals')).toContainText('Reading: 1/4');
  await expect(page.locator('#todaySignals')).toContainText('Resources: 1 marked completed');
  await expect(page.locator('#todaySignals')).toContainText('Tasks: 0/37');
  await expect(page.locator('#todaySignals')).toContainText('Recall: 1 saved ratings');
  await expect(page.locator('#todaySignals')).toContainText('Questions: 1 attempts');
  await expect(page.locator('#todaySignals')).toContainText('Applied assessment: 1 case responses; 1 case rubric self-assessments');
  const saved = await snapshot(page);
  expect(saved.data.completed).toEqual(original.data.completed); expect(saved.data.scores).toEqual(original.data.scores);
  const backup = await exported(page); expect(backup.data).toEqual(saved.data);
  await page.reload(); await ready(page); expect((await snapshot(page)).data).toEqual(saved.data);
  await cap(page, 0); await imported(page, backup); await page.reload(); await ready(page);
  expect((await snapshot(page)).data).toEqual(saved.data);
  await expect(page.locator('#todayQueue')).toContainText('0 allowed new cards');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('failed rating retains revealed prompt; retry and duplicate clicks commit a single immutable answer', async ({ page }) => {
  await page.goto('./#today'); await ready(page); await enroll(page, false);
  const before = await snapshot(page);
  await page.locator('#todayReveal').click();
  await page.evaluate(() => {
    window.todayPut = IDBObjectStore.prototype.put;
    window.abortToday = true;
    IDBObjectStore.prototype.put = function (...args) { const request = window.todayPut.apply(this, args); request.addEventListener('success', () => { if (window.abortToday) this.transaction.abort(); }); return request; };
  });
  await page.locator('#todayRateHard').click();
  await expect(page.locator('#todayMessage')).toContainText('Review not saved');
  await expect(page.locator('#todayAnswer')).toHaveText(first.payload.answer);
  await expect(page.locator('#todayRateHard')).toBeEnabled();
  for (const rating of ['Again', 'Good', 'Easy']) await expect(page.locator('#todayRate' + rating)).toBeDisabled();
  expect(await snapshot(page)).toEqual(before);
  await page.evaluate(() => { window.abortToday = false; document.querySelector('#todayRateHard').click(); document.querySelector('#todayRateHard').click(); });
  await expect(page.locator('#todayMessage')).toContainText('Hard saved');
  const saved = await snapshot(page);
  expect(saved.data.reviewProgress.events).toHaveLength(1);
  expect(saved.data.reviewProgress.events[0].rating).toBe('Hard');
  expect(saved.data.reviewProgress.cards[0].schedule).toEqual(saved.data.reviewProgress.events[0].after);
  expect(saved.revision).toBe(before.revision + 1);
  await page.reload(); await ready(page);
  expect((await snapshot(page)).data).toEqual(saved.data);
  await expect(page.locator('#todayAnswer')).toHaveCount(0);
});
test('missed days retain overdue priority at zero cap; suspend/archive/restore retain schedules and exact history', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T08:00:00.000Z') });
  await page.goto('./#today'); await ready(page); await enroll(page); await cap(page, 1);
  await page.locator('#todayReveal').click(); await page.locator('#todayRateAgain').click();
  await expect(page.locator('#todayMessage')).toContainText('Again saved');
  await cap(page, 0);
  await page.clock.setSystemTime(new Date('2026-11-07T08:00:00.000Z'));
  await page.reload(); await ready(page);
  await expect(page.locator('#todayQueue')).toContainText('1 due or overdue reviews before 0 allowed new cards');
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
  const before = await snapshot(page); await deck(page);
  await page.locator('#suspended-' + first.id + '-1').click(); await ready(page);
  await expect(page.locator('#todayPrompt')).toHaveCount(0);
  await deck(page); await page.locator('#archived-' + first.id + '-1').click(); await ready(page);
  await page.locator('#active-' + first.id + '-1').click(); await ready(page);
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
  const restored = await snapshot(page);
  expect(restored.data.reviewProgress.cards).toEqual(before.data.reviewProgress.cards);
  expect(restored.data.reviewProgress.events).toEqual(before.data.reviewProgress.events);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('daily cap refreshes at local midnight and newly due reviews appear without reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00.000Z') });
  await page.goto('./#today'); await ready(page); await enroll(page); await cap(page, 1);
  await page.locator('#todayReveal').click(); await page.locator('#todayRateAgain').click();
  await expect(page.locator('#todayQueue')).toContainText('0 allowed new cards');
  await page.clock.fastForward(61000);
  await page.locator('#todayRefresh').click();
  await expect(page.locator('#todayQueue')).toContainText('1 due or overdue reviews before 0 allowed new cards');
  // Jump past every timezone's next local midnight, then manually refresh (also available to keyboard users).
  await page.clock.setSystemTime(new Date('2026-10-30T12:00:00.000Z'));
  await page.locator('#todayRefresh').click();
  await expect(page.locator('#todayQueue')).toContainText('1 due or overdue reviews before 1 allowed new cards');
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
});

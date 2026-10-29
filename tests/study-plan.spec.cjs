const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const { studyBundle: bundle } = require('../scripts/study-content.cjs');
const ready = page => expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
async function snapshot(page) {
  await ready(page);
  return page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('ciso-journey', 1);
    request.onsuccess = () => { const db = request.result, tx = db.transaction('snapshots'), read = tx.objectStore('snapshots').get('current'); tx.oncomplete = () => { db.close(); resolve(read.result); }; };
  }));
}
async function settings(page) {
  if (!await page.locator('#todayStudySettings').evaluate(el => el.open)) await page.locator('#todayStudySettings > summary').click();
}
async function exported(page) {
  const download = page.waitForEvent('download'); await page.locator('#exportBtn').click();
  return JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
}

test('study goals, budget and explicit prerequisite override persist through reload and v2/v1 import without changing learning signals', async ({ page }) => {
  await page.goto('./#today'); await ready(page);
  await expect(page.locator('#todaySuggested')).toContainText('Week 1');
  await expect(page.locator('#todayReasons')).toContainText('roadmap order');
  const before = await snapshot(page);
  const w4 = bundle.records.filter(r => r.kind === 'lesson' && r.taskIds.includes('w4')).at(-1);
  await settings(page);
  await page.locator('#todayMinutes').fill('2'); await page.locator('#todayGoals').selectOption(['w2', 'w4']);
  await page.locator('#todayStudyChoice').selectOption(`${w4.id}@${w4.version}`);
  await page.locator('#todaySaveStudy').click(); await ready(page);
  await expect(page.locator('#todaySuggested')).toContainText('Your choice:');
  await expect(page.locator('#todayReasons')).toContainText('Unread exact prerequisite');
  await expect(page.locator('#todayPersonalized')).toContainText('exceeds the remaining budget');
  const saved = await snapshot(page);
  expect(saved.data.studyPreferences.dailyMinutes).toBe(2);
  const withoutPreferences = ({ studyPreferences, ...rest }) => rest;
  expect(withoutPreferences(saved.data)).toEqual(before.data);
  await page.reload(); await ready(page);
  await expect(page.locator('#todaySuggested')).toContainText(w4.title);
  const backup = await exported(page);
  for (const version of [2, 1]) {
    await settings(page); await page.locator('#todayStudyChoice').selectOption(''); await page.locator('#todaySaveStudy').click(); await ready(page);
    await expect(page.locator('#todayNoSuggestion')).toContainText('No full automatic activity');
    const accept = d => d.accept(); page.on('dialog', accept);
    await page.locator('#importFile').setInputFiles({ name: 'synthetic-study.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...backup, version })) });
    await expect(page.locator('#importFile')).toHaveValue(''); page.off('dialog', accept);
    await ready(page); await page.reload(); await ready(page);
    expect((await snapshot(page)).data).toEqual(saved.data);
    await expect(page.locator('#todaySuggested')).toContainText('Your choice:');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('failed preference transaction preserves committed state and form draft; keyboard retry saves once', async ({ page }) => {
  await page.goto('./#today'); await ready(page); const before = await snapshot(page);
  await settings(page); await page.locator('#todayMinutes').fill('7'); await page.locator('#todayGoals').selectOption(['p6e']);
  await page.evaluate(() => {
    window.studyPut = IDBObjectStore.prototype.put; window.studyAbort = true;
    IDBObjectStore.prototype.put = function (...args) { const request = window.studyPut.apply(this, args); request.addEventListener('success', () => { if (window.studyAbort) this.transaction.abort(); }); return request; };
  });
  await page.locator('#todaySaveStudy').click(); await ready(page);
  await expect(page.locator('#todayMessage')).toContainText('Save failed');
  expect(await snapshot(page)).toEqual(before);
  await expect(page.locator('#todayMinutes')).toHaveValue('7');
  await expect(page.locator('#todayGoals')).toHaveValues(['p6e']);
  await page.evaluate(() => { window.studyAbort = false; });
  await page.locator('#todaySaveStudy').focus(); await page.keyboard.press('Enter'); await ready(page);
  const saved = await snapshot(page);
  expect(saved.revision).toBe(before.revision + 1); expect(saved.data.studyPreferences.goalTaskIds).toEqual(['p6e']);
  await page.reload(); await ready(page); await settings(page);
  await expect(page.locator('#todayMinutes')).toHaveValue('7');
});

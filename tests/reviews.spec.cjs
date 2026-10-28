const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const mixed = require('./fixtures/v1/mixed-progress.json');
const now = '2026-10-28T08:00:00.000Z';
const ref = { id: 'card-browser-synthetic', version: 1 };
const answer = { eventId: 'browser-event', contentRef: ref, rating: 'Good', now, timeZone: 'Europe/Zurich' };
async function open(page) {
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
  await page.evaluate(async () => { const module = await import('./__review-harness.js'); window.reviews = await module.openReviews(); });
}
async function snapshot(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('ciso-journey', 1);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('snapshots');
      const request = tx.objectStore('snapshots').get('current');
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
}
async function exported(page) {
  const pending = page.waitForEvent('download'); await page.locator('#exportBtn').click();
  return JSON.parse(await fs.readFile(await (await pending).path(), 'utf8'));
}
async function imported(page, backup) {
  const dialogs = [];
  const accept = async dialog => { dialogs.push(dialog.message()); await dialog.accept(); };
  page.on('dialog', accept);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-review.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue(''); page.off('dialog', accept);
  return dialogs;
}
test('actual IndexedDB atomically commits event+schedule, aborts both, and deduplicates across refresh', async ({ page }) => {
  await page.addInitScript(data => localStorage.setItem('ciso-journey-v1', JSON.stringify(data)), mixed.data);
  await open(page);
  expect(await page.evaluate(({ ref, now }) => window.reviews.enroll(ref, now), { ref, now })).toBe(true);
  const before = await snapshot(page);
  await page.evaluate(() => {
    window.abortReviewWrites = true;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args);
      request.addEventListener('success', () => { if (window.abortReviewWrites) this.transaction.abort(); });
      return request;
    };
  });
  const failed = await page.evaluate(async answer => Promise.all([window.reviews.submit(answer), window.reviews.submit(answer)]), answer);
  expect(failed).toEqual([false, false]); expect(await snapshot(page)).toEqual(before);
  expect(await page.evaluate(() => window.reviews.state())).toEqual(before.data);
  expect(await page.evaluate(() => window.reviews.error())).toContain('aborted');
  await page.evaluate(() => { window.abortReviewWrites = false; });
  const success = await page.evaluate(async answer => Promise.all([window.reviews.submit(answer), window.reviews.submit(answer)]), answer);
  expect(success).toEqual([true, true]);
  const committed = await snapshot(page);
  expect(committed.revision).toBe(before.revision + 1);
  expect(committed.data.reviewProgress.events).toHaveLength(1);
  expect(committed.data.reviewProgress.cards[0].schedule).toEqual(committed.data.reviewProgress.events[0].after);
  expect(committed.data.completed).toEqual(mixed.data.completed); expect(committed.data.scores).toEqual(mixed.data.scores);
  await open(page);
  expect(await page.evaluate(answer => window.reviews.submit(answer), answer)).toBe(true);
  const refreshed = await snapshot(page);
  expect(refreshed.data).toEqual(committed.data);
  expect(await page.evaluate(() => window.reviews.queue('2026-10-29T00:00:00.000Z', 'Europe/Zurich').due.length)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('ciso-journey-v1'))).toBe(JSON.stringify(mixed.data));
});
test('full review backup restores schedules/history and rejects invalid imports without replacing learner state', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(({ ref, now }) => window.reviews.enroll(ref, now), { ref, now })).toBe(true);
  expect(await page.evaluate(answer => window.reviews.submit(answer), answer)).toBe(true);
  await page.reload(); await expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
  const backup = await exported(page);
  backup.data.readingProgress = { schemaVersion: 1, entries: [{ contentRef: { id: 'lesson-synthetic', version: 1 }, completed: true }] };
  backup.data.syntheticOtherFeature = { values: ['preserved'] };
  expect((await imported(page, backup)).at(-1)).toContain('successfully');
  const original = await snapshot(page);
  for (const bad of [
    { ...backup, data: { ...backup.data, reviewProgress: { ...backup.data.reviewProgress, schemaVersion: 99 } } },
    (() => { const b = structuredClone(backup); b.data.reviewProgress.events[0].after.reps = 100; return b; })(),
  ]) {
    expect((await imported(page, bad)).at(-1)).toContain('review progress');
    expect(await snapshot(page)).toEqual(original);
    expect((await exported(page)).data).toEqual(backup.data);
  }
  expect((await imported(page, { ...backup, data: mixed.data })).at(-1)).toContain('successfully');
  expect((await imported(page, backup)).at(-1)).toContain('successfully');
  await open(page);
  expect(await page.evaluate(() => window.reviews.state())).toEqual(backup.data);
  expect((await exported(page)).data).toEqual(backup.data);
});
test('array-valued card status rejects before confirmation and preserves the full snapshot and due queue after reload', async ({ page }) => {
  await page.addInitScript(data => localStorage.setItem('ciso-journey-v1', JSON.stringify(data)), mixed.data);
  await open(page);
  expect(await page.evaluate(({ ref, now }) => window.reviews.enroll(ref, now), { ref, now })).toBe(true);
  expect(await page.evaluate(answer => window.reviews.submit(answer), answer)).toBe(true);
  await open(page);
  const before = await snapshot(page);
  const backup = await exported(page);
  const legacyBytes = await page.evaluate(() => localStorage.getItem('ciso-journey-v1'));
  const queue = () => page.evaluate(() => window.reviews.queue('2026-10-29T00:00:00.000Z', 'Europe/Zurich'));
  const beforeQueue = await queue();
  expect(beforeQueue.due).toHaveLength(1);
  const malformed = structuredClone(backup);
  malformed.data.reviewProgress.cards[0].status = ['active'];
  const dialogs = await imported(page, malformed);
  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain('review progress');
  expect(await snapshot(page)).toEqual(before);
  expect((await exported(page)).data).toEqual(before.data);
  await open(page);
  expect(await snapshot(page)).toEqual(before);
  expect(await page.evaluate(() => window.reviews.state())).toEqual(before.data);
  expect((await exported(page)).data).toEqual(before.data);
  expect(await queue()).toEqual(beforeQueue);
  expect(await page.evaluate(() => localStorage.getItem('ciso-journey-v1'))).toBe(legacyBytes);
});

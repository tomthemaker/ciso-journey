const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const mixed = require('./fixtures/v1/mixed-progress.json');
const ready = page => expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
async function snapshot(page) {
  await ready(page);
  return page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('ciso-journey', 1);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('snapshots');
      const read = tx.objectStore('snapshots').get('current');
      tx.oncomplete = () => { db.close(); resolve(read.result); };
    };
  }));
}
async function importBackup(page, backup) {
  const accept = dialog => dialog.accept(); page.on('dialog', accept);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-resources.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue(''); page.off('dialog', accept);
}
async function exportBackup(page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  return JSON.parse(await fs.readFile(await (await event).path(), 'utf8'));
}
async function openResources(page) {
  const panel = page.locator('#w1-resources');
  await ready(page);
  if (!(await panel.evaluate(details => details.open))) await panel.locator(':scope > summary').click();
  return panel;
}
test('resource progress stays separate, persists and round-trips under Pages; discovery remains untracked', async ({ page }) => {
  const legacy = JSON.stringify({ ...mixed.data, readingProgress: { schemaVersion: 1, entries: [{ contentRef: { id: 'lesson-synthetic', version: 1 }, completed: true }] }, recallSynthetic: { preserved: true }, taskMastery: { w1: 'not-assessed' } });
  await page.addInitScript(raw => { if (localStorage.getItem('ciso-journey-v1') === null) localStorage.setItem('ciso-journey-v1', raw); }, legacy);
  await page.goto('./#roadmap');
  const original = await snapshot(page);
  const panel = await openResources(page);
  await expect(panel.locator(':scope > summary')).toContainText('Supplementary');
  await expect(panel.locator('.resource-discovery')).toContainText('Discovery searches');
  await expect(panel.locator('.resource-discovery input, .resource-discovery select, .resource-discovery button')).toHaveCount(0);
  const card = page.locator('[data-resource-id="w1-linkedin"]');
  await card.getByLabel('Resource status', { exact: true }).selectOption('completed');
  await card.getByLabel('Completion date').fill('2024-02-29');
  await card.getByLabel('Notes / what I understood').fill('Synthetic resource understanding');
  await card.getByLabel('Evidence HTTPS URL (optional)').fill('https://example.org/evidence');
  await card.getByRole('button', { name: 'Save resource progress' }).focus();
  await page.keyboard.press('Enter');
  await expect(card.locator('.resource-status')).toContainText('Completed · 2024-02-29');
  const saved = await snapshot(page);
  const { resourceProgress, ...siblings } = saved.data;
  expect(siblings).toEqual(original.data);
  expect(resourceProgress.entries[0].id).toBe('w1-linkedin');
  expect(resourceProgress.entries[0].progress[0].notes).toBe('Synthetic resource understanding');
  await expect(page.locator('#resourceCompletionCount')).toContainText('1 resources completed');
  await expect(card.getByRole('button', { name: 'Save resource progress' })).toBeFocused();
  await page.reload(); await openResources(page);
  await expect(card.getByLabel('Resource status', { exact: true })).toHaveValue('completed');
  const backup = await exportBackup(page);
  await card.getByLabel('Resource status', { exact: true }).selectOption('in-progress');
  await card.getByRole('button', { name: 'Save resource progress' }).click(); await ready(page);
  await importBackup(page, backup);
  expect((await snapshot(page)).data).toEqual(saved.data);
  expect(await page.evaluate(() => localStorage.getItem('ciso-journey-v1'))).toBe(legacy);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('custom resource edits and archive/restore retain historical metadata and progress; imported text stays literal', async ({ page }) => {
  await page.goto('./#roadmap'); await openResources(page);
  const add = page.locator('#w1-add-resource');
  await add.locator(':scope > summary').click();
  await add.getByLabel('Resource title').fill('<img src=x onerror=globalThis.syntheticUnsafe=1> Synthetic custom');
  await add.getByLabel('Platform or publisher').fill('Synthetic publisher');
  await add.getByLabel('Resource HTTPS URL').fill('https://example.org/original');
  await add.getByRole('button', { name: 'Add custom resource' }).click();
  await ready(page);
  let saved = await snapshot(page);
  const id = saved.data.resourceProgress.entries[0].id;
  const card = page.locator(`[data-resource-id="${id}"]`);
  await expect(card.locator(':scope > a')).toContainText('<img src=x');
  await expect(card.locator('img, script, iframe')).toHaveCount(0);
  await card.getByLabel('Resource status', { exact: true }).selectOption('completed');
  await card.getByLabel('Completion date').fill('2026-10-28');
  await card.getByRole('button', { name: 'Save resource progress' }).click(); await ready(page);
  await card.getByText('Edit custom resource', { exact: true }).click();
  await card.getByLabel('Resource title').fill('Renamed custom resource');
  await card.getByLabel('Resource HTTPS URL').fill('https://example.org/changed');
  await card.getByRole('button', { name: 'Save resource details' }).click(); await ready(page);
  await expect(card.locator(':scope > a')).toHaveText('Renamed custom resource ↗');
  await card.getByRole('button', { name: 'Archive resource', exact: true }).click(); await ready(page);
  await expect(card.locator('.resource-kind')).toContainText('Archived');
  await expect(card.locator('form')).toHaveCount(0);
  await expect(card.locator('.resource-status')).toContainText('Completed');
  await expect(page.locator('#resourceCompletionCount')).toContainText('1 resources completed');
  await card.getByRole('button', { name: 'Restore resource', exact: true }).click(); await ready(page);
  await card.getByText('Saved resource history', { exact: true }).click();
  await expect(card.locator('.resource-history')).toContainText('<img src=x');
  await expect(card.locator('.resource-history a[href="https://example.org/original"]')).toHaveCount(1);
  saved = await snapshot(page);
  expect(saved.data.resourceProgress.entries[0].revisions).toHaveLength(4);
  expect(saved.data.resourceProgress.entries[0].progress[0].resourceVersion).toBe(1);
  const backup = await exportBackup(page);
  await importBackup(page, backup);
  expect((await snapshot(page)).data).toEqual(saved.data);
  expect(await page.evaluate(() => globalThis.syntheticUnsafe)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('unsafe URLs, corrupt/future imports and aborted writes preserve committed state and unsaved resource drafts', async ({ page }) => {
  await page.goto('./#roadmap'); await openResources(page);
  const card = page.locator('[data-resource-id="w1-linkedin"]');
  const original = await snapshot(page);
  await card.getByLabel('Evidence HTTPS URL (optional)').fill('https://user:pass@example.org/private');
  await card.getByRole('button', { name: 'Save resource progress' }).click();
  expect(await card.getByLabel('Evidence HTTPS URL (optional)').evaluate(input => input.validationMessage)).toContain('HTTPS URL without');
  expect(await snapshot(page)).toEqual(original);
  await card.getByLabel('Evidence HTTPS URL (optional)').fill('https://example.org/evidence');
  await card.getByLabel('Resource status', { exact: true }).selectOption('completed');
  await card.getByLabel('Completion date').fill('2026-10-28');
  await card.getByLabel('Notes / what I understood').fill('Synthetic unsaved resource draft');
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args); request.addEventListener('success', () => this.transaction.abort()); return request;
    };
  });
  await card.getByRole('button', { name: 'Save resource progress' }).click();
  await expect(page.locator('#storageStatus')).toContainText('No progress was replaced');
  await expect(card.getByLabel('Notes / what I understood')).toHaveValue('Synthetic unsaved resource draft');
  await expect(card.getByLabel('Resource status', { exact: true })).toHaveValue('completed');
  await expect(card.locator('.resource-status')).toContainText('Not started');
  expect(await snapshot(page)).toEqual(original);
  await page.reload(); await openResources(page);
  await card.getByRole('button', { name: 'Save resource progress' }).click();
  const saved = await snapshot(page);
  const backup = await exportBackup(page);
  for (const mutate of [progress => { progress.schemaVersion = 99; }, progress => { progress.entries[0].revisions[0].url = 'javascript:alert(1)'; }, progress => { progress.entries[0].progress[0].completedAt = '2025-02-29'; progress.entries[0].progress[0].status = 'completed'; }]) {
    const bad = structuredClone(backup); mutate(bad.data.resourceProgress);
    await importBackup(page, bad);
    await expect(page.locator('#storageStatus')).toContainText('unsupported resource progress');
    expect(await snapshot(page)).toEqual(saved);
  }
});

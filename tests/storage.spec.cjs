const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const mixed = require('./fixtures/v1/mixed-progress.json');
const KEY = 'ciso-journey-v1';
const ready = page => expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
async function snapshot(page) {
  await ready(page);
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('ciso-journey', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('snapshots');
      const read = tx.objectStore('snapshots').get('current');
      tx.oncomplete = () => { db.close(); resolve(read.result); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
}
async function replaceSnapshot(page, value) {
  await page.evaluate(value => new Promise(resolve => {
    const request = indexedDB.open('ciso-journey', 1);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put(value, 'current');
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }), value);
}
async function importBackup(page, backup) {
  const dialogs = [];
  const handle = async dialog => { dialogs.push(dialog.message()); await dialog.accept(); };
  page.on('dialog', handle);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue('');
  page.off('dialog', handle);
  return dialogs;
}
async function recoveryDownload(page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download recovery copy' }).click();
  return fs.readFile(await (await event).path(), 'utf8');
}

test('aborted migration retains exact v1 bytes, retries atomically and is idempotent', async ({ page }) => {
  const raw = JSON.stringify(mixed.data, null, 2);
  await page.addInitScript(({ key, raw }) => {
    localStorage.setItem(key, raw);
    window.abortWrites = true;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args);
      request.addEventListener('success', () => { if (window.abortWrites) this.transaction.abort(); });
      return request;
    };
  }, { key: KEY, raw });
  await page.goto('./');
  await ready(page);
  await expect(page.locator('#storageStatus')).toContainText('transaction was aborted');
  await expect(page.locator('#roadmap')).toBeHidden();
  expect(await snapshot(page)).toBeUndefined();
  expect(await recoveryDownload(page)).toBe(raw);
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(raw);
  await page.evaluate(() => { window.abortWrites = false; });
  await page.getByRole('button', { name: 'Retry storage' }).click();
  await expect(page.locator('#statTasks')).toHaveText('19');
  expect(await snapshot(page)).toEqual({ schemaVersion: 2, revision: 1, data: mixed.data });
  await page.reload();
  await expect(page.locator('#statTasks')).toHaveText('19');
  expect((await snapshot(page)).revision).toBe(1);
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(raw);
});

test('quota failure keeps task, score, history and reset committed state; draft can be retried', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  await importBackup(page, mixed);
  const original = await snapshot(page);
  await page.evaluate(() => {
    window.failWrites = true;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (window.failWrites) throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await page.locator('.task input').nth(1).check();
  await expect(page.locator('.task input').nth(1)).not.toBeChecked();
  await expect(page.locator('#storageStatus')).toContainText('Synthetic quota failure');
  expect(await snapshot(page)).toEqual(original);
  await page.getByRole('button', { name: 'Competencies', exact: true }).click();
  await page.getByRole('combobox', { name: 'Rating for Governance' }).selectOption('4');
  await ready(page);
  await expect(page.getByRole('combobox', { name: 'Rating for Governance' })).toHaveValue(String(mixed.data.scores.Governance));
  await page.getByRole('button', { name: 'Learning journal', exact: true }).click();
  await page.locator('#journalTopic').fill('Synthetic retained draft');
  await page.locator('#journalLearned').fill('Synthetic text only');
  await page.getByRole('button', { name: 'Save learning entry' }).click();
  await ready(page);
  await expect(page.locator('#journalTopic')).toHaveValue('Synthetic retained draft');
  expect(await snapshot(page)).toEqual(original);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  expect(await snapshot(page)).toEqual(original);
  await page.evaluate(() => { window.failWrites = false; });
  await page.getByRole('button', { name: 'Save learning entry' }).click();
  await expect(page.locator('#journalTopic')).toHaveValue('');
  expect((await snapshot(page)).data.journal).toHaveLength(mixed.data.journal.length + 1);
  await page.reload();
  await expect(page.locator('#statLogs')).toHaveText('3');
});

test('stale tab cannot overwrite newer progress by import or reset; retry loads latest', async ({ page, context }) => {
  await page.goto('./');
  await ready(page);
  await importBackup(page, mixed);
  const other = await context.newPage();
  await other.goto('./');
  await ready(other);
  await page.locator('.task input').nth(1).check();
  const latest = await snapshot(page);
  const dialogs = await importBackup(other, { ...mixed, data: { ...mixed.data, completed: {} } });
  expect(dialogs.at(-1)).toContain('Progress changed in another tab');
  expect(await snapshot(other)).toEqual(latest);
  other.once('dialog', dialog => dialog.accept());
  await other.getByRole('button', { name: 'Reset', exact: true }).click();
  expect(await snapshot(other)).toEqual(latest);
  await other.getByRole('button', { name: 'Retry storage' }).click();
  await expect(other.locator('#statTasks')).toHaveText('20');
  await other.getByRole('button', { name: 'Competencies', exact: true }).click();
  await other.getByRole('combobox', { name: 'Rating for Governance' }).selectOption('4');
  expect((await snapshot(other)).data.completed).toEqual(latest.data.completed);
  expect((await snapshot(other)).revision).toBe(latest.revision + 1);
});

test('corrupt and future stored snapshots stay intact with raw recovery and no fabricated defaults', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  for (const value of [
    { schemaVersion: 2, revision: 9, data: { ...mixed.data, journal: null } },
    { schemaVersion: 99, revision: 9, data: mixed.data, syntheticFutureEntity: ['opaque'] },
  ]) {
    await replaceSnapshot(page, value);
    await page.reload();
    await ready(page);
    await expect(page.locator('#roadmap')).toBeHidden();
    await expect(page.locator('#exportBtn')).toBeDisabled();
    expect(JSON.parse(await recoveryDownload(page))).toEqual(value);
    expect((await importBackup(page, mixed)).at(-1)).toContain('Stored data could not be loaded');
    expect(await snapshot(page)).toEqual(value);
  }
});

test('damaged v1 loads visibly blocked and a repaired import preserves original recovery bytes', async ({ page }) => {
  const damaged = JSON.stringify({ ...mixed.data, scores: { Governance: 9 } }, null, 2);
  await page.addInitScript(({ key, damaged }) => localStorage.setItem(key, damaged), { key: KEY, damaged });
  await page.goto('./');
  await ready(page);
  await expect(page.locator('#roadmap')).toBeHidden();
  await expect(page.locator('#storageStatus')).toContainText('Invalid task completion or competency score');
  expect(await snapshot(page)).toBeUndefined();
  expect(await recoveryDownload(page)).toBe(damaged);
  await importBackup(page, mixed);
  await expect(page.locator('#statTasks')).toHaveText('19');
  expect((await snapshot(page)).data).toEqual(mixed.data);
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(damaged);
});

const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
// Temporary specimen resolves to the canonical bundle once C03 is integrated.
const bundle = require('../content/c02.example.v1.json');
const lessons = bundle.records.filter(record => record.kind === 'lesson');
const lesson = lessons[0];
const hash = ref => `#lessons/${ref.id}/${ref.version}`;
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
  const accept = dialog => dialog.accept();
  page.on('dialog', accept);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-reading.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue('');
  page.off('dialog', accept);
}

test('complete reading, exact concept/prerequisite navigation and keyboard sections work under Pages', async ({ page }) => {
  await page.goto('./' + hash(lesson));
  await ready(page);
  await expect(page.locator('#lessons')).toBeVisible();
  await expect(page.locator('#readerHeading')).toHaveText(lesson.title);
  await expect(page.locator('.lesson-body')).toContainText('Provisional draft');
  await expect(page.locator('.lesson-body')).toContainText('No independent educator or legal approval');
  for (const section of lesson.payload.sections) await expect(page.locator('.lesson-body')).toContainText(section.body);
  await expect(page.getByRole('heading', { name: 'Worked example', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Learning objectives', exact: true })).toBeVisible();
  await expect(page.locator('.lesson-body')).toContainText(lesson.payload.workedExample);
  const sectionButton = page.getByRole('navigation', { name: 'Reading sections' }).getByRole('button').first();
  await sectionButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#reading-section-0')).toBeFocused();
  const concept = lesson.payload.conceptRefs[0];
  const conceptLink = page.locator('.lesson-body a').filter({ hasText: bundle.records.find(record => record.id === concept.id && record.version === concept.version).title }).first();
  await conceptLink.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(hash(concept) + '$'));
  await expect(page.locator('#readerHeading')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Definition', exact: true })).toBeVisible();
  await page.locator('.lesson-body a').filter({ hasText: lesson.title }).first().click();
  await page.reload();
  await expect(page.locator('#readerHeading')).toHaveText(lesson.title);
  if (lessons.length > 1) {
    const next = lessons[1];
    await page.goto('./' + hash(next));
    await page.locator('.lesson-body a').filter({ hasText: lesson.title }).first().click();
    await expect(page.locator('#readerHeading')).toHaveText(lesson.title);
  }
  for (const installed of lessons) {
    await page.goto('./' + hash(installed));
    await expect(page.locator('#readerHeading')).toHaveText(installed.title);
    for (const section of installed.payload.sections) await expect(page.locator('.lesson-body')).toContainText(section.body);
    await expect(page.locator('.lesson-body')).toContainText(installed.payload.workedExample);
    await expect(page.getByRole('heading', { name: 'References and source currentness', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Roadmap', exact: true }).click();
  await page.goBack();
  await expect(page.locator('#readerHeading')).toBeFocused();
  expect((await snapshot(page)).data.readingProgress).toBeUndefined();
});

test('reading persists and round-trips separately; abort/future progress leave committed state intact', async ({ page }) => {
  await page.goto('./' + hash(lesson));
  const original = await snapshot(page);
  await page.getByRole('button', { name: 'Mark reading complete', exact: true }).focus();
  await page.keyboard.press('Space');
  await ready(page);
  await expect(page.locator('#readingStatus')).toContainText('Reading complete for this revision');
  await expect(page.locator('#readingComplete')).toBeFocused();
  const saved = await snapshot(page);
  const { readingProgress, ...rest } = saved.data;
  expect(rest).toEqual(original.data);
  expect(readingProgress).toEqual({ schemaVersion: 1, entries: [{ contentRef: { id: lesson.id, version: lesson.version }, completed: true }] });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Mark reading unread', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const backup = JSON.parse(await fs.readFile(await (await downloadEvent).path(), 'utf8'));
  await page.getByRole('button', { name: 'Mark reading unread', exact: true }).click();
  await importBackup(page, backup);
  await expect(page.locator('#readingStatus')).toContainText('Reading complete for this revision');
  expect((await snapshot(page)).data).toEqual(saved.data);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args);
      request.addEventListener('success', () => this.transaction.abort());
      return request;
    };
  });
  await page.getByRole('button', { name: 'Mark reading unread', exact: true }).click();
  await ready(page);
  await expect(page.locator('#storageStatus')).toContainText('No progress was replaced');
  await expect(page.locator('#readingComplete')).toHaveAttribute('aria-pressed', 'true');
  expect((await snapshot(page)).data).toEqual(saved.data);
  backup.data.readingProgress.schemaVersion = 99;
  await importBackup(page, backup);
  await expect(page.locator('#storageStatus')).toContainText('unsupported reading progress');
  expect((await snapshot(page)).data).toEqual(saved.data);
});

test('authored HTML stays literal and unsafe source URLs never become links', async ({ page }) => {
  const source = bundle.records.find(record => record.id === lesson.sourceRefs[0].id);
  const marker = '<img src=x onerror=globalThis.syntheticUnsafe=1>';
  await page.route('**/assets/*.js', async route => {
    const response = await route.fetch();
    let js = await response.text();
    expect(js).toContain(lesson.title);
    js = js.replace(lesson.title, marker + lesson.title);
    js = js.split(source.payload.url).join('javascript:globalThis.syntheticUnsafe=1');
    await route.fulfill({ response, body: js });
  });
  await page.goto('./' + hash(lesson));
  await ready(page);
  await expect(page.locator('#readerHeading')).toContainText(marker);
  await expect(page.locator('#lessonReader img, #lessonReader script, #lessonReader iframe')).toHaveCount(0);
  await expect(page.locator('#lessonReader a[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.syntheticUnsafe)).toBeUndefined();
  await page.goto('./#lessons/lesson-not-installed/12');
  await expect(page.locator('#readerHeading')).toHaveText('Revision unavailable');
});

const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const inventory = require('./fixtures/v1/inventory.json');
const mixed = require('./fixtures/v1/mixed-progress.json');
const allComplete = require('./fixtures/v1/all-complete.json');
const empty = require('./fixtures/v1/empty.json');
const { malformedInputs } = require('./fixtures/backup-cases.cjs');
const KEY = 'ciso-journey-v1';
const tasks = inventory.phases.flatMap(phase => phase.tasks);
const stored = page => page.evaluate(key => localStorage.getItem(key), KEY);

async function importText(page, text, accept = true) {
  const dialogs = [];
  const handler = async dialog => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    if (dialog.type() === 'confirm' && !accept) await dialog.dismiss();
    else await dialog.accept();
  };
  page.on('dialog', handler);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-backup.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.locator('#importFile')).toHaveValue('');
  page.off('dialog', handler);
  return dialogs;
}
const importBackup = (page, backup, accept) => importText(page, JSON.stringify(backup), accept);
async function exportBackup(page) {
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^ciso-journey-backup-\d{4}-\d{2}-\d{2}\.json$/);
  return JSON.parse(await fs.readFile(await download.path(), 'utf8'));
}
async function confirmAction(page, action, accept = true) {
  page.once('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
  await action();
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/');
});

test('all 37 tracker IDs, resources, scores, keyboard, filters and refresh work', async ({ page }) => {
  expect(tasks).toHaveLength(37);
  expect(new Set(tasks.map(task => task[0])).size).toBe(37);
  expect(tasks.slice(0, 12).map(task => task[0])).toEqual(Array.from({ length: 12 }, (_, i) => `w${i + 1}`));
  await expect(page.locator('.phase h3')).toHaveText(inventory.phases.map(phase => phase.name));
  await expect(page.locator('.task > span')).toHaveText(tasks.map(task => task[1] + task[2]));
  const renderedResources = await page.locator('.task-block').evaluateAll(blocks => blocks.map(block => ({
    focus: block.querySelector('details p').textContent,
    links: [...block.querySelectorAll('a')].map(a => [a.getAttribute('href'), a.target, a.rel])
  })));
  expect(renderedResources).toEqual(tasks.map(([id]) => {
    const resource = inventory.taskLearningResources[id];
    const urls = [resource.linkedinUrl, 'https://www.linkedin.com/learning/search?keywords=' + encodeURIComponent(resource.searchTerms), resource.officialUrl, 'https://www.coursera.org/search?query=' + encodeURIComponent(resource.searchTerms)];
    if (/^p[23]/.test(id)) urls.push('https://www.coursera.org/learn/cybersecurity-governance-compliance');
    return { focus: 'Study focus: ' + resource.focus, links: urls.map(url => [url, '_blank', 'noopener noreferrer']) };
  }));
  const disclosure = page.locator('.task-block').first();
  await disclosure.locator('summary').click();
  await expect(disclosure.locator('details')).toHaveAttribute('open', '');
  await disclosure.locator('summary').click();
  await expect(disclosure.locator('details')).not.toHaveAttribute('open');
  await page.getByRole('button', { name: 'Competencies', exact: true }).click();
  for (const [name, value] of inventory.competencies) await expect(page.getByRole('combobox', { name: 'Rating for ' + name })).toHaveValue(String(value));
  await page.getByRole('button', { name: 'Resources', exact: true }).click();
  expect(await page.locator('#resourceList a').evaluateAll(links => links.map(a => [a.firstChild.textContent, a.getAttribute('href'), a.querySelector('small').textContent]))).toEqual(inventory.resources.map(([title, url, description]) => [title + ' ↗', url, description]));

  await page.getByRole('button', { name: 'Roadmap', exact: true }).click();
  for (let i = 0; i < tasks.length; i++) {
    await page.locator('.task input').nth(i).check();
    expect(JSON.parse(await stored(page)).completed).toEqual(Object.fromEntries(tasks.slice(0, i + 1).map(task => [task[0], true])));
  }
  await expect(page.locator('#overallText')).toHaveText('100% (37/37)');
  await expect(page.locator('.phase .progress-label span:first-child')).toHaveText(['12 of 12 tasks', ...Array(5).fill('5 of 5 tasks')]);
  await page.locator('#phaseFilter').selectOption('incomplete');
  await expect(page.locator('#phaseList')).toHaveText('All roadmap tasks completed. Excellent work!');
  await page.reload();
  await expect(page.locator('.task input:checked')).toHaveCount(37);
  // Keyboard interaction also preserves an explicit false value.
  await page.locator('.task input').first().focus();
  await page.keyboard.press('Space');
  expect(JSON.parse(await stored(page)).completed.w1).toBe(false);
  await page.locator('#phaseFilter').selectOption('incomplete');
  await expect(page.locator('.task')).toHaveCount(1);
  await expect(page.locator('.task small')).toHaveText(tasks[0][2]);
});

test('v1 fixtures render safely and real downloads round-trip every value', async ({ page }) => {
  for (const [name, backup] of Object.entries({ empty, mixed, allComplete })) {
    await test.step(name, async () => {
      const dialogs = await importBackup(page, backup);
      expect(dialogs.map(dialog => dialog.type)).toEqual(['confirm', 'alert']);
      expect(dialogs[1].message).toBe('Backup imported successfully.');
      expect(JSON.parse(await stored(page))).toEqual(backup.data);
      await page.reload();
      const completed = Object.values(backup.data.completed).filter(Boolean).length;
      await expect(page.locator('#statTasks')).toHaveText(String(completed));
      await expect(page.locator('.task input:checked')).toHaveCount(completed);
      await page.getByRole('button', { name: 'Competencies', exact: true }).click();
      for (const [category, score] of Object.entries(backup.data.scores)) await expect(page.getByRole('combobox', { name: 'Rating for ' + category })).toHaveValue(String(score));
      for (const [tab, kind, selector] of [['Learning journal', 'journal', '#journalList'], ['Achievements', 'achievements', '#achievementList']]) {
        await page.getByRole('button', { name: tab, exact: true }).click();
        const entries = [...backup.data[kind]].sort((a, b) => b.date.localeCompare(a.date));
        await expect(page.locator(selector + ' .log strong')).toHaveText(entries.map(entry => entry.title));
        await expect(page.locator(selector + ' .log p')).toHaveText(entries.map(entry => entry.body));
        await expect(page.locator(selector + ' script, ' + selector + ' img')).toHaveCount(0);
      }
      expect(await page.evaluate(() => window.importExecuted)).toBeUndefined();
      const exported = await exportBackup(page);
      expect(exported.app).toBe('CISO Journey');
      expect(exported.version).toBe(1);
      expect(Number.isFinite(Date.parse(exported.exportedAt))).toBe(true);
      expect(exported.data).toEqual(backup.data);
      await importBackup(page, empty);
      await importBackup(page, exported);
      expect(JSON.parse(await stored(page))).toEqual(backup.data);
    });
  }
});

test('existing storage bytes, default scores and extra fields survive', async ({ page }) => {
  const original = JSON.stringify(mixed.data, null, 2);
  await page.evaluate(({ key, original }) => localStorage.setItem(key, original), { key: KEY, original });
  await page.reload();
  expect(await stored(page)).toBe(original);
  expect((await exportBackup(page)).data).toEqual(mixed.data);
  await expect(page.locator('#statLogs')).toHaveText('2');

  // Defaults and extensions also survive the real import/export path.
  const backup = structuredClone(mixed);
  backup.data.scores = { Governance: 4 };
  backup.data.syntheticExtension = { label: 'Synthetic extension only' };
  await importBackup(page, backup);
  expect((await exportBackup(page)).data).toEqual({ ...backup.data, scores: { ...empty.data.scores, Governance: 4 } });
});

test('invalid imports reject before confirmation and preserve stored bytes and full live state', async ({ page }) => {
  await importBackup(page, mixed);
  const original = await stored(page);
  expect((await exportBackup(page)).data).toEqual(mixed.data);
  const inputs = malformedInputs.filter(([label]) => ['truncated JSON', 'future version'].includes(label));
  for (const kind of ['journal', 'achievements']) {
    const backup = structuredClone(allComplete);
    backup.data[kind][0].date = '2026-02-30';
    inputs.push([kind + ' impossible date', JSON.stringify(backup)]);
  }
  for (const [label, input] of inputs) {
    await test.step(label, async () => {
      const dialogs = await importText(page, input);
      expect(dialogs.map(dialog => dialog.type)).toEqual(['alert']);
      expect(dialogs[0].message).toMatch(/^Could not import backup:/);
      expect(await stored(page)).toBe(original);
      await expect(page.locator('#statTasks')).toHaveText('19');
      expect((await exportBackup(page)).data).toEqual(mixed.data);
    });
  }
  await page.reload();
  expect(await stored(page)).toBe(original);
  expect((await exportBackup(page)).data).toEqual(mixed.data);
  // Selecting the same picker after an error still imports a valid file.
  await importBackup(page, allComplete);
  await expect(page.locator('#statTasks')).toHaveText('37');
});

test('cancelled import and failed persistence leave storage and live state untouched', async ({ page }) => {
  await importBackup(page, mixed);
  const original = await stored(page);
  expect((await importBackup(page, allComplete, false)).map(dialog => dialog.type)).toEqual(['confirm']);
  expect(await stored(page)).toBe(original);
  expect((await exportBackup(page)).data).toEqual(mixed.data);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); }; });
  const dialogs = await importBackup(page, allComplete);
  expect(dialogs.map(dialog => dialog.type)).toEqual(['confirm', 'alert']);
  expect(dialogs[1].message).toContain('Could not import backup:');
  expect(await stored(page)).toBe(original);
  expect((await exportBackup(page)).data).toEqual(mixed.data);
  await page.reload();
  expect(await stored(page)).toBe(original);
  expect((await exportBackup(page)).data).toEqual(mixed.data);
});

test('ratings, journal, achievements, delete confirmation and reset remain independent', async ({ page }) => {
  await page.getByRole('button', { name: 'Competencies', exact: true }).click();
  for (const [i, [name]] of inventory.competencies.entries()) await page.getByRole('combobox', { name: 'Rating for ' + name }).selectOption(String(i % 5));
  await expect(page.locator('#statCompetency')).toHaveText('1.7/4');
  await page.getByRole('button', { name: 'Learning journal', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).filter({ visible: true }).fill('2026-03-04');
  await page.getByLabel('Topic or concept').fill('Synthetic journal via form');
  await page.getByLabel('What did you learn, and how would you explain it to an executive?').fill('Synthetic lesson\nwith a second line.');
  await page.getByRole('button', { name: 'Save learning entry' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#journalList .log')).toHaveCount(1);
  await expect(page.locator('#journalTopic')).toHaveValue('');
  await page.getByRole('button', { name: 'Achievements', exact: true }).click();
  await page.locator('#achievementDate').fill('2026-03-05');
  await page.getByLabel('Milestone or achievement').fill('Synthetic achievement via form');
  await page.getByLabel('Evidence / impact').fill('');
  await page.getByRole('button', { name: 'Save achievement' }).click();
  await expect(page.locator('#achievementList .log p')).toHaveText('');
  const data = JSON.parse(await stored(page));
  expect(data.journal[0]).toMatchObject({ date: '2026-03-04', title: 'Synthetic journal via form', body: 'Synthetic lesson\nwith a second line.' });
  expect(typeof data.journal[0].id).toBe('string');
  expect(data.completed).toEqual({});
  await expect(page.locator('#statTasks')).toHaveText('0');
  await page.reload();
  await page.getByRole('button', { name: 'Achievements', exact: true }).click();
  const deleteAchievement = () => page.locator('#achievementList').getByRole('button', { name: 'Delete', exact: true }).click();
  await confirmAction(page, deleteAchievement, false);
  await expect(page.locator('#achievementList .log')).toHaveCount(1);
  await confirmAction(page, deleteAchievement);
  await expect(page.locator('#achievementList .log')).toHaveCount(0);
  await page.getByRole('button', { name: 'Learning journal', exact: true }).click();
  await confirmAction(page, () => page.locator('#journalList').getByRole('button', { name: 'Delete', exact: true }).click());
  await expect(page.locator('#journalList .log')).toHaveCount(0);
  const beforeReset = await stored(page);
  await confirmAction(page, () => page.getByRole('button', { name: 'Reset', exact: true }).click(), false);
  expect(await stored(page)).toBe(beforeReset);
  await confirmAction(page, () => page.getByRole('button', { name: 'Reset', exact: true }).click());
  expect(JSON.parse(await stored(page))).toEqual(empty.data);
  await page.reload();
  await expect(page.locator('#statCompetency')).toHaveText('0.5/4');
  const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);

  const beforeChooser = await stored(page);
  const chooserEvent = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import backup' }).click();
  const chooser = await chooserEvent;
  expect(chooser.isMultiple()).toBe(false);
  await confirmAction(page, () => chooser.setFiles(path.join(__dirname, 'fixtures/v1/empty.json')), false);
  expect(await stored(page)).toBe(beforeChooser);
  await page.emulateMedia({ media: 'print' });
  for (const view of await page.locator('.view').all()) await expect(view).toBeVisible();
  await expect(page.locator('#exportBtn')).toBeHidden();
});

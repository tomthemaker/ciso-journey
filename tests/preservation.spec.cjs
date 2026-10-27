const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const inventory = require('./fixtures/v1/inventory.json');
const mixed = require('./fixtures/v1/mixed-progress.json');
const allComplete = require('./fixtures/v1/all-complete.json');
const empty = require('./fixtures/v1/empty.json');
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
  await page.goto('./');
});

test('inventory retains all 37 meanings, phases, six defaults and all resource destinations', async ({ page }) => {
  expect(tasks).toHaveLength(37);
  expect(new Set(tasks.map(task => task[0])).size).toBe(37);
  expect(tasks.slice(0, 12).map(task => task[0])).toEqual(Array.from({ length: 12 }, (_, i) => `w${i + 1}`));
  await expect(page.locator('.phase h3')).toHaveText(inventory.phases.map(phase => phase.name));
  await expect(page.locator('.task > span')).toHaveText(tasks.map(task => task[1] + task[2]));
  const blocks = page.locator('.task-block');
  for (let i = 0; i < tasks.length; i++) {
    const [id] = tasks[i];
    const resource = inventory.taskLearningResources[id];
    const block = blocks.nth(i);
    await block.locator('summary').click();
    await expect(block.locator('details')).toHaveAttribute('open', '');
    await expect(block.locator('details p')).toHaveText('Study focus: ' + resource.focus);
    const expected = [resource.linkedinUrl, 'https://www.linkedin.com/learning/search?keywords=' + encodeURIComponent(resource.searchTerms), resource.officialUrl, 'https://www.coursera.org/search?query=' + encodeURIComponent(resource.searchTerms)];
    if (/^p[23]/.test(id)) expected.push('https://www.coursera.org/learn/cybersecurity-governance-compliance');
    expect(await block.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href')))).toEqual(expected);
    for (const link of await block.locator('a').all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await block.locator('summary').click();
  }
  await page.getByRole('button', { name: 'Competencies', exact: true }).click();
  for (const [name, value] of inventory.competencies) await expect(page.getByRole('combobox', { name: 'Rating for ' + name })).toHaveValue(String(value));
  await page.getByRole('button', { name: 'Resources', exact: true }).click();
  expect(await page.locator('#resourceList a').evaluateAll(links => links.map(a => [a.firstChild.textContent, a.getAttribute('href'), a.querySelector('small').textContent]))).toEqual(inventory.resources.map(([title, url, description]) => [title + ' ↗', url, description]));
});

test('every checkbox writes the original ID, phase and overall progress survive refresh and filters', async ({ page }) => {
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

for (const [name, backup] of Object.entries({ empty, mixed, allComplete })) {
  test(`v1 ${name} imports, renders, persists and exports without changing values`, async ({ page }) => {
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

test('pre-existing v1 localStorage loads without rewriting or dropping any values', async ({ page }) => {
  const original = JSON.stringify(mixed.data, null, 2);
  await page.evaluate(({ key, original }) => localStorage.setItem(key, original), { key: KEY, original });
  await page.reload();
  expect(await stored(page)).toBe(original);
  expect((await exportBackup(page)).data).toEqual(mixed.data);
  await expect(page.locator('#statLogs')).toHaveText('2');
});

test('partial legacy scores use defaults while extra JSON fields survive', async ({ page }) => {
  const backup = structuredClone(mixed);
  backup.data.scores = { Governance: 4 };
  backup.data.syntheticExtension = { label: 'Synthetic extension only' };
  await importBackup(page, backup);
  expect((await exportBackup(page)).data).toEqual({ ...backup.data, scores: { ...empty.data.scores, Governance: 4 } });
});

test('malformed and unsupported imports do not change storage or live state', async ({ page }) => {
  await importBackup(page, mixed);
  const original = await stored(page);
  const bad = mutate => { const backup = structuredClone(allComplete); mutate(backup); return JSON.stringify(backup); };
  const inputs = [
    '{truncated', 'null', '[]', '{}',
    bad(b => { b.app = 'Other app'; }), bad(b => { b.version = 2; }), bad(b => { b.version = '1'; }),
    bad(b => { b.data = null; }), bad(b => { delete b.data.completed; }),
    bad(b => { b.data.completed = null; }), bad(b => { b.data.completed = []; }), bad(b => { b.data.completed.w1 = 'true'; }),
    bad(b => { b.data.scores = null; }), bad(b => { b.data.scores = []; }), bad(b => { b.data.scores.Governance = 5; }), bad(b => { b.data.scores.Governance = '2'; }), bad(b => { b.data.scores.Governance = 1.5; }),
    bad(b => { b.data.journal = {}; }), bad(b => { b.data.achievements = null; }),
    bad(b => { b.data.journal[0] = null; }), bad(b => { b.data.journal[0].date = 123; }), bad(b => { b.data.journal[0].date = 'not a date'; }),
    bad(b => { b.data.achievements[0].title = {}; }), bad(b => { delete b.data.achievements[0].body; }),
    bad(b => { b.data.journal.push(b.data.journal[0]); })
  ];
  for (const input of inputs) {
    const dialogs = await importText(page, input);
    expect(dialogs.map(dialog => dialog.type)).toEqual(['alert']);
    expect(dialogs[0].message).toMatch(/^Could not import backup:/);
    expect(await stored(page)).toBe(original);
    await expect(page.locator('#statTasks')).toHaveText('19');
    expect((await exportBackup(page)).data).toEqual(mixed.data);
  }
  // The file picker can select the same valid file again after an error.
  await importBackup(page, allComplete);
  await expect(page.locator('#statTasks')).toHaveText('37');
});

for (const kind of ['journal', 'achievements']) {
  test(`${kind} rejects impossible calendar dates without changing storage or live state`, async ({ page }) => {
    await importBackup(page, mixed);
    const original = await stored(page);
    const invalidDates = ['2026-02-30', '2026-02-29', '1900-02-29', '2100-02-29', '2024-02-30', '2026-04-31', '2026-06-31', '2026-09-31', '2026-11-31', '2026-00-10', '2026-13-10', '2026-01-00', '2026-01-32'];
    for (const date of invalidDates) {
      const backup = structuredClone(allComplete);
      backup.data[kind][0].date = date;
      const dialogs = await importBackup(page, backup);
      // Rejection must occur before replacement confirmation, even if accepted.
      expect(dialogs.map(dialog => dialog.type), date).toEqual(['alert']);
      expect(dialogs[0].message).toMatch(new RegExp('^Could not import backup: Invalid ' + kind + ' entry'));
      expect(await stored(page), date).toBe(original);
      await expect(page.locator('#statTasks')).toHaveText('19');
      expect((await exportBackup(page)).data, date).toEqual(mixed.data);
    }
    await page.reload();
    expect(await stored(page)).toBe(original);
    expect((await exportBackup(page)).data).toEqual(mixed.data);
  });
}

test('valid leap days and legacy date strings import and round-trip in both histories', async ({ page }) => {
  for (const date of ['2024-02-29', '2000-02-29', '2026-04-30', '2026-12-31', '0001-01-01', '10000-02-29']) {
    const backup = structuredClone(allComplete);
    backup.data.journal[0].date = date;
    backup.data.achievements[0].date = date;
    const dialogs = await importBackup(page, backup);
    expect(dialogs.map(dialog => dialog.type), date).toEqual(['confirm', 'alert']);
    expect(dialogs[1].message).toBe('Backup imported successfully.');
    expect(JSON.parse(await stored(page))).toEqual(backup.data);
    await page.reload();
    await expect(page.locator('#statTasks')).toHaveText('37');
    expect((await exportBackup(page)).data, date).toEqual(backup.data);
  }
});

test('cancelled import and failed persistence leave storage and live state untouched', async ({ page }) => {
  await importBackup(page, mixed);
  const original = await stored(page);
  expect((await importBackup(page, allComplete, false)).map(dialog => dialog.type)).toEqual(['confirm']);
  expect(await stored(page)).toBe(original);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); }; });
  const dialogs = await importBackup(page, allComplete);
  expect(dialogs.map(dialog => dialog.type)).toEqual(['confirm', 'alert']);
  expect(dialogs[1].message).toContain('Could not import backup:');
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
});

test('import button opens the chooser and print includes all five views', async ({ page }) => {
  const chooserEvent = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import backup' }).click();
  const chooser = await chooserEvent;
  expect(chooser.isMultiple()).toBe(false);
  await confirmAction(page, () => chooser.setFiles(path.join(__dirname, 'fixtures/v1/empty.json')), false);
  expect(await stored(page)).toBeNull();
  await page.emulateMedia({ media: 'print' });
  for (const view of await page.locator('.view').all()) await expect(view).toBeVisible();
  await expect(page.locator('#exportBtn')).toBeHidden();
});

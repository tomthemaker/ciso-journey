const { test, expect, snapshot, seedServerState, failWrites, reloadProgress } = require('./browser/account-fixture.cjs');
const mixed = require('./fixtures/v1/mixed-progress.json');
async function importBackup(page, backup) {
  const dialogs = [], handler = async dialog => { dialogs.push(dialog.message()); await dialog.accept(); };
  page.on('dialog', handler);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue(''); page.off('dialog', handler);
  return dialogs;
}
for (const kind of ['http', 'network']) test(`${kind} failure preserves committed tasks, scores, history, reset and retryable draft`, async ({ page }) => {
  await seedServerState(page, mixed.data); await page.goto('./');
  const original = await snapshot(page), failure = await failWrites(page, kind);
  await page.locator('.task input').nth(1).check();
  await expect(page.locator('.task input').nth(1)).not.toBeChecked();
  await expect(page.locator('#storageStatus')).toContainText('No progress was replaced');
  expect(await snapshot(page)).toEqual(original);
  await page.getByRole('button', { name: 'Competencies', exact: true }).click();
  await page.getByRole('combobox', { name: 'Rating for Governance' }).selectOption('4');
  await expect(page.getByRole('combobox', { name: 'Rating for Governance' })).toHaveValue(String(mixed.data.scores.Governance));
  await page.getByRole('button', { name: 'Learning journal', exact: true }).click();
  await page.locator('#journalTopic').fill('Synthetic retained draft'); await page.locator('#journalLearned').fill('Synthetic text only');
  await page.getByRole('button', { name: 'Save learning entry' }).click();
  await expect(page.locator('#journalTopic')).toHaveValue('Synthetic retained draft');
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Reset', exact: true }).click();
  expect(await snapshot(page)).toEqual(original);
  await failure.restore(); await reloadProgress(page);
  await expect(page.locator('#journalTopic')).toHaveValue('Synthetic retained draft');
  await page.getByRole('button', { name: 'Save learning entry' }).click();
  await expect(page.locator('#journalTopic')).toHaveValue('');
  expect((await snapshot(page)).data.journal).toHaveLength(mixed.data.journal.length + 1);
  await page.reload(); await expect(page.locator('#statLogs')).toHaveText('3');
});
test('lost server acknowledgement reports failure until an explicit reload reveals committed progress', async ({ page }) => {
  await page.goto('./'); await snapshot(page);
  await page.route('**/rpc/account_save', async route => {
    const response = await route.fetch(); expect(response.ok()).toBeTruthy();
    await route.abort('failed'); // Real Postgres committed; the browser never received success.
  });
  await page.locator('.task input').first().click();
  await expect(page.locator('#storageStatus')).toContainText('No progress was replaced');
  await expect(page.locator('#statTasks')).toHaveText('0');
  expect((await snapshot(page)).data.completed.w1).toBe(true);
  await page.locator('.task input').nth(1).click();
  await expect(page.locator('#storageStatus')).toContainText('Reload progress');
  expect((await snapshot(page)).data.completed).toEqual({ w1: true });
  await page.unroute('**/rpc/account_save'); await reloadProgress(page);
  await expect(page.locator('#statTasks')).toHaveText('1');
  await expect(page.locator('.task input').first()).toBeChecked();
});
test('stale authenticated device cannot overwrite newer progress by import or reset; reload gets latest', async ({ page, context }) => {
  await seedServerState(page, mixed.data); await page.goto('./'); await snapshot(page);
  const other = await context.newPage(); await other.goto('./'); await snapshot(other);
  await page.locator('.task input').nth(1).check(); await expect(page.locator('#statTasks')).toHaveText('20');
  const latest = await snapshot(page);
  expect((await importBackup(other, { ...mixed, data: { ...mixed.data, completed: {} } })).at(-1)).toContain('Progress changed elsewhere');
  expect(await snapshot(other)).toEqual(latest);
  other.once('dialog', dialog => dialog.accept()); await other.getByRole('button', { name: 'Reset', exact: true }).click();
  expect(await snapshot(other)).toEqual(latest);
  await reloadProgress(other); await expect(other.locator('#statTasks')).toHaveText('20');
  await other.getByRole('button', { name: 'Competencies', exact: true }).click();
  await other.getByRole('combobox', { name: 'Rating for Governance' }).selectOption('4');
  await expect(other.getByRole('combobox', { name: 'Rating for Governance' })).toHaveValue('4');
  const saved = await snapshot(other); expect(saved.data.completed).toEqual(latest.data.completed); expect(saved.revision).not.toBe(latest.revision);
});
test('corrupt or future server responses block learning/export/import without fabricated defaults or writes', async ({ page }) => {
  for (const mutate of [value => { value.snapshot.data.journal = null; }, value => { value.snapshot.schemaVersion = 99; }]) {
    let writes = 0;
    const count = request => { if (/\/rpc\/account_(save|reset)$/.test(request.url())) writes++; };
    page.on('request', count);
    const handler = async route => { const response = await route.fetch(), value = await response.json(); value.snapshot = JSON.parse(value.snapshot); mutate(value); value.snapshot = JSON.stringify(value.snapshot); await route.fulfill({ response, json: value }); };
    await page.route('**/rpc/account_load', handler); await page.goto('./');
    await expect(page.locator('#storageStatus')).toContainText('No progress was replaced');
    await expect(page.locator('#roadmap')).toBeHidden(); await expect(page.locator('#exportBtn')).toBeDisabled(); await expect(page.locator('#importBtn')).toBeDisabled();
    expect(writes).toBe(0); await page.unroute('**/rpc/account_load', handler); page.off('request', count);
    expect((await snapshot(page)).data.completed).toEqual({});
  }
});

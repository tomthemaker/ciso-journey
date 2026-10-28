const { test, expect } = require('@playwright/test');

test('appearance follows system, persists choices and loads the local font on Pages', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('#lessons');
  const choice = page.getByLabel('Appearance');
  await expect(choice).toBeEnabled();
  await expect(choice).toHaveValue('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await choice.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(choice).toHaveValue('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await choice.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(() => page.evaluate(async () => {
    await document.fonts.ready;
    return getComputedStyle(document.body).fontFamily.includes('Source Serif 4') &&
      Array.from(document.fonts).some(face => face.family === 'Source Serif 4' && face.status === 'loaded') &&
      document.fonts.check('18px "Source Serif 4"');
  })).toBe(true);
  const font = await page.request.get('fonts/SourceSerif4Variable-Roman.woff2');
  expect(font.status()).toBe(200);
  expect((await font.body()).subarray(0, 4).toString()).toBe('wOF2');
});

test('backup carries the preference and rejects future preferences before replacing data', async ({ page }) => {
  await page.goto('#today');
  const choice = page.getByLabel('Appearance');
  await expect(choice).toBeEnabled();
  await choice.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const stream = await (await downloadPromise).createReadStream();
  let json = ''; for await (const chunk of stream) json += chunk;
  const backup = JSON.parse(json);
  expect(backup.data.displayPreferences).toEqual({ schema: 1, theme: 'dark' });
  await choice.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  let confirmations = 0;
  page.on('dialog', async dialog => { if (dialog.type() === 'confirm') { confirmations++; await dialog.accept(); } else await dialog.dismiss(); });
  await page.locator('#importFile').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(choice).toHaveValue('dark');
  expect(confirmations).toBe(1);
  backup.data.displayPreferences = { schema: 2, theme: 'light' };
  confirmations = 0;
  await page.locator('#importFile').setInputFiles({ name: 'future.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#storageStatus')).toContainText('Invalid display preferences');
  expect(confirmations).toBe(0);
  await page.reload();
  await expect(choice).toHaveValue('dark');
});

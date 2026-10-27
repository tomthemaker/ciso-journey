const { test, expect } = require('@playwright/test');

test('built Pages subpath loads JS and CSS assets and survives direct hash refresh', async ({ page, request, baseURL }) => {
  const assetResponses = [];
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => {
    if (['script', 'stylesheet'].includes(response.request().resourceType())) {
      assetResponses.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'] });
    }
  });
  const response = await page.goto('./#journal');
  expect(response.status()).toBe(200);
  await expect(page.locator('#journal')).toBeVisible();
  await expect(page.locator('.task input')).toHaveCount(37);
  // CSS must be loaded and applied, not merely available at a plausible URL.
  await expect(page.locator('#roadmap')).toBeHidden();
  await expect(page.locator('.shell')).toHaveCSS('max-width', '1240px');
  const assets = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src') ?? node.getAttribute('href')));
  expect(assets.filter(asset => asset.endsWith('.js'))).toHaveLength(1);
  expect(assets.filter(asset => asset.endsWith('.css'))).toHaveLength(1);
  for (const asset of assets) {
    expect(asset).toMatch(/^\/ciso-journey\/assets\/[^/]+\.(js|css)$/);
    const response = await request.get(new URL(asset, baseURL).href);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/text\/(javascript|css)/);
    expect(await response.text()).not.toContain('<!doctype html>');
    // Prove a root-relative URL cannot be hidden by our static server.
    expect((await request.get(asset.replace('/ciso-journey', ''))).status()).toBe(404);
  }
  await page.locator('#journalTopic').fill('Synthetic Pages refresh');
  await page.locator('#journalLearned').fill('Build assets loaded beneath the repository path.');
  await page.getByRole('button', { name: 'Save learning entry' }).click();
  await page.reload();
  await expect(page).toHaveURL(new URL('#journal', baseURL).href);
  await expect(page.locator('#journalList .log strong')).toHaveText('Synthetic Pages refresh');
  expect(assetResponses.length).toBeGreaterThanOrEqual(4);
  for (const asset of assetResponses) {
    expect(asset.url).toContain('/ciso-journey/assets/');
    expect(asset.status).toBe(200);
    expect(asset.type).toMatch(/text\/(javascript|css)/);
  }
  expect(failures).toEqual([]);
  expect((await request.get('./missing-route')).status()).toBe(404);
});

test('all section links support refresh and browser history on the Pages URL', async ({ page, baseURL }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('./');
  for (const [label, id] of [['Competencies', 'competencies'], ['Learning journal', 'journal'], ['Achievements', 'achievements'], ['Resources', 'resources'], ['Roadmap', 'roadmap']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new URL('#' + id, baseURL).href);
    await page.reload();
    await expect(page.locator('#' + id)).toBeVisible();
    await expect(page.locator('.tab.active')).toHaveText(label);
  }
  await page.goBack();
  await expect(page.locator('#resources')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#roadmap')).toBeVisible();
  await page.goto('./#unknown-section');
  await expect(page.locator('#roadmap')).toBeVisible();
});

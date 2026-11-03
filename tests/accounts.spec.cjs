const { test: rawTest, expect } = require('@playwright/test');
const { test } = require('./browser/account-fixture.cjs');
const mixed = require('./fixtures/v1/mixed-progress.json');
const api = process.env.VITE_SUPABASE_URL;
rawTest('GitHub authorize uses PKCE and the exact Pages callback', async ({ page, baseURL }) => {
  await page.goto('./');
  await expect(page.locator('#roadmap')).toBeHidden();
  await page.route('**/auth/v1/authorize**', route => route.fulfill({ status: 200, body: 'Synthetic provider boundary only' }));
  const requested = page.waitForRequest(request => request.url().includes('/auth/v1/authorize'));
  await page.getByRole('button', { name: 'Sign in with GitHub' }).click();
  const url = new URL((await requested).url());
  expect(url.searchParams.get('provider')).toBe('github'); expect(url.searchParams.get('redirect_to')).toBe(baseURL);
  expect(url.searchParams.get('code_challenge_method')).toBe('s256'); expect(url.searchParams.get('code_challenge')).toBeTruthy();
});
rawTest('invalid account configuration blocks all learning and private transfer controls', async ({ page }) => {
  await page.route('**/assets/*.js', async route => {
    const response = await route.fetch(), js = await response.text();
    expect(js).toContain(api);
    await route.fulfill({ response, body: js.replaceAll(api, '') });
  });
  await page.goto('./');
  await expect(page.locator('#accountStatus')).toContainText('Invalid URL');
  await expect(page.locator('#roadmap')).toBeHidden(); await expect(page.locator('#todayStudy')).toBeHidden();
  await expect(page.locator('#importBtn')).toBeDisabled(); await expect(page.locator('#exportBtn')).toBeDisabled();
});
test('pre-existing browser learner bytes stay untouched and unused after authentication and sign-out', async ({ page }) => {
  await page.goto('./'); await expect(page.locator('#statTasks')).toHaveText('0');
  const raw = JSON.stringify(mixed.data, null, 2), old = { schemaVersion: 99, revision: 999, data: mixed.data };
  await page.evaluate(async ({ raw, old, api }) => {
    localStorage.setItem('ciso-journey-v1', raw);
    localStorage.setItem(`ciso-journey-auth:${encodeURIComponent(api)}`, 'obsolete-token-bytes');
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('ciso-journey', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { const db = request.result, tx = db.transaction('snapshots', 'readwrite'); tx.objectStore('snapshots').put(old, 'current'); tx.oncomplete = () => { db.close(); resolve(); }; };
    });
  }, { raw, old, api: api.replace(/\/+$/, '') });
  await page.reload(); await expect(page.locator('#statTasks')).toHaveText('0');
  await page.locator('.task input').first().check(); await expect(page.locator('#statTasks')).toHaveText('1');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('#roadmap')).toBeHidden(); await expect(page.locator('#exportBtn')).toBeDisabled();
  const bytes = await page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('ciso-journey', 1);
    request.onsuccess = () => { const db = request.result, tx = db.transaction('snapshots'), read = tx.objectStore('snapshots').get('current'); tx.oncomplete = () => { db.close(); resolve({ local: localStorage.getItem('ciso-journey-v1'), obsoleteAuth: Object.entries(localStorage).find(([key]) => key.startsWith('ciso-journey-auth:'))?.[1], stored: read.result, session: Object.keys(sessionStorage) }); }; };
  }));
  expect(bytes).toEqual({ local: raw, obsoleteAuth: 'obsolete-token-bytes', stored: old, session: [] });
});
test('authenticated progress has no persistent browser learner cache or Auth tokens', async ({ page }) => {
  await page.goto('./#journal'); await page.locator('#journalTopic').fill('Synthetic private fixture'); await page.locator('#journalLearned').fill('Only server persistence');
  await page.getByRole('button', { name: 'Save learning entry' }).click(); await expect(page.locator('#journalList .log')).toHaveCount(1);
  const storage = await page.evaluate(async () => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), databases: await indexedDB.databases() }));
  expect(storage).toEqual({ local: [], session: [], databases: [] });
});

const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const api = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const mail = process.env.TEST_MAIL_URL;
const legacy = JSON.stringify(require('./fixtures/v1/mixed-progress.json').data);
async function syntheticUser() {
  const email = `required-${randomUUID()}@example.test`;
  const post = (path, body) => fetch(`${api}${path}`, { method:'POST', headers:{ apikey:key, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
  expect((await post('/auth/v1/otp', { email, create_user:true })).ok).toBeTruthy();
  for (let i = 0; i < 50; i++) {
    const inbox = await (await fetch(`${mail}/api/v1/messages`)).json();
    const message = inbox.messages.find(m => m.To.some(t => t.Address === email));
    if (message) {
      const detail = await (await fetch(`${mail}/api/v1/message/${message.ID}`)).json();
      const url = new URL(detail.HTML.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&'));
      const response = await post('/auth/v1/verify', { token_hash:url.searchParams.get('token'), type:url.searchParams.get('type') });
      expect(response.ok).toBeTruthy(); return response.json();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Synthetic mail not received');
}
async function login(page, session) {
  const verifier = `ciso-journey-auth:${encodeURIComponent(api.replace(/\/+$/, ''))}-code-verifier`;
  await page.addInitScript(({verifier, legacy}) => { sessionStorage.setItem(verifier, JSON.stringify({value:JSON.stringify('synthetic-verifier'), expires:Date.now()+600000})); localStorage.setItem('ciso-journey-v1', legacy); }, {verifier, legacy});
  await page.route('**/auth/v1/token?grant_type=pkce', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(session) }));
  await page.goto('./?code=synthetic');
  await expect(page.locator('#accountStatus')).toContainText('Signed in');
  await expect(page.locator('#statTasks')).toHaveText('0');
  expect(await page.evaluate(verifier => sessionStorage.getItem(verifier), verifier)).toBeNull();
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain(session.access_token);
}
test.describe('required account, real local Auth and Postgres', () => {
  test.skip(!api || !key || !mail, 'Requires configured isolated local stack');
  test('sign-in gates legacy data; save, export, reload and sign-out', async ({ page }) => {
    const session = await syntheticUser();
    await page.addInitScript(legacy => localStorage.setItem('ciso-journey-v1', legacy), legacy);
    await page.goto('./');
    await expect(page.getByRole('button', {name:'Sign in with GitHub'})).toBeVisible();
    await expect(page.locator('#roadmap')).toBeHidden();
    await login(page, session);
    await page.locator('.task input').first().check();
    await expect(page.locator('#statTasks')).toHaveText('1');
    const download = page.waitForEvent('download');
    await page.getByRole('button', {name:'Export backup'}).click();
    const backup = await fs.readFile(await (await download).path(), 'utf8');
    expect(backup).not.toContain(session.access_token); expect(backup).not.toContain(session.refresh_token);
    expect(await page.evaluate(() => localStorage.getItem('ciso-journey-v1'))).toBe(legacy);
    await page.getByRole('button', {name:'Sign out'}).click();
    await expect(page.getByRole('button', {name:'Sign in with GitHub'})).toBeVisible();
    await expect(page.locator('#roadmap')).toBeHidden();
  });
  test('server-revoked session clears private UI on the next write', async ({ page }) => {
    const session = await syntheticUser();
    await login(page, session);
    await page.locator('.task input').first().check();
    await expect(page.locator('#statTasks')).toHaveText('1');
    const response = await fetch(`${api}/auth/v1/logout`, { method:'POST', headers:{ apikey:key, Authorization:`Bearer ${session.access_token}` } });
    expect(response.ok).toBeTruthy();
    await page.locator('.task input').nth(1).check();
    await expect(page.getByRole('button', {name:'Sign in with GitHub'})).toBeVisible();
    await expect(page.locator('#roadmap')).toBeHidden();
    await expect(page.locator('#exportBtn')).toBeDisabled();
  });
  test('failed automatic refresh clears the active account and draft', async ({ page }) => {
    const session = await syntheticUser();
    session.expires_at = Math.floor(Date.now() / 1000) + 120;
    await page.clock.install();
    await login(page, session);
    await page.locator('.task input').first().check();
    await expect(page.locator('#statTasks')).toHaveText('1');
    const response = await fetch(`${api}/auth/v1/logout`, { method:'POST', headers:{ apikey:key, Authorization:`Bearer ${session.access_token}` } });
    expect(response.ok).toBeTruthy();
    const refresh = page.waitForResponse(r => r.url().includes('/auth/v1/token?grant_type=refresh_token'));
    await page.clock.runFor(65_000);
    expect((await refresh).ok()).toBeFalsy();
    await expect(page.getByRole('button', {name:'Sign in with GitHub'})).toBeVisible();
    await expect(page.locator('#roadmap')).toBeHidden();
    await expect(page.locator('#exportBtn')).toBeDisabled();
  });
  test('two accounts are isolated and stale saves do not replace progress', async ({ browser }) => {
    const [a,b] = await Promise.all([syntheticUser(), syntheticUser()]);
    const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
    try {
      const [first, stale, other] = await Promise.all(contexts.map(context => context.newPage()));
      await Promise.all([login(first, a), login(stale, a), login(other, b)]);
      await first.locator('.task input').first().check();
      await expect(first.locator('#statTasks')).toHaveText('1');
      await stale.locator('.task input').nth(1).click();
      await expect(stale.locator('#storageStatus')).toContainText('Progress changed elsewhere');
      await expect(stale.locator('#statTasks')).toHaveText('0');
      await stale.getByRole('button', {name:'Reload progress'}).click();
      await expect(stale.locator('#statTasks')).toHaveText('1');
      await expect(other.locator('#statTasks')).toHaveText('0');
    } finally { await Promise.all(contexts.map(context => context.close())); }
  });
  for (const suffix of ['?error=access_denied&error_description=denied', '#error=access_denied&error_description=denied', '?code=bad']) {
    test(`callback failure ${suffix} clears URL and blocks learning`, async ({page}) => {
      await page.goto(`./${suffix}`);
      await expect(page.locator('#accountStatus')).toContainText(/failed|verified/);
      expect(page.url()).not.toMatch(/error=|error_description=|code=bad/);
      await expect(page.locator('#roadmap')).toBeHidden();
      await expect(page.locator('#exportBtn')).toBeDisabled();
    });
  }
});

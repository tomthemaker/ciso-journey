const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const api = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const mail = 'http://127.0.0.1:29521';
const mixed = require('./fixtures/v1/mixed-progress.json');
async function syntheticUser() {
  const email = `account-${randomUUID()}@example.test`;
  const request = (path, body) => fetch(`${api}${path}`, { method:'POST', headers:{ apikey:key, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
  expect((await request('/auth/v1/otp', { email, create_user:true })).ok).toBeTruthy();
  for (let i = 0; i < 30; i++) {
    const inbox = await (await fetch(`${mail}/api/v1/messages`)).json();
    const message = inbox.messages.find(m => m.To.some(t => t.Address === email));
    if (message) {
      const detail = await (await fetch(`${mail}/api/v1/message/${message.ID}`)).json();
      const url = new URL(detail.HTML.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&'));
      const response = await request('/auth/v1/verify', { token_hash:url.searchParams.get('token'), type:url.searchParams.get('type') });
      expect(response.ok).toBeTruthy();
      return response.json();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Synthetic mail not received');
}
test.describe('local real Auth sessions (synthetic email fixtures, not GitHub OAuth)', () => {
  test.skip(!api || !key, 'Requires isolated local Supabase and public build configuration');
  test('separate local and verified account profiles, backup and sign-out', async ({ page }) => {
    const [a,b] = await Promise.all([syntheticUser(), syntheticUser()]);
    const authKey = `ciso-journey-auth:${encodeURIComponent(api.replace(/\/+$/, ''))}`;
    const raw = JSON.stringify(mixed.data, null, 2);
    await page.addInitScript(raw => localStorage.setItem('ciso-journey-v1', raw), raw);
    await page.goto('./');
    await expect(page.locator('#statTasks')).toHaveText('19');
    await page.evaluate(({authKey, session}) => localStorage.setItem(authKey, JSON.stringify(session)), {authKey, session:a});
    await page.reload();
    await expect(page.locator('#accountStatus')).toContainText('Account profile');
    await expect(page.locator('#statTasks')).toHaveText('0');
    await page.locator('.task input').first().check();
    await expect(page.locator('#statTasks')).toHaveText('1');
    const download = page.waitForEvent('download');
    await page.getByRole('button', {name:'Export backup'}).click();
    const backup = await fs.readFile(await (await download).path(), 'utf8');
    expect(backup).not.toContain(a.access_token);
    expect(backup).not.toContain(a.refresh_token);
    await page.evaluate(({authKey, session}) => localStorage.setItem(authKey, JSON.stringify(session)), {authKey, session:b});
    await page.reload();
    await expect(page.locator('#accountStatus')).toContainText('Account profile');
    await expect(page.locator('#statTasks')).toHaveText('0');
    await page.evaluate(({authKey, session}) => localStorage.setItem(authKey, JSON.stringify(session)), {authKey, session:a});
    await page.reload();
    await expect(page.locator('#statTasks')).toHaveText('1');
    await page.getByRole('button', {name:'Sign out'}).click();
    await expect(page.locator('#accountStatus')).toContainText('Local profile');
    await expect(page.locator('#statTasks')).toHaveText('19');
    expect(await page.evaluate(() => localStorage.getItem('ciso-journey-v1'))).toBe(raw);
  });
  test('GitHub PKCE redirect and failed callback clear URL and block account profile', async ({ page }) => {
    await page.goto('./');
    const request = page.waitForRequest(r => r.url().includes('/auth/v1/authorize'));
    await page.route('**/auth/v1/authorize**', route => route.fulfill({status:200, body:'synthetic provider'}));
    await page.getByRole('button', {name:'Sign in with GitHub'}).click();
    const url = new URL((await request).url());
    expect(url.searchParams.get('provider')).toBe('github');
    expect(url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:4174/ciso-journey/');
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    await page.goto('/ciso-journey/?code=invalid#roadmap');
    await expect(page.locator('#accountStatus')).toContainText('callback could not be verified');
    expect(new URL(page.url()).searchParams.has('code')).toBeFalsy();
    await expect(page.locator('#roadmap')).toBeHidden();
  });
});

test('session changed while verification is pending cannot show old profile', async ({ browser }) => {
  test.skip(!api || !key, 'Requires isolated local Supabase');
  const a = await syntheticUser();
  const context = await browser.newContext({ baseURL:'http://127.0.0.1:4174/ciso-journey/' });
  const first = await context.newPage();
  const authKey = `ciso-journey-auth:${encodeURIComponent(api.replace(/\/+$/, ''))}`;
  await first.goto('./');
  await first.evaluate(({authKey, session}) => localStorage.setItem(authKey, JSON.stringify(session)), {authKey, session:a});
  await first.reload();
  await expect(first.locator('#accountStatus')).toContainText('Account profile');
  await first.locator('.task input').first().check();
  await expect(first.locator('#statTasks')).toHaveText('1');
  const second = await context.newPage();
  let unblock;
  const gate = new Promise(resolve => { unblock = resolve; });
  let requested;
  const reached = new Promise(resolve => { requested = resolve; });
  await second.route('**/auth/v1/user', async route => {
    const response = await route.fetch();
    requested();
    await gate;
    await route.fulfill({ response });
  });
  await second.goto('./', {waitUntil:'domcontentloaded'});
  await reached;
  // Simulate another tab removing the session while Auth verification is in flight.
  await first.evaluate(authKey => localStorage.removeItem(authKey), authKey);
  unblock();
  await expect(second.locator('#accountStatus')).toContainText('Account changed while loading');
  await expect(second.locator('#roadmap')).toBeHidden();
  await context.close();
});

test('unconfigured account keeps local study available', async ({ page }) => {
  test.skip(Boolean(api || key), 'Requires a build without account configuration');
  await page.goto('./');
  await expect(page.locator('#accountStatus')).toContainText('not configured');
  await expect(page.getByRole('button', {name:'Sign in with GitHub'})).toBeHidden();
  await expect(page.locator('#roadmap')).toBeVisible();
});

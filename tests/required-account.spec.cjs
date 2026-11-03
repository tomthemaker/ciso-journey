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
  await page.addInitScript(({verifier, legacy}) => { sessionStorage.setItem(verifier, JSON.stringify('synthetic-verifier')); localStorage.setItem('ciso-journey-v1', legacy); }, {verifier, legacy});
  await page.route('**/auth/v1/token?grant_type=pkce', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(session) }));
  await page.goto('./?code=synthetic');
  await expect(page.locator('#accountStatus')).toContainText('Signed in');
  await expect(page.locator('#statTasks')).toHaveText('0');
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

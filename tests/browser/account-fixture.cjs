// Local-only browser fixture. Synthetic email Auth is real; only GitHub's PKCE
// exchange is replaced. All identity verification and account RPCs hit Postgres.
const { test: base, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const credentials = new WeakMap();
function config() {
  const api = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY, mail = process.env.TEST_MAIL_URL;
  if (!api || !key || !mail) throw new Error('Browser checks require a running isolated local Auth/Postgres stack: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and TEST_MAIL_URL. No database is provisioned by this command or CI.');
  if (![api, mail].every(url => ['127.0.0.1', 'localhost'].includes(new URL(url).hostname))) throw new Error('Browser fixtures require loopback-only synthetic services.');
  return { api: api.replace(/\/+$/, ''), key, mail };
}
async function request(session, name, body = {}) {
  const { api, key } = config();
  const response = await fetch(`${api}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Synthetic account RPC ${name} failed (${response.status})`);
  return response.json();
}
async function syntheticUser() {
  const { api, key, mail } = config(), email = `browser-${randomUUID()}@example.test`;
  const post = (path, body) => fetch(`${api}/auth/v1/${path}`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const sent = await post('otp', { email, create_user: true });
  if (!sent.ok) throw new Error(`Synthetic email request failed (${sent.status})`);
  for (let attempt = 0; attempt < 80; attempt++) {
    const inbox = await (await fetch(`${mail}/api/v1/messages`)).json();
    const message = inbox.messages.find(message => message.To.some(to => to.Address === email));
    if (message) {
      const detail = await (await fetch(`${mail}/api/v1/message/${message.ID}`)).json();
      const url = new URL(detail.HTML.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&'));
      const verified = await post('verify', { token_hash: url.searchParams.get('token'), type: url.searchParams.get('type') });
      if (!verified.ok) throw new Error(`Synthetic email verification failed (${verified.status})`);
      const session = await verified.json();
      if (!session.user?.email_confirmed_at) throw new Error('Expected verified synthetic identity');
      return session;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Synthetic email not received');
}
async function preparePage(page, session) {
  const { api, key } = config(); credentials.set(page, session);
  await page.addInitScript(api => {
    if (new URL(location.href).searchParams.get('code') === 'synthetic-browser') {
      sessionStorage.setItem(`ciso-journey-auth:${encodeURIComponent(api)}-code-verifier`, JSON.stringify({ value: JSON.stringify('synthetic-verifier'), expires: Date.now() + 600_000 }));
    }
  }, api);
  await page.route('**/auth/v1/token?grant_type=pkce', async route => {
    // Keep scheduler clock-travel tests independent of Auth's refresh timer. The
    // real access token is unchanged and verified by live Auth/Postgres.
    const now = await page.evaluate(() => Date.now());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...session, expires_at: Math.floor(now / 1000) + 90 * 86400, expires_in: 90 * 86400 }) });
  });
  const goto = page.goto.bind(page);
  page.goto = (target, options) => {
    const url = new URL(target, 'http://127.0.0.1:4174/ciso-journey/');
    url.searchParams.set('code', 'synthetic-browser');
    return goto(url.href, options);
  };
  // A document reload has no persistent Auth session by design. Explicitly
  // simulate a new successful provider redirect to the same account for these
  // feature regressions; raw reload/sign-out gates are in required-account.
  page.reload = options => page.goto(page.url(), options);
  return { subject: session.user.id, token: session.access_token, project: api, key };
}
async function snapshot(page) {
  await expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
  const value = await request(credentials.get(page), 'account_load');
  return { schemaVersion: 2, revision: value.revision, data: JSON.parse(value.snapshot).data };
}
async function seedServerState(page, data) {
  const session = credentials.get(page), current = await request(session, 'account_load');
  return request(session, 'account_save', { p_expected_revision: current.revision, p_snapshot: JSON.stringify({ schemaVersion: 2, data }) });
}
async function openReviews(page) {
  const session = credentials.get(page), { api, key } = config();
  await page.evaluate(async account => {
    const module = await import('./__review-harness.js');
    window.reviews = await module.openReviews({ ...account, invalidate: () => { throw new Error('Synthetic review identity invalidated'); } });
  }, { subject: session.user.id, token: session.access_token, project: api, key });
}
async function failWrites(page, kind = 'http') {
  const requests = [];
  const handler = async route => {
    requests.push(route.request().postDataJSON());
    if (kind === 'network') await route.abort('failed');
    else await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic server unavailable' }) });
  };
  await page.route('**/rest/v1/rpc/account_{save,reset}', handler);
  return { requests, restore: () => page.unroute('**/rest/v1/rpc/account_{save,reset}', handler) };
}
async function reloadProgress(page) {
  await page.locator('#retryStorageBtn').click();
  await expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
  await expect(page.locator('#storageStatus')).toContainText('Progress loaded');
}
const test = base.extend({
  context: async ({ context }, use) => {
    const session = await syntheticUser(), newPage = context.newPage.bind(context);
    context.newPage = async (...args) => { const page = await newPage(...args); await preparePage(page, session); return page; };
    await use(context);
    // Only this test's synthetic account is removed, through its public owner API.
    try { const current = await request(session, 'account_load'); await request(session, 'account_close', { p_expected_revision: current.revision }); } catch { /* A revocation/closure test can already have removed access. */ }
  },
});
module.exports = { test, expect, snapshot, syntheticUser, preparePage, seedServerState, openReviews, failWrites, reloadProgress };

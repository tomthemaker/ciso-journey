const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const bundle = require('../content/foundation.v1.json');
const cards = bundle.records.filter(r => r.kind === 'card' && !bundle.records.some(other => other.id === r.id && other.version > r.version));
const first = cards[0];
const ready = page => expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
async function snapshot(page) {
  await ready(page);
  return page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('ciso-journey', 1);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('snapshots'), read = tx.objectStore('snapshots').get('current');
      tx.oncomplete = () => { db.close(); resolve(read.result); };
    };
  }));
}
async function deck(page) {
  const details = page.locator('#todayDeck');
  if (!await details.evaluate(el => el.open)) await details.locator('summary').click();
}
async function enroll(page, all = true) {
  await deck(page);
  await page.locator(all ? '#todayEnrollAll' : '#enroll-' + first.id + '-' + first.version).click(); await ready(page);
}
async function cap(page, limit) {
  await deck(page); await page.locator('#todayCap').fill(String(limit));
  await page.getByRole('button', { name: 'Save new-card limit', exact: true }).click(); await ready(page);
}
async function exported(page) {
  const download = page.waitForEvent('download'); await page.locator('#exportBtn').click();
  return JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
}
async function imported(page, backup) {
  const accept = d => d.accept(); page.on('dialog', accept);
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-today.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue(''); page.off('dialog', accept);
}
test('Today connects original reading, question and case; keyboard review and all five namespaces survive restart/export/import', async ({ page }) => {
  await page.goto('./#today'); await ready(page);
  const original = await snapshot(page);
  await expect(page.locator('#todayPrompt')).toHaveCount(0); // Enrollment is explicit.
  await enroll(page); await cap(page, 1);
  await expect(page.locator('#todayQueue')).toContainText('0 due or overdue reviews before 1 allowed new cards');
  await expect(page.locator('#todayTime')).toContainText('planning assumptions');
  await expect(page.locator('#todayAnswer, #todayRateAgain, #todayRateHard, #todayRateGood, #todayRateEasy')).toHaveCount(0);
  await page.locator('#todayStudy').getByRole('link', { name: /^Original lesson:/ }).click();
  await page.locator('#readingComplete').click(); await ready(page);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.locator('#todayStudy').getByRole('link', { name: /^Related question:/ }).click();
  await page.locator('input[name="answer"]').first().check();
  await page.locator('#submitAttempt').click(); await ready(page);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.locator('#todayStudy').getByRole('link', { name: /^Optional executive case:/ }).click();
  for (const key of ['impact', 'options', 'accountableOwner', 'recommendation', 'residualRisk']) await page.locator('#case-' + key).fill('Synthetic daily loop ' + key);
  await page.getByLabel('Evidence title', { exact: true }).fill('Synthetic daily practice');
  await page.locator('#saveCaseResponse').click(); await ready(page);
  const form = page.getByRole('form', { name: 'Self-assess case response 1' });
  for (const select of await form.locator('select').all()) await select.selectOption('1');
  await form.getByRole('button', { name: 'Save case self-assessment' }).click(); await ready(page);
  await page.getByRole('button', { name: 'Roadmap', exact: true }).click();
  await page.locator('#w1-resources > summary').click();
  const resource = page.locator('[data-resource-id="w1-official"]');
  await resource.getByLabel('Resource status', { exact: true }).selectOption('completed');
  await resource.getByLabel('Completion date').fill('2026-10-28');
  await resource.getByRole('button', { name: 'Save resource progress' }).click(); await ready(page);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
  await page.locator('#todayReveal').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#todayAnswer')).toBeFocused();
  await expect(page.locator('#todayAnswer')).toHaveText(first.payload.answer);
  await page.locator('#todayRateGood').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#todayMessage')).toContainText('Good saved');
  await expect(page.locator('#todayQueueHeading')).toBeFocused();
  await expect(page.locator('#todaySignals')).toContainText('Reading: 1/4');
  await expect(page.locator('#todaySignals')).toContainText('Resources: 1 marked completed');
  await expect(page.locator('#todaySignals')).toContainText('Tasks: 0/37');
  await expect(page.locator('#todaySignals')).toContainText('Recall: 1 saved ratings');
  await expect(page.locator('#todaySignals')).toContainText('Questions: 1 attempts');
  await expect(page.locator('#todaySignals')).toContainText('Applied assessment: 1 case responses; 1 case rubric self-assessments');
  const saved = await snapshot(page);
  expect(saved.data.completed).toEqual(original.data.completed); expect(saved.data.scores).toEqual(original.data.scores);
  const backup = await exported(page); expect(backup.data).toEqual(saved.data);
  await page.reload(); await ready(page); expect((await snapshot(page)).data).toEqual(saved.data);
  await cap(page, 0); await imported(page, backup); await page.reload(); await ready(page);
  expect((await snapshot(page)).data).toEqual(saved.data);
  await expect(page.locator('#todayQueue')).toContainText('0 allowed new cards');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for (const refresh of ['button', 'tab return']) test(`unrevealed new card yields to a newly due review on ${refresh} with a positive cap`, async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T08:00:00.000Z') });
  await page.goto('./#today'); await ready(page); await enroll(page);
  await page.locator('#todayReveal').click(); await page.locator('#todayRateAgain').click();
  await expect(page.locator('#todayMessage')).toContainText('Again saved');
  await expect(page.locator('#todayPrompt')).toHaveText(cards[1].payload.prompt);
  const before = await snapshot(page);
  // The installed clock still ticks during UI work; advance past the actual committed due instant.
  await page.clock.setSystemTime(new Date(Date.parse(before.data.reviewProgress.cards[0].schedule.due) + 1000));
  if (refresh === 'button') await page.locator('#todayRefresh').click();
  else {
    await page.getByRole('button', { name: 'Roadmap', exact: true }).click();
    await page.getByRole('button', { name: 'Today', exact: true }).click();
  }
  await expect(page.locator('#todayQueue')).toContainText('1 due or overdue reviews before 4 allowed new cards');
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
  await expect(page.locator('#todayAnswer, #todayRateGood')).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  await page.locator('#todayReveal').click(); await page.locator('#todayRateGood').click();
  await expect(page.locator('#todayMessage')).toContainText('Good saved');
  const saved = await snapshot(page);
  expect(saved.data.reviewProgress.events.map(event => [event.contentRef.id, event.rating])).toEqual([[first.id, 'Again'], [first.id, 'Good']]);
  await expect(page.locator('#todayPrompt')).toHaveText(cards[1].payload.prompt);
});
test('newly due work preserves a revealed prompt and failed rating; retry and duplicate clicks commit one immutable answer', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T08:00:00.000Z') });
  await page.goto('./#today'); await ready(page); await enroll(page);
  await page.locator('#todayReveal').click(); await page.locator('#todayRateAgain').click();
  await expect(page.locator('#todayMessage')).toContainText('Again saved');
  await expect(page.locator('#todayPrompt')).toHaveText(cards[1].payload.prompt);
  const before = await snapshot(page);
  await page.locator('#todayReveal').click();
  // The installed clock still ticks during UI work; advance past the actual committed due instant.
  await page.clock.setSystemTime(new Date(Date.parse(before.data.reviewProgress.cards[0].schedule.due) + 1000));
  await page.locator('#todayRefresh').click();
  await expect(page.locator('#todayQueue')).toContainText('1 due or overdue reviews before 4 allowed new cards');
  await expect(page.locator('#todayAnswer')).toHaveText(cards[1].payload.answer);
  await page.evaluate(() => {
    window.todayPut = IDBObjectStore.prototype.put;
    window.abortToday = true;
    window.todayAttempts = [];
    IDBObjectStore.prototype.put = function (...args) {
      window.todayAttempts.push(structuredClone(args[0].data.reviewProgress.events.at(-1)));
      const request = window.todayPut.apply(this, args);
      request.addEventListener('success', () => { if (window.abortToday) this.transaction.abort(); }); return request;
    };
  });
  await page.locator('#todayRateHard').click();
  await expect(page.locator('#todayMessage')).toContainText('Review not saved');
  await expect(page.locator('#todayAnswer')).toHaveText(cards[1].payload.answer);
  await expect(page.locator('#todayRateHard')).toBeEnabled();
  for (const rating of ['Again', 'Good', 'Easy']) await expect(page.locator('#todayRate' + rating)).toBeDisabled();
  expect(await snapshot(page)).toEqual(before);
  await page.clock.setSystemTime(new Date('2026-10-28T08:02:02.000Z'));
  await page.locator('#todayRefresh').click();
  await expect(page.locator('#todayAnswer')).toHaveText(cards[1].payload.answer);
  await expect(page.locator('#todayRateHard')).toBeEnabled();
  await page.evaluate(() => { window.abortToday = false; document.querySelector('#todayRateHard').click(); document.querySelector('#todayRateHard').click(); });
  await expect(page.locator('#todayMessage')).toContainText('Hard saved');
  const saved = await snapshot(page);
  expect(saved.data.reviewProgress.events).toHaveLength(2);
  expect(saved.data.reviewProgress.events[0]).toEqual(before.data.reviewProgress.events[0]);
  expect(new Set(saved.data.reviewProgress.events.map(event => event.id)).size).toBe(2);
  const answer = saved.data.reviewProgress.events[1];
  expect(answer.rating).toBe('Hard');
  expect(answer.contentRef.id).toBe(cards[1].id);
  const attempts = await page.evaluate(() => window.todayAttempts);
  expect(attempts).toHaveLength(2);
  expect(answer).toEqual(attempts[0]); // Exact ID/time/rating/schedule from the aborted write, despite the later clock.
  expect(attempts[1]).toEqual(attempts[0]);
  expect(saved.data.reviewProgress.cards[1].schedule).toEqual(answer.after);
  expect(saved.revision).toBe(before.revision + 1);
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
  await page.reload(); await ready(page);
  expect((await snapshot(page)).data).toEqual(saved.data);
  await expect(page.locator('#todayAnswer')).toHaveCount(0);
});
test('missed days retain overdue priority at zero cap; suspend/archive/restore retain schedules and exact history', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T08:00:00.000Z') });
  await page.goto('./#today'); await ready(page); await enroll(page); await cap(page, 1);
  await page.locator('#todayReveal').click(); await page.locator('#todayRateAgain').click();
  await expect(page.locator('#todayMessage')).toContainText('Again saved');
  await cap(page, 0);
  await page.clock.setSystemTime(new Date('2026-11-07T08:00:00.000Z'));
  await page.reload(); await ready(page);
  await expect(page.locator('#todayQueue')).toContainText('1 due or overdue reviews before 0 allowed new cards');
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
  const before = await snapshot(page); await deck(page);
  await page.locator('#suspended-' + first.id + '-' + first.version).click(); await ready(page);
  await expect(page.locator('#todayPrompt')).toHaveCount(0);
  await deck(page); await page.locator('#archived-' + first.id + '-' + first.version).click(); await ready(page);
  await page.locator('#active-' + first.id + '-' + first.version).click(); await ready(page);
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
  const restored = await snapshot(page);
  expect(restored.data.reviewProgress.cards).toEqual(before.data.reviewProgress.cards);
  expect(restored.data.reviewProgress.events).toEqual(before.data.reviewProgress.events);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('daily cap refreshes at local midnight and newly due reviews appear without reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00.000Z') });
  await page.goto('./#today'); await ready(page); await enroll(page); await cap(page, 1);
  await page.locator('#todayReveal').click(); await page.locator('#todayRateAgain').click();
  await expect(page.locator('#todayQueue')).toContainText('0 allowed new cards');
  await page.clock.fastForward(61000);
  await page.locator('#todayRefresh').click();
  await expect(page.locator('#todayQueue')).toContainText('1 due or overdue reviews before 0 allowed new cards');
  // Jump past every timezone's next local midnight, then manually refresh (also available to keyboard users).
  await page.clock.setSystemTime(new Date('2026-10-30T12:00:00.000Z'));
  await page.locator('#todayRefresh').click();
  await expect(page.locator('#todayQueue')).toContainText('1 due or overdue reviews before 1 allowed new cards');
  await expect(page.locator('#todayPrompt')).toHaveText(first.payload.prompt);
});


test('bulk enrollment leaves an archived earlier revision unchanged; the newer revision is explicit', async ({ page }) => {
  const { enrollCard, applyReview, setCardStatus } = await import('../src/reviews.ts');
  await page.goto('./#today'); await ready(page);
  const backup = await exported(page), old = { id: first.id, version: first.version - 1 };
  enrollCard(backup.data, old, '2026-10-28T08:00:00.000Z');
  applyReview(backup.data, { eventId: 'synthetic-old-review', contentRef: old, rating: 'Good', now: '2026-10-28T08:01:00.000Z' });
  setCardStatus(backup.data, old, 'archived');
  const prior = structuredClone(backup.data.reviewProgress);
  await imported(page, backup); await ready(page); await deck(page);
  await expect(page.locator('#active-' + old.id + '-' + old.version)).toBeVisible();
  await page.locator('#todayEnrollAll').click(); await ready(page);
  const afterBulk = (await snapshot(page)).data.reviewProgress;
  expect(afterBulk.cards.find(item => item.contentRef.id === old.id)).toEqual(prior.cards[0]);
  expect(afterBulk.events).toEqual(prior.events);
  expect(afterBulk.cards.some(item => item.contentRef.id === first.id && item.contentRef.version === first.version)).toBe(false);
  await expect(page.locator('#enroll-' + first.id + '-' + first.version)).toHaveText('Enroll this revision');
  await page.locator('#enroll-' + first.id + '-' + first.version).click(); await ready(page);
  const afterExplicit = (await snapshot(page)).data.reviewProgress;
  expect(afterExplicit.cards.find(item => item.contentRef.id === old.id && item.contentRef.version === old.version)).toEqual(prior.cards[0]);
  expect(afterExplicit.events).toEqual(prior.events);
  expect(afterExplicit.cards.find(item => item.contentRef.id === first.id && item.contentRef.version === first.version).schedule.reps).toBe(0);
});

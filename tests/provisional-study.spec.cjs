const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const { studyBundle: bundle } = require('../scripts/study-content.cjs');
const { latestRecords, taskContent } = require('../src/content-catalog.ts');
const { contentKey, findContent } = require('../src/content.ts');
const ready = page => expect(page.locator('body')).toHaveAttribute('data-storage-busy', 'false');
async function snapshot(page) {
  await ready(page);
  return page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('ciso-journey', 1);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('snapshots'), get = tx.objectStore('snapshots').get('current');
      tx.oncomplete = () => { db.close(); resolve(get.result.data); };
    };
  }));
}
async function practice(page, question) {
  const preview = page.locator('.practice-preview').filter({ has: page.locator(`a[href="#questions/${question.id}/${question.version}"]`) });
  await preview.locator('summary').click(); await preview.getByRole('link', { name: 'Attempt this question' }).click();
  await expect(page.locator('#questionHeading')).toHaveText(question.title);
}

test('all eight new weekly task paths expose exact lessons, prerequisites, reading and explained MCQs on Pages', async ({ page }) => {
  test.setTimeout(90000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('./#lessons'); await ready(page);
  await expect(page.locator('.lesson-index .lesson-catalog li')).toHaveCount(latestRecords(bundle, 'lesson').length);
  const before = await snapshot(page);
  for (const lesson of latestRecords(bundle, 'lesson').filter(record => /^w\d+$/.test(record.taskIds[0])).slice(4)) {
    const task = lesson.taskIds[0];
    await page.goto(`./#roadmap/${task}`); await ready(page);
    await page.locator(`#${task}-study > summary`).click();
    await page.locator(`#${task}-study a[href="#lessons/${lesson.id}/${lesson.version}"]`).click();
    await expect(page.locator('#readerHeading')).toHaveText(lesson.title);
    await expect(page.locator('.lesson-body')).toContainText('Provisional draft');
    for (const ref of lesson.payload.prerequisiteRefs) await expect(page.locator(`.lesson-body a[href="#lessons/${ref.id}/${ref.version}"]`).first()).toBeVisible();
    await page.locator('#readingComplete').click(); await ready(page);
    const question = lesson.payload.practiceRefs.map(ref => findContent(bundle, ref)).find(record => record.kind === 'question' && record.payload.format === 'mcq');
    await practice(page, question);
    await page.locator('#answer-' + question.payload.correctOptionId).check(); await page.locator('#submitAttempt').click();
    await expect(page.locator('.option-feedback li')).toHaveCount(question.payload.options.length);
    for (const option of question.payload.options) await expect(page.locator('.option-feedback')).toContainText(option.explanation);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('./#questions');
  await expect(page.locator('#questionBank .lesson-catalog li')).toHaveCount(latestRecords(bundle, 'question').length);
  const saved = await snapshot(page);
  expect(saved.readingProgress.entries).toHaveLength(8); expect(saved.questionAttempts.attempts).toHaveLength(8);
  expect(saved.completed).toEqual(before.completed); expect(saved.scores).toEqual(before.scores);
  expect(saved.reviewProgress).toBeUndefined(); expect(saved.scenarioResponses).toBeUndefined(); expect(errors).toEqual([]);
});

test('new constructed feedback, explicit card review and all six competency cases self-assess and fully round-trip', async ({ page }) => {
  test.setTimeout(90000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const lesson = taskContent(bundle, 'w12', 'lesson')[0];
  await page.goto(`./#lessons/${lesson.id}/${lesson.version}`); await ready(page);
  const before = await snapshot(page);
  await page.locator('#readingComplete').click(); await ready(page);
  const question = lesson.payload.practiceRefs.map(ref => findContent(bundle, ref)).find(record => record.kind === 'question' && record.payload.format === 'open');
  await practice(page, question);
  await expect(page.getByRole('heading', { name: 'Annotated example', exact: true })).toHaveCount(0);
  await page.locator('#questionResponse').fill('Synthetic integrated response: identify the assumption, decision owner, bounded test and revisit trigger.');
  await page.locator('#submitAttempt').click();
  await expect(page.locator('.attempt-result')).toContainText(question.payload.annotatedExample);
  const questionForm = page.getByRole('form', { name: 'Self-assess attempt 1' });
  for (const select of await questionForm.locator('select').all()) await select.selectOption({ index: 1 });
  await questionForm.getByRole('button', { name: 'Save rubric self-assessment' }).click(); await ready(page);
  await page.goto(`./#lessons/${lesson.id}/${lesson.version}`);
  const card = taskContent(bundle, 'w12', 'card')[0];
  await page.locator(`a[href="#today/card/${card.id}/${card.version}"]`).click();
  await expect(page.locator('#todayDeck')).toHaveAttribute('open');
  await expect(page.locator('#todayDeck')).toContainText(`Selected card: ${card.title}`);
  expect((await snapshot(page)).reviewProgress).toBeUndefined();
  await page.locator(`#enroll-${card.id}-${card.version}`).click(); await ready(page);
  await expect(page.locator('#todayPrompt')).toHaveText(card.payload.prompt);
  await page.locator('#todayReveal').click(); await expect(page.locator('#todayAnswer')).toHaveText(card.payload.answer);
  await page.locator('#todayRateGood').click(); await expect(page.locator('#todayMessage')).toContainText('Good saved');
  await page.goto('./#cases'); await expect(page.locator('#caseBank .lesson-catalog li')).toHaveCount(latestRecords(bundle, 'scenario').length);
  for (const scenario of latestRecords(bundle, 'scenario').filter(record => record.id.startsWith('scenario-a02-'))) {
    await page.goto(`./#roadmap/${scenario.taskIds[0]}`); await ready(page);
    const study = page.locator(`#${scenario.taskIds[0]}-study`);
    if (!await study.evaluate(element => element.open)) await study.locator('summary').click();
    await study.locator(`a[href="#cases/${scenario.id}/${scenario.version}"]`).click();
    await expect(page.locator('#caseHeading')).toHaveText(scenario.title);
    await expect(page.locator('.case-body')).toContainText('Provisional AI-authored teaching');
    await page.locator('.case-example summary').click();
    await expect(page.locator('.case-example')).toContainText(scenario.payload.annotatedExample);
    for (const key of ['impact', 'options', 'accountableOwner', 'recommendation', 'residualRisk']) await page.locator('#case-' + key).fill(`Synthetic ${scenario.id} ${key}: bounded decision and evidence limitation.`);
    await page.getByLabel('Evidence title', { exact: true }).fill('Synthetic worksheet for ' + scenario.id);
    await page.locator('#saveCaseResponse').click();
    const form = page.getByRole('form', { name: 'Self-assess case response 1' });
    for (const select of await form.locator('select').all()) await select.selectOption({ index: 1 });
    await form.getByRole('button', { name: 'Save case self-assessment' }).click(); await ready(page);
    await expect(page.locator('.case-result')).toContainText(contentKey(scenario.payload.rubricRef));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const saved = await snapshot(page);
  expect(saved.completed).toEqual(before.completed); expect(saved.scores).toEqual(before.scores);
  expect(saved.readingProgress.entries).toHaveLength(1); expect(saved.questionAttempts.attempts).toHaveLength(1);
  expect(saved.questionAttempts.selfAssessments).toHaveLength(1); expect(saved.reviewProgress.events).toHaveLength(1);
  expect(saved.scenarioResponses.responses).toHaveLength(6); expect(saved.scenarioResponses.selfAssessments).toHaveLength(6);
  for (const response of saved.scenarioResponses.responses) expect(response.rubricRef).toEqual(findContent(bundle, response.contentRef).payload.rubricRef);
  const download = page.waitForEvent('download'); await page.locator('#exportBtn').click();
  const backup = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
  expect(backup.data).toEqual(saved);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-complete-study.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue(''); await page.reload(); await ready(page);
  expect(await snapshot(page)).toEqual(saved);
  await page.goto('./#progress'); await expect(page.locator('#progressReport')).toContainText('6 case responses');
  expect(await snapshot(page)).toEqual(saved); expect(errors).toEqual([]);
});

test('p2a task opens pinned reading, questions, explicit cards and five-decision practice under Pages', async ({ page }) => {
  const lesson = taskContent(bundle, 'p2a', 'lesson')[0];
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('./#roadmap/p2a'); await ready(page);
  const before = await snapshot(page);
  await page.locator('#p2a-study > summary').click();
  await page.locator(`#p2a-study a[href="#lessons/${lesson.id}/${lesson.version}"]`).click();
  await expect(page.locator('#readerHeading')).toHaveText(lesson.title);
  await expect(page.locator('.lesson-body')).toContainText('Provisional draft');
  for (const ref of lesson.payload.prerequisiteRefs) await expect(page.locator(`.lesson-body a[href="#lessons/${ref.id}/${ref.version}"]`).first()).toBeVisible();
  await page.locator('#readingComplete').click(); await ready(page);
  await page.reload(); await ready(page);
  await expect(page.locator('#readerHeading')).toHaveText(lesson.title);
  await expect(page.locator('#readingStatus')).toContainText('Reading complete for this revision');
  for (const question of taskContent(bundle, 'p2a', 'question')) {
    await page.goto(`./#lessons/${lesson.id}/${lesson.version}`);
    await practice(page, question);
    if (question.payload.format === 'mcq') {
      await page.locator('#answer-' + question.payload.correctOptionId).check();
      await page.locator('#submitAttempt').click();
      for (const option of question.payload.options) await expect(page.locator('.option-feedback')).toContainText(option.explanation);
    } else {
      await expect(page.getByRole('heading', { name: 'Annotated example', exact: true })).toHaveCount(0);
      await page.locator('#questionResponse').fill('Synthetic p2a decision: name authority, failed limit, interim action and evidence review.');
      await page.locator('#submitAttempt').click();
      await expect(page.locator('.attempt-result')).toContainText(question.payload.annotatedExample);
      const form = page.getByRole('form', { name: 'Self-assess attempt 1' });
      for (const select of await form.locator('select').all()) await select.selectOption({ index: 1 });
      await form.getByRole('button', { name: 'Save rubric self-assessment' }).click(); await ready(page);
    }
  }
  await page.goto(`./#lessons/${lesson.id}/${lesson.version}`);
  const card = taskContent(bundle, 'p2a', 'card')[0];
  await page.locator(`a[href="#today/card/${card.id}/${card.version}"]`).click();
  expect((await snapshot(page)).reviewProgress).toBeUndefined();
  await page.locator(`#enroll-${card.id}-${card.version}`).click(); await ready(page);
  await expect(page.locator('#todayPrompt')).toHaveText(card.payload.prompt);
  await page.locator('#todayReveal').click(); await expect(page.locator('#todayAnswer')).toHaveText(card.payload.answer);
  await page.locator('#todayRateGood').click(); await ready(page);
  const scenario = taskContent(bundle, 'p2a', 'scenario')[0];
  await page.goto(`./#roadmap/p2a`); await ready(page);
  const study = page.locator('#p2a-study');
  if (!await study.evaluate(element => element.open)) await study.locator('summary').click();
  await study.locator(`a[href="#cases/${scenario.id}/${scenario.version}"]`).click();
  await expect(page.locator('#caseHeading')).toHaveText(scenario.title);
  await expect(page.locator('.case-body')).toContainText(scenario.payload.deliverable);
  for (const key of ['impact', 'options', 'accountableOwner', 'recommendation', 'residualRisk']) await page.locator('#case-' + key).fill(`Synthetic p2a ${key}: decision rights and bounded follow-up.`);
  await page.locator('#saveCaseResponse').click();
  const form = page.getByRole('form', { name: 'Self-assess case response 1' });
  for (const select of await form.locator('select').all()) await select.selectOption({ index: 1 });
  await form.getByRole('button', { name: 'Save case self-assessment' }).click(); await ready(page);
  const saved = await snapshot(page);
  expect(saved.completed).toEqual(before.completed); expect(saved.scores).toEqual(before.scores);
  expect(saved.readingProgress.entries).toHaveLength(1);
  expect(saved.questionAttempts.attempts).toHaveLength(5); expect(saved.questionAttempts.selfAssessments).toHaveLength(3);
  expect(saved.reviewProgress.events).toHaveLength(1);
  expect(saved.scenarioResponses.responses[0].contentRef).toEqual({ id: scenario.id, version: scenario.version });
  expect(saved.scenarioResponses.selfAssessments).toHaveLength(1);
  const download = page.waitForEvent('download'); await page.locator('#exportBtn').click();
  const backup = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
  expect(backup.data).toEqual(saved);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#importFile').setInputFiles({ name: 'synthetic-p2a.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#importFile')).toHaveValue(''); await page.reload(); await ready(page);
  expect(await snapshot(page)).toEqual(saved);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

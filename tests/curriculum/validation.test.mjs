import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCurriculum, validateCurriculum } from '../../scripts/validate-curriculum.mjs';

const rejects = (mutate, expected) => {
  const candidate = loadCurriculum(); mutate(candidate);
  assert.match(validateCurriculum(candidate).join('\n'), expected);
};
test('complete candidate preserves actual task meanings and all coverage', () => assert.deepEqual(validateCurriculum(loadCurriculum()), []));
test('invented legacy IDs fail', () => rejects(data => { data.tasks[0].id = 'p1a'; }, /actual 37 task IDs/));
test('changed legacy outcome fails', () => rejects(data => { data.tasks[0].legacyOutcome = 'Finish a course'; }, /Legacy meaning changed/));
test('task prerequisite cycle fails', () => rejects(data => { data.tasks[0].prerequisiteTaskIds = ['w12']; }, /Task prerequisites: cycle/));
test('objective prerequisite cycle fails', () => rejects(data => { data.objectives[0].prerequisiteObjectiveIds = ['obj-w1-2']; }, /Objective prerequisites: cycle/));
test('unknown objective source fails', () => rejects(data => { data.objectives[0].sourceIds.push('unverified-blog'); }, /unknown reference unverified-blog/));
test('unsupported framework precision fails', () => rejects(data => { data.tasks[0].frameworkMappings[1].targetIds = ['A.8.99']; }, /unknown reference A.8.99/));
test('missing assessment evidence fails', () => rejects(data => { data.objectives[0].assessmentPlan.criteria = []; }, /Assessment plan incomplete/));
test('unrecorded framework replacement fails', () => rejects(data => { data.mappingPolicy.transitions = []; }, /Missing transition gate/));
test('missing explicit curriculum domain fails', () => rejects(data => { for (const task of data.tasks) task.domainIds = task.domainIds.filter(id => id !== 'd08'); }, /Uncovered domain d08/));
test('independent review cannot be silently asserted', () => rejects(data => { data.authorship.independentEducatorReview = 'AI author'; }, /no independent educator\/legal review/));

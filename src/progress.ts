import { contentKey, findContent } from './content.ts';
import type { ContentBundle } from './content.ts';
import { resolveRubric } from './question-attempts.ts';
import { estimatedRecall, localDay } from './reviews.ts';
import { phases } from './data.ts';
import { quarter } from './portfolio.ts';
import type { LearnerState } from './types.ts';

/** Inclusive local calendar window, with UTC instants capped at the snapshot instant. */
export function windowStart(now: string, timeZone: string, days = 30): string {
  const day = localDay(now, timeZone);
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return date.toISOString().slice(0, 10);
}
export function projectProgress(state: LearnerState, bundle: ContentBundle, now: string, timeZone: string, windowDays = 30) {
  const start = windowStart(now, timeZone, windowDays), end = localDay(now, timeZone), cutoff = Date.parse(now);
  const past = (date: string) => Date.parse(date) <= cutoff;
  const within = (date: string) => past(date) && localDay(date, timeZone) >= start && localDay(date, timeZone) <= end;
  const reviews = state.reviewProgress?.events ?? [];
  const windowReviews = reviews.filter(e => within(e.reviewedAt));
  const latest = new Map<string, typeof reviews[number]>();
  for (const e of reviews.filter(e => past(e.reviewedAt))) {
    const key = contentKey(e.contentRef), old = latest.get(key);
    if (!old || old.reviewedAt < e.reviewedAt) latest.set(key, e);
  }
  const estimates = (state.reviewProgress?.cards ?? []).flatMap(card => {
    const event = latest.get(contentKey(card.contentRef));
    if (card.status !== 'active' || !event) return [];
    const estimate = estimatedRecall({ ...card, schedule: event.after }, now);
    return estimate === undefined ? [] : [estimate];
  });
  const attempts = state.questionAttempts?.attempts ?? [];
  const mcq = attempts.filter(a => a.format === 'mcq' && within(a.submittedAt));
  const allMcq = attempts.filter(a => a.format === 'mcq' && past(a.submittedAt));
  const retries = mcq.filter(a => allMcq.some(b => contentKey(a.contentRef) === contentKey(b.contentRef) && (b.submittedAt < a.submittedAt || (b.submittedAt === a.submittedAt && allMcq.indexOf(b) < allMcq.indexOf(a))))).length;
  const days = new Map<string, { reviews: number; successful: number; mcq: number; correct: number }>();
  for (const e of windowReviews) { const d = localDay(e.reviewedAt, timeZone), v = days.get(d) ?? { reviews: 0, successful: 0, mcq: 0, correct: 0 }; v.reviews++; if (e.rating !== 'Again') v.successful++; days.set(d, v); }
  for (const a of mcq) { const d = localDay(a.submittedAt, timeZone), v = days.get(d) ?? { reviews: 0, successful: 0, mcq: 0, correct: 0 }; v.mcq++; if (a.correct) v.correct++; days.set(d, v); }
  const assessments = [...(state.questionAttempts?.selfAssessments ?? []), ...(state.scenarioResponses?.selfAssessments ?? [])].filter(a => within(a.assessedAt));
  const groups = new Map<string, { rubric: string; criterion: string; description: string; anchors: Map<string, number> }>();
  let unavailable = 0;
  for (const assessment of assessments) {
    const rubric = resolveRubric(bundle, assessment.rubricRef);
    for (const rating of assessment.ratings) {
      const criterion = rubric?.payload.criteria.find(c => c.id === rating.criterionId);
      const level = criterion?.levels.find(l => l.score === rating.score);
      if (!criterion || !level) { unavailable++; continue; }
      const key = `${contentKey(assessment.rubricRef)}:${rating.criterionId}`;
      const group = groups.get(key) ?? { rubric: contentKey(assessment.rubricRef), criterion: rating.criterionId, description: criterion.description, anchors: new Map<string, number>() };
      const label = `${localDay(assessment.assessedAt, timeZone)} — ${rating.score}: ${level.descriptor}`;
      group.anchors.set(label, (group.anchors.get(label) ?? 0) + 1); groups.set(key, group);
    }
  }
  const resources = state.resourceProgress?.entries ?? [];
  const latestResource = resources.map(e => e.progress.filter(p => past(p.recordedAt)).at(-1)).filter(p => p !== undefined);
  // Portfolio dates are calendar dates, unlike the UTC instants above. Evidence
  // metadata has no creation date, so it can only be reported as a snapshot.
  const portfolio = state.portfolio;
  const eligibleAppraisals = (portfolio?.appraisals ?? []).filter(a => a.date <= end);
  const responseById = new Map((state.scenarioResponses?.responses ?? []).filter(r => past(r.submittedAt)).map(r => [r.id, r]));
  const evidenceById = new Map((portfolio?.evidence ?? []).map(e => [e.id, e]));
  const priorByScope = new Map<string, typeof eligibleAppraisals[number]>();
  const appraisalHistory = [...eligibleAppraisals].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).map(a => {
    const scopeKey = JSON.stringify([a.competency, a.provenance, a.scope]);
    const prior = priorByScope.get(scopeKey);
    priorByScope.set(scopeKey, a);
    return {
      id: a.id, date: a.date, quarter: quarter(a.date), competency: a.competency,
      provenance: a.provenance, level: a.level, scope: a.scope, rationale: a.rationale,
      inWindow: a.date >= start,
      priorSameScope: prior ? { date: prior.date, level: prior.level } : undefined,
      evidence: a.evidenceIds.map(id => ({ id, title: evidenceById.get(id)?.title, available: evidenceById.has(id) })),
      responses: a.responseIds.map(id => {
        const response = responseById.get(id);
        return { id, submittedAt: response?.submittedAt, scenario: response && contentKey(response.contentRef),
          rubric: response && contentKey(response.rubricRef),
          scenarioAvailable: !!response && findContent(bundle, response.contentRef)?.kind === 'scenario',
          rubricAvailable: !!response && resolveRubric(bundle, response.rubricRef) !== undefined };
      })
    };
  });
  const future = reviews.filter(e => !past(e.reviewedAt)).length + attempts.filter(a => !past(a.submittedAt)).length +
    (state.questionAttempts?.selfAssessments ?? []).filter(a => !past(a.assessedAt)).length +
    (state.scenarioResponses?.responses ?? []).filter(a => !past(a.submittedAt)).length +
    (state.scenarioResponses?.selfAssessments ?? []).filter(a => !past(a.assessedAt)).length +
    resources.flatMap(e => e.progress).filter(e => !past(e.recordedAt)).length +
    (portfolio?.appraisals ?? []).filter(a => a.date > end).length;
  const missingReviews = windowReviews.filter(e => findContent(bundle, e.contentRef)?.kind !== 'card').length;
  const missingQuestions = mcq.filter(a => findContent(bundle, a.contentRef)?.kind !== 'question').length;
  return { start, end, now, timeZone, future, missingReviews, missingQuestions, days: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)), reviews: { total: windowReviews.length, successful: windowReviews.filter(e => e.rating !== 'Again').length, failed: windowReviews.filter(e => e.rating === 'Again').length, unique: new Set(windowReviews.map(e => contentKey(e.contentRef))).size },
    estimates, mcq: { total: mcq.length, correct: mcq.filter(a => a.correct).length, retries, unique: new Set(mcq.map(a => contentKey(a.contentRef))).size },
    responses: { questions: attempts.filter(a => a.format !== 'mcq' && within(a.submittedAt)).length, cases: (state.scenarioResponses?.responses ?? []).filter(a => within(a.submittedAt)).length },
    assessments: { count: assessments.length, groups: [...groups.values()], unavailable },
    tasks: { done: phases.flatMap(p => p.tasks).filter(t => state.completed[t[0]]).length, total: phases.flatMap(p => p.tasks).length },
    reading: state.readingProgress?.entries.filter(e => e.completed).length ?? 0,
    resources: { tracked: resources.length, completed: latestResource.filter(p => p.status === 'completed').length, inProgress: latestResource.filter(p => p.status === 'in-progress').length, evidence: latestResource.filter(p => p.evidenceUrl || p.notes.trim()).length },
    portfolio: { evidence: portfolio?.evidence.length ?? 0, total: appraisalHistory.length,
      inWindow: appraisalHistory.filter(a => a.inWindow).length, history: appraisalHistory },
    caseEvidence: (state.scenarioResponses?.responses ?? []).filter(r => past(r.submittedAt) && (r.response.evidence.title || r.response.evidence.url || r.response.evidence.notes)).length,
    scores: Object.entries(state.scores) };
}

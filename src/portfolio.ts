import { safeHttps } from './content.ts';
import { competencies } from './data.ts';
import type { LearnerState } from './types.ts';

export interface Evidence { id: string; title: string; url: string; notes: string; [key: string]: unknown }
export interface Appraisal { id: string; date: string; competency: string; level: 'Recognize' | 'Explain' | 'Apply' | 'Lead'; provenance: 'self-assessment'; scope: string; rationale: string; evidenceIds: string[]; responseIds: string[]; [key: string]: unknown }
export interface Portfolio { schemaVersion: 1; evidence: Evidence[]; appraisals: Appraisal[]; [key: string]: unknown }
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const unique = (values: string[]): boolean => new Set(values).size === values.length;
function invalid(): never { throw new Error('Invalid or unsupported portfolio. Current progress has not changed.'); }
export function validatePortfolio(value: unknown, state: LearnerState): asserts value is Portfolio {
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.evidence) || !Array.isArray(value.appraisals)) invalid();
  const evidence = new Set<string>(), appraisals = new Set<string>();
  for (const e of value.evidence) {
    if (!object(e) || !text(e.id) || evidence.has(e.id) || !text(e.title) || typeof e.notes !== 'string' || typeof e.url !== 'string' || (e.url !== '' && !safeHttps(e.url))) invalid();
    evidence.add(e.id);
  }
  for (const a of value.appraisals) {
    if (!object(a) || !text(a.id) || appraisals.has(a.id) || !date(a.date) || !competencies.some(([name]) => name === a.competency) ||
      typeof a.level !== 'string' || !['Recognize', 'Explain', 'Apply', 'Lead'].includes(a.level) || a.provenance !== 'self-assessment' || !text(a.scope) || !text(a.rationale) ||
      !Array.isArray(a.evidenceIds) || !a.evidenceIds.every(text) || !unique(a.evidenceIds) || !a.evidenceIds.every(id => evidence.has(id)) ||
      !Array.isArray(a.responseIds) || !a.responseIds.every(text) || !unique(a.responseIds) || !a.responseIds.every(id => state.scenarioResponses?.responses.some(r => r.id === id))) invalid();
    appraisals.add(a.id);
  }
}
export function appendEvidence(state: LearnerState, item: Evidence): void {
  const portfolio: Portfolio = structuredClone(state.portfolio ?? { schemaVersion: 1, evidence: [], appraisals: [] });
  portfolio.evidence.push(structuredClone(item)); validatePortfolio(portfolio, state); state.portfolio = portfolio;
}
export function appendAppraisal(state: LearnerState, item: Appraisal): void {
  const portfolio: Portfolio = structuredClone(state.portfolio ?? { schemaVersion: 1, evidence: [], appraisals: [] });
  portfolio.appraisals.push(structuredClone(item)); validatePortfolio(portfolio, state); state.portfolio = portfolio;
}
export function quarter(date: string): string { return `${date.slice(0, 4)} Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`; }

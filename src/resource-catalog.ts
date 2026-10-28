import { taskLearningResources } from './data.ts';
import type { ResourceDefinition } from './resource-progress.ts';
/** IDs are task-specific slots, never URLs or array positions. Replacements get new IDs. */
export function taskResources(taskId: string): ResourceDefinition[] {
  const source = taskLearningResources[taskId];
  if (!source) return [];
  const records: ResourceDefinition[] = [
    { id: `${taskId}-linkedin`, taskId, isCustom: false, title: source.linkedinTitle, platform: 'LinkedIn Learning', url: source.linkedinUrl, type: 'course' },
    { id: `${taskId}-official`, taskId, isCustom: false, title: source.officialTitle, platform: 'Official reference', url: source.officialUrl, type: 'reference' },
  ];
  if (['p2a', 'p2b', 'p2c', 'p2d', 'p2e', 'p3a', 'p3b', 'p3c', 'p3d', 'p3e'].includes(taskId)) records.push({ id: `${taskId}-coursera-governance`, taskId, isCustom: false, title: 'Cybersecurity Governance and Compliance', platform: 'Coursera', url: 'https://www.coursera.org/learn/cybersecurity-governance-compliance', type: 'course' });
  return records;
}

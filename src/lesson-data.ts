import bundle from '../content/foundation.v1.json';
import curriculum from '../curriculum/c01.v1.json';
import type { ContentBundle } from './content';
import manifest from '../content/provisional-study.manifest.json';
import { composeContent } from './content-catalog';

// Only explicitly pinned artifacts enter study; an unlisted future draft is not enrolled or exposed.
const drafts = import.meta.glob<ContentBundle>('../docs/curriculum/drafts/*.json', { eager: true, import: 'default' });
export const lessonBundle = composeContent(manifest.contentVersion, [bundle as unknown as ContentBundle,
  ...manifest.artifacts.map(artifact => {
    const draft = drafts[`../${artifact.path}`];
    if (!draft) throw new Error(`Missing study artifact: ${artifact.path}`);
    return draft;
  })]);
export const lessonObjectives = curriculum.objectives;

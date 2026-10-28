import bundle from '../content/foundation.v1.json';
import curriculum from '../curriculum/c01.v1.json';
import type { ContentBundle } from './content';
export const lessonBundle = bundle as unknown as ContentBundle;
export const lessonObjectives = curriculum.objectives;

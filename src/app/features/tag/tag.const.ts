import { Tag } from './tag.model';
import {
  DEFAULT_TAG_COLOR,
  DEFAULT_TODAY_TAG_COLOR,
  WORK_CONTEXT_DEFAULT_COMMON,
  WORK_CONTEXT_DEFAULT_THEME,
} from '../work-context/work-context.const';

/**
 * TODAY_TAG is a "virtual tag" - it behaves differently from regular tags:
 *
 * 1. Should NOT be in task.tagIds - membership is determined by task.dueDay
 * 2. TODAY_TAG.taskIds stores the ordering of today's tasks
 * 3. Move operations (drag/drop, Ctrl+↑/↓) work uniformly via tag.reducer.ts
 *
 * This pattern keeps the work context system simple while separating
 * "today" ordering (TODAY_TAG.taskIds) from future days (planner.days).
 *
 * See: docs/ai/today-tag-architecture.md
 */
export const TODAY_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'wb_sunny',
  title: 'Today',
  id: 'TODAY',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    isAutoContrast: true,
    huePrimary: '400',
    hueAccent: '500',
    hueWarn: '500',
    primary: DEFAULT_TODAY_TAG_COLOR,
    // backgroundImageDark: 'assets/bg/NIGHT_manuel-will.jpg',
    backgroundImageDark: '',
    isDisableBackgroundTint: true,
  },
};

export const DEFAULT_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: null,
  title: '',
  id: '',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TAG_COLOR,
  },
};

// TODO translate
export const URGENT_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'emergency',
  title: 'urgent',
  id: 'EM_URGENT',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: '#c618e1',
    backgroundImageDark: '',
    isDisableBackgroundTint: false,
  },
};

export const IMPORTANT_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'priority_high',
  title: 'important',
  id: 'EM_IMPORTANT',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: '#e11826',
    backgroundImageDark: '',
    isDisableBackgroundTint: false,
  },
};

export const IN_PROGRESS_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  title: 'in-progress',
  id: 'KANBAN_IN_PROGRESS',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    backgroundImageDark: '',
    isDisableBackgroundTint: false,
  },
};

export const WORK_AREA_TAG: Tag = {
  color: null,
  created: 1000,
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'work',
  title: 'Work',
  id: 'AREA_WORK',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: '#1565C0',
    backgroundImageDark: '',
    isDisableBackgroundTint: true,
  },
};

export const SCHOOL_AREA_TAG: Tag = {
  color: null,
  created: 1001,
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'school',
  title: 'School',
  id: 'AREA_SCHOOL',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: '#6A1B9A',
    backgroundImageDark: '',
    isDisableBackgroundTint: true,
  },
};

export const HEALTH_AREA_TAG: Tag = {
  color: null,
  created: 1002,
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'favorite',
  title: 'Health',
  id: 'AREA_HEALTH',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: '#2E7D32',
    backgroundImageDark: '',
    isDisableBackgroundTint: true,
  },
};

export const PERSONAL_AREA_TAG: Tag = {
  color: null,
  created: 1003,
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'person',
  title: 'Personal',
  id: 'AREA_PERSONAL',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: '#E65100',
    backgroundImageDark: '',
    isDisableBackgroundTint: true,
  },
};

export const DEFAULT_AREA_TAGS: Tag[] = [
  WORK_AREA_TAG,
  SCHOOL_AREA_TAG,
  HEALTH_AREA_TAG,
  PERSONAL_AREA_TAG,
];

/**
 * IDs of system-created tags that should be excluded when counting user-created tags.
 * These tags are created automatically and don't represent user data.
 */
export const SYSTEM_TAG_IDS: ReadonlySet<string> = new Set([
  TODAY_TAG.id,
  URGENT_TAG.id,
  IMPORTANT_TAG.id,
  IN_PROGRESS_TAG.id,
]);

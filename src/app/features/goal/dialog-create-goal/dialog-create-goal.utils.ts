import { GoalHorizon } from '../goal.model';

export type MeasureType = 'COUNT' | 'TIME' | 'STREAK';
export type TargetPer = 'DAY' | 'WEEK' | 'MONTH';
export type CascadeDirection = 'TOP_DOWN' | 'BOTTOM_UP';

export interface CascadeLevel {
  horizon: GoalHorizon;
  title: string;
  targetCount?: number;
  targetMs?: number;
}

/**
 * Builds the cascade of goal levels from user input.
 *
 * TOP_DOWN: user enters yearly/monthly/weekly target → cascades down.
 * BOTTOM_UP: user enters a per-day (or per-week/month) rate → calculates up to yearly.
 *
 * Both modes derive a per-day rate then compute all horizon targets from it.
 */
export const buildCascadeGoals = (
  title: string,
  measureType: MeasureType,
  targetValue: number,
  targetPer: TargetPer,
  selectedLevels: Set<GoalHorizon>,
): CascadeLevel[] => {
  if (!title.trim() || targetValue <= 0) return [];

  // Convert target to per-day rate regardless of direction
  const perDay =
    targetPer === 'DAY'
      ? targetValue
      : targetPer === 'WEEK'
        ? targetValue / 7
        : targetValue / 30;

  const levels: GoalHorizon[] = ['YEARLY', 'MONTHLY', 'WEEKLY'];
  const targets: Record<GoalHorizon, number> = {
    AREA: 0, // unused — areas are containers
    DAILY: 0, // unused — daily goals are just recurring tasks
    WEEKLY: Math.round(perDay * 7),
    MONTHLY: Math.round(perDay * 30),
    YEARLY: Math.round(perDay * 365),
  };

  return levels
    .filter((h) => selectedLevels.has(h))
    .map((horizon) => {
      const raw = targets[horizon];
      if (measureType === 'TIME') {
        const hours =
          horizon === 'WEEKLY'
            ? perDay * 7
            : horizon === 'MONTHLY'
              ? perDay * 30
              : perDay * 365;
        return {
          horizon,
          title,
          targetMs: Math.round(hours * 3600000),
        };
      } else {
        const suffix =
          horizon === 'WEEKLY'
            ? `${raw}x/week`
            : horizon === 'MONTHLY'
              ? `${raw}x/month`
              : `${raw}x/year`;
        return {
          horizon,
          title: `${title} — ${suffix}`,
          targetCount: raw,
        };
      }
    });
};

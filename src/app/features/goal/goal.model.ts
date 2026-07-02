import { EntityState } from '@ngrx/entity';

export type GoalHorizon = 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY';
export type GoalUnit = 'COMPLETIONS' | 'MS';
export type MissedWeekBehavior = 'FORGIVE' | 'REDISTRIBUTE' | 'MANUAL';

export interface GoalCopy {
  id: string;
  title: string;
  parentGoalId?: string;
  horizon: GoalHorizon;
  targetCount?: number;
  targetMs?: number;
  unit?: GoalUnit;
  linkedRepeatCfgId?: string;
  linkedTaskIds: string[];
  weeklyIntention?: string;
  missedWeekBehavior: MissedWeekBehavior;
  color?: string;
  created: number;
  dueDate?: string;
}

export type Goal = Readonly<GoalCopy>;
export type GoalState = EntityState<Goal>;

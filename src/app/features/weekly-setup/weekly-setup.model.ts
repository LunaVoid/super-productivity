import { EntityState } from '@ngrx/entity';

export interface WeeklyReviewCopy {
  id: string;
  weekStr: string;
  intentions: string[];
  topTaskIds: string[];
  focusProjectId?: string;
  created: number;
}

export type WeeklyReview = Readonly<WeeklyReviewCopy>;
export type WeeklyReviewState = EntityState<WeeklyReview>;

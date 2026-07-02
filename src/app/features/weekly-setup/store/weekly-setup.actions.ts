import { createAction } from '@ngrx/store';
import { WeeklyReview } from '../weekly-setup.model';
import { PersistentActionMeta } from '../../../op-log/core/persistent-action.interface';
import { OpType } from '../../../op-log/core/operation.types';

export const saveWeeklyReview = createAction(
  '[WeeklySetup] Save Weekly Review',
  (props: { review: WeeklyReview }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'WEEKLY_REVIEW',
      entityId: props.review.id,
      opType: OpType.Create,
    } satisfies PersistentActionMeta,
  }),
);

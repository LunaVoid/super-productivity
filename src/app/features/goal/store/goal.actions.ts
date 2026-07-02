import { createAction } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Goal } from '../goal.model';
import { PersistentActionMeta } from '../../../op-log/core/persistent-action.interface';
import { OpType } from '../../../op-log/core/operation.types';

export const addGoal = createAction('[Goal] Add Goal', (props: { goal: Goal }) => ({
  ...props,
  meta: {
    isPersistent: true,
    entityType: 'GOAL',
    entityId: props.goal.id,
    opType: OpType.Create,
  } satisfies PersistentActionMeta,
}));

export const updateGoal = createAction(
  '[Goal] Update Goal',
  (props: { goal: Update<Goal> }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'GOAL',
      entityId: props.goal.id as string,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const deleteGoal = createAction('[Goal] Delete Goal', (props: { id: string }) => ({
  ...props,
  meta: {
    isPersistent: true,
    entityType: 'GOAL',
    entityId: props.id,
    opType: OpType.Delete,
  } satisfies PersistentActionMeta,
}));

export const linkTaskToGoal = createAction(
  '[Goal] Link Task to Goal',
  (props: { goalId: string; taskId: string }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'GOAL',
      entityId: props.goalId,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const unlinkTaskFromGoal = createAction(
  '[Goal] Unlink Task from Goal',
  (props: { goalId: string; taskId: string }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'GOAL',
      entityId: props.goalId,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

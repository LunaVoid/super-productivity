/**
 * Verifies that every goal action type string is registered in the ActionType enum
 * and has a compact code in ACTION_TYPE_TO_CODE.
 *
 * This test catches the exact bug where a new action is dispatched but not
 * registered, causing OperationLogEffects to throw at runtime.
 */
import { ActionType } from '../../../op-log/core/action-types.enum';
import { ACTION_TYPE_TO_CODE } from '../../../op-log/persistence/compact/action-type-codes';
import {
  addGoal,
  deleteGoal,
  linkTaskToGoal,
  unlinkTaskFromGoal,
  updateGoal,
} from './goal.actions';
import { Goal } from '../goal.model';

const makeGoal = (): Goal => ({
  id: 'g1',
  title: 'Test',
  horizon: 'WEEKLY',
  linkedTaskIds: [],
  missedWeekBehavior: 'FORGIVE',
  created: 1000,
});

const goalActions = [
  addGoal({ goal: makeGoal() }),
  updateGoal({ goal: { id: 'g1', changes: { title: 'x' } } }),
  deleteGoal({ id: 'g1' }),
  linkTaskToGoal({ goalId: 'g1', taskId: 't1' }),
  unlinkTaskFromGoal({ goalId: 'g1', taskId: 't1' }),
];

const allActionTypeValues = new Set(Object.values(ActionType) as string[]);

describe('Goal actions op-log registration', () => {
  goalActions.forEach((action) => {
    it(`"${action.type}" is in ActionType enum`, () => {
      expect(allActionTypeValues.has(action.type)).toBe(true);
    });

    it(`"${action.type}" has a compact code in ACTION_TYPE_TO_CODE`, () => {
      const code = ACTION_TYPE_TO_CODE[action.type as ActionType];
      expect(code).toBeTruthy();
    });
  });
});

import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { Goal, GoalState } from '../goal.model';
import { createFeatureSelector, createReducer, on } from '@ngrx/store';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import {
  addGoal,
  deleteGoal,
  linkTaskToGoal,
  unlinkTaskFromGoal,
  updateGoal,
} from './goal.actions';

export const GOAL_FEATURE_NAME = 'goal';

export const goalAdapter: EntityAdapter<Goal> = createEntityAdapter<Goal>();

export const selectGoalFeatureState = createFeatureSelector<GoalState>(GOAL_FEATURE_NAME);

export const { selectIds, selectEntities, selectAll, selectTotal } =
  goalAdapter.getSelectors();

export const initialGoalState: GoalState = goalAdapter.getInitialState();

export const goalReducer = createReducer<GoalState>(
  initialGoalState,

  // META ACTIONS
  on(loadAllData, (oldState, { appDataComplete }) => {
    const loaded = (appDataComplete as Record<string, unknown>)['goal'] as
      | GoalState
      | undefined;
    return loaded ? { ...loaded } : oldState;
  }),

  // CRUD
  on(addGoal, (state, { goal }) => goalAdapter.addOne(goal, state)),

  on(updateGoal, (state, { goal }) => goalAdapter.updateOne(goal, state)),

  on(deleteGoal, (state, { id }) => goalAdapter.removeOne(id, state)),

  // LINK / UNLINK
  on(linkTaskToGoal, (state, { goalId, taskId }) => {
    const goal = state.entities[goalId];
    if (!goal) return state;
    if (goal.linkedTaskIds.includes(taskId)) return state;
    return goalAdapter.updateOne(
      { id: goalId, changes: { linkedTaskIds: [...goal.linkedTaskIds, taskId] } },
      state,
    );
  }),

  on(unlinkTaskFromGoal, (state, { goalId, taskId }) => {
    const goal = state.entities[goalId];
    if (!goal) return state;
    return goalAdapter.updateOne(
      {
        id: goalId,
        changes: { linkedTaskIds: goal.linkedTaskIds.filter((id) => id !== taskId) },
      },
      state,
    );
  }),
);

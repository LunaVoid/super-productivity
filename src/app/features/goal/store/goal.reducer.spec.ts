import { goalReducer, initialGoalState } from './goal.reducer';
import {
  addGoal,
  deleteGoal,
  linkTaskToGoal,
  unlinkTaskFromGoal,
  updateGoal,
} from './goal.actions';
import { Goal } from '../goal.model';

const makeGoal = (partial: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  title: 'Test Goal',
  horizon: 'WEEKLY',
  linkedTaskIds: [],
  missedWeekBehavior: 'FORGIVE',
  created: 1000,
  ...partial,
});

describe('goalReducer', () => {
  it('should return initial state for unknown action', () => {
    const state = goalReducer(undefined, { type: '@@UNKNOWN' } as never);
    expect(state).toEqual(initialGoalState);
  });

  it('should add a goal', () => {
    const goal = makeGoal();
    const state = goalReducer(initialGoalState, addGoal({ goal }));
    expect(state.ids).toContain('g1');
    expect(state.entities['g1']).toEqual(goal);
  });

  it('should update a goal', () => {
    const goal = makeGoal();
    let state = goalReducer(initialGoalState, addGoal({ goal }));
    state = goalReducer(
      state,
      updateGoal({ goal: { id: 'g1', changes: { title: 'Updated' } } }),
    );
    expect(state.entities['g1']!.title).toBe('Updated');
  });

  it('should delete a goal', () => {
    const goal = makeGoal();
    let state = goalReducer(initialGoalState, addGoal({ goal }));
    state = goalReducer(state, deleteGoal({ id: 'g1' }));
    expect(state.ids).not.toContain('g1');
  });

  it('should link a task to a goal', () => {
    const goal = makeGoal();
    let state = goalReducer(initialGoalState, addGoal({ goal }));
    state = goalReducer(state, linkTaskToGoal({ goalId: 'g1', taskId: 't1' }));
    expect(state.entities['g1']!.linkedTaskIds).toContain('t1');
  });

  it('should not duplicate linked task ids', () => {
    const goal = makeGoal({ linkedTaskIds: ['t1'] });
    let state = goalReducer(initialGoalState, addGoal({ goal }));
    state = goalReducer(state, linkTaskToGoal({ goalId: 'g1', taskId: 't1' }));
    expect(state.entities['g1']!.linkedTaskIds.length).toBe(1);
  });

  it('should unlink a task from a goal', () => {
    const goal = makeGoal({ linkedTaskIds: ['t1', 't2'] });
    let state = goalReducer(initialGoalState, addGoal({ goal }));
    state = goalReducer(state, unlinkTaskFromGoal({ goalId: 'g1', taskId: 't1' }));
    expect(state.entities['g1']!.linkedTaskIds).not.toContain('t1');
    expect(state.entities['g1']!.linkedTaskIds).toContain('t2');
  });
});

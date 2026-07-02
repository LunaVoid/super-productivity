import { createSelector, MemoizedSelector } from '@ngrx/store';
import { goalAdapter, selectGoalFeatureState } from './goal.reducer';
import { Goal, GoalState } from '../goal.model';
import { selectTaskEntities } from '../../tasks/store/task.selectors';
import { Task } from '../../tasks/task.model';

export const {
  selectIds: selectGoalIds,
  selectEntities: selectGoalEntities,
  selectAll: selectAllGoals,
  selectTotal: selectTotalGoals,
} = goalAdapter.getSelectors(selectGoalFeatureState);

export const selectGoalById = createSelector(
  selectGoalFeatureState,
  (state, props: { id: string }): Goal => {
    const goal = state.entities[props.id];
    if (!goal) throw new Error('No goal ' + props.id);
    return goal;
  },
);

export const selectFocusedGoals = createSelector(selectAllGoals, (goals) =>
  goals.filter((g) => g.isFocusedThisWeek),
);

export const selectGoalsByHorizon = createSelector(
  selectAllGoals,
  (goals, props: { horizon: Goal['horizon'] }) =>
    goals.filter((g) => g.horizon === props.horizon),
);

export const selectChildGoals = createSelector(
  selectAllGoals,
  (goals, props: { parentGoalId: string }) =>
    goals.filter((g) => g.parentGoalId === props.parentGoalId),
);

// ─── Progress Calculation ────────────────────────────────────────────────────

/** ISO week string for a date, e.g. "2026-W26" */
const isoWeek = (d: Date): string => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const daysDiff = (date.getTime() - yearStart.getTime()) / 86400000;
  const weekNo = Math.ceil((daysDiff + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

/**
 * Returns progress (completed units) for a goal in the current window.
 * - COMPLETIONS: count tasks linked to goal that were completed (doneOn set) in the
 *   current window (week/month/year based on horizon).
 * - MS: sum timeSpentOnDay values for all tasks linked to the goal within the window.
 * Window dates are computed from the current real date at selector-call time.
 * This is a pure selector — no effects needed.
 */
/**
 * Factory: creates a memoized selector for goal progress for a specific goalId and timestamp.
 * Use: store.selectSignal(selectGoalProgressFactory(goalId, nowTimestamp))
 */
/**
 * Factory: returns all non-done tasks linked to a specific goal (via goalId field or linkedTaskIds).
 */
export const selectTasksForGoalFactory = (
  goalId: string,
): MemoizedSelector<object, Task[]> =>
  createSelector(
    selectGoalFeatureState,
    selectTaskEntities,
    (goalState, taskEntities) => {
      const goal = goalState.entities[goalId];
      if (!goal) return [];
      const linkedIds = new Set(goal.linkedTaskIds);
      return (Object.values(taskEntities) as Array<Task | undefined>).filter(
        (t): t is Task =>
          !!t &&
          !t.isDone &&
          !t.parentId &&
          (linkedIds.has(t.id) || (t as Task & { goalId?: string }).goalId === goal.id),
      );
    },
  );

/** Collect all task IDs from a goal and all its descendants (BFS). */
const _collectAllLinkedTaskIds = (
  goalId: string,
  goalState: GoalState,
  taskEntities: Record<string, Task | undefined>,
): Set<string> => {
  const result = new Set<string>();
  const queue = [goalId];
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const g = goalState.entities[id];
    if (!g) continue;
    for (const tid of g.linkedTaskIds) result.add(tid);
    // Also pick up tasks that have goalId set directly
    for (const t of Object.values(taskEntities) as Array<Task | undefined>) {
      if (t && (t as Task & { goalId?: string }).goalId === id) result.add(t.id);
    }
    // Enqueue children
    for (const child of Object.values(goalState.entities) as Array<Goal | undefined>) {
      if (child && child.parentGoalId === id) queue.push(child.id);
    }
  }
  return result;
};

export const selectGoalProgressFactory = (
  goalId: string,
  nowTimestamp: number,
): MemoizedSelector<object, number> =>
  createSelector(
    selectGoalFeatureState,
    selectTaskEntities,
    (goalState, taskEntities) => {
      const goal = goalState.entities[goalId];
      if (!goal) return 0;

      const now = new Date(nowTimestamp);
      const year = now.getFullYear();
      const month = now.getMonth();

      // Collect tasks from this goal AND all descendant goals (rollup)
      const allLinkedIds = _collectAllLinkedTaskIds(goalId, goalState, taskEntities);
      const linkedTasks: Task[] = [...allLinkedIds]
        .map((id) => taskEntities[id])
        .filter((t): t is Task => !!t);

      if (goal.unit === 'MS') {
        let total = 0;
        for (const task of linkedTasks) {
          for (const [dayStr, ms] of Object.entries(task.timeSpentOnDay)) {
            if (isInWindow(dayStr, goal.horizon, year, month, now)) {
              total += ms as number;
            }
          }
        }
        return total;
      } else {
        let count = 0;
        for (const task of linkedTasks) {
          if (
            task.doneOn &&
            isTimestampInWindow(task.doneOn, goal.horizon, year, month)
          ) {
            count++;
          }
        }
        return count;
      }
    },
  );

const isTimestampInWindow = (
  ts: number,
  horizon: Goal['horizon'],
  year: number,
  month: number,
  now: Date = new Date(),
): boolean => {
  const d = new Date(ts);
  switch (horizon) {
    case 'YEARLY':
      return d.getFullYear() === year;
    case 'MONTHLY':
      return d.getFullYear() === year && d.getMonth() === month;
    case 'WEEKLY':
      return isoWeek(d) === isoWeek(now);
    case 'DAILY':
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === now.getDate()
      );
    case 'AREA':
      return false;
  }
};

const isInWindow = (
  dayStr: string,
  horizon: Goal['horizon'],
  year: number,
  month: number,
  now: Date,
): boolean => {
  const d = new Date(dayStr + 'T00:00:00');
  return isTimestampInWindow(d.getTime(), horizon, year, month, now);
};

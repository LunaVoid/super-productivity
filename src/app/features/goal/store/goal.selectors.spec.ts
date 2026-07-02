import {
  selectFocusedGoals,
  selectGoalProgressFactory,
  selectTasksForGoalFactory,
} from './goal.selectors';
import { GoalState } from '../goal.model';
import { EntityState } from '@ngrx/entity';
import { Task } from '../../tasks/task.model';

const NOW = new Date('2026-06-30T12:00:00').getTime(); // Tuesday of ISO week 27 (local time)

const makeGoalState = (partial: Partial<GoalState> = {}): GoalState => ({
  ids: ['g1'],
  entities: {
    g1: {
      id: 'g1',
      title: 'Exercise 4x/week',
      horizon: 'WEEKLY',
      unit: 'COMPLETIONS',
      targetCount: 4,
      linkedTaskIds: ['t1', 't2', 't3'],
      missedWeekBehavior: 'FORGIVE',
      created: 1000,
    },
  },
  ...partial,
});

const makeTaskEntities = (
  tasks: Array<Partial<Task> & { id: string }>,
): EntityState<Task>['entities'] => {
  const entities: EntityState<Task>['entities'] = {};
  for (const t of tasks) {
    entities[t.id] = {
      id: t.id,
      title: t.title ?? 'Task',
      projectId: 'p1',
      tagIds: [],
      subTaskIds: [],
      attachments: [],
      timeSpentOnDay: t.timeSpentOnDay ?? {},
      timeEstimate: 0,
      timeSpent: 0,
      created: 1000,
      doneOn: t.doneOn,
      isDone: !!t.doneOn,
      repeatCfgId: (t as any).repeatCfgId,
    } as unknown as Task;
  }
  return entities;
};

// Helper to call the projector of a factory selector
const callProgressProjector = (
  goalId: string,
  goalState: GoalState,
  taskEntities: EntityState<Task>['entities'],
): number => {
  const selector = selectGoalProgressFactory(goalId, NOW);
  return selector.projector(goalState, taskEntities);
};

const callTasksProjector = (
  goalId: string,
  goalState: GoalState,
  taskEntities: EntityState<Task>['entities'],
): Task[] => {
  const selector = selectTasksForGoalFactory(goalId);
  return selector.projector(goalState, taskEntities);
};

describe('selectGoalProgressFactory', () => {
  describe('COMPLETIONS goal', () => {
    it('counts tasks done within the current week', () => {
      const goalState = makeGoalState();
      // t1 done this week (2026-06-29), t2 done last week, t3 not done
      const taskEntities = makeTaskEntities([
        { id: 't1', doneOn: new Date('2026-06-29T12:00:00').getTime() }, // this week
        { id: 't2', doneOn: new Date('2026-06-22T12:00:00').getTime() }, // last week
        { id: 't3' },
      ]);
      const result = callProgressProjector('g1', goalState, taskEntities);
      expect(result).toBe(1);
    });

    it('counts multiple tasks done this week', () => {
      const goalState = makeGoalState();
      const taskEntities = makeTaskEntities([
        { id: 't1', doneOn: new Date('2026-06-29T12:00:00').getTime() },
        { id: 't2', doneOn: new Date('2026-06-30T12:00:00').getTime() },
        { id: 't3' },
      ]);
      const result = callProgressProjector('g1', goalState, taskEntities);
      expect(result).toBe(2);
    });

    it('returns 0 when no tasks done this week', () => {
      const goalState = makeGoalState();
      const taskEntities = makeTaskEntities([{ id: 't1' }, { id: 't2' }, { id: 't3' }]);
      const result = callProgressProjector('g1', goalState, taskEntities);
      expect(result).toBe(0);
    });
  });

  describe('MS goal', () => {
    it('sums timeSpentOnDay for current week', () => {
      const goalState = makeGoalState({
        entities: {
          g1: {
            id: 'g1',
            title: 'Work on website 5hrs',
            horizon: 'WEEKLY',
            unit: 'MS',
            targetMs: 18000000,
            linkedTaskIds: ['t1'],
            missedWeekBehavior: 'FORGIVE',
            created: 1000,
          },
        },
      });
      const timeSpentOnDay: Record<string, number> = {};
      timeSpentOnDay['2026-06-29'] = 3600000; // 1hr, this week
      timeSpentOnDay['2026-06-30'] = 1800000; // 30min, this week
      timeSpentOnDay['2026-06-22'] = 7200000; // 2hr, last week — should not count
      const taskEntities = makeTaskEntities([{ id: 't1', timeSpentOnDay }]);
      const result = callProgressProjector('g1', goalState, taskEntities);
      expect(result).toBe(5400000); // 1.5hr
    });
  });

  it('returns 0 for unknown goal', () => {
    const goalState = makeGoalState();
    const result = callProgressProjector('nonexistent', goalState, {});
    expect(result).toBe(0);
  });

  describe('progress rollup — parent goal counts tasks from child goals', () => {
    it('rolls up completions from child goals', () => {
      // g_year → g_month → g_week (hierarchy)
      // g_week has the actual linked task
      const goalState: GoalState = {
        ids: ['g_year', 'g_month', 'g_week'],
        entities: {
          g_year: {
            id: 'g_year',
            title: 'Get fit (yearly)',
            horizon: 'YEARLY',
            unit: 'COMPLETIONS',
            targetCount: 200,
            linkedTaskIds: [],
            missedWeekBehavior: 'FORGIVE',
            created: 1000,
          },
          g_month: {
            id: 'g_month',
            title: 'Get fit (monthly)',
            horizon: 'MONTHLY',
            unit: 'COMPLETIONS',
            targetCount: 16,
            parentGoalId: 'g_year',
            linkedTaskIds: [],
            missedWeekBehavior: 'FORGIVE',
            created: 1000,
          },
          g_week: {
            id: 'g_week',
            title: 'Get fit (weekly)',
            horizon: 'WEEKLY',
            unit: 'COMPLETIONS',
            targetCount: 4,
            parentGoalId: 'g_month',
            linkedTaskIds: ['t1', 't2'],
            missedWeekBehavior: 'FORGIVE',
            created: 1000,
          },
        },
      };

      const taskEntities = makeTaskEntities([
        { id: 't1', doneOn: new Date('2026-06-29T12:00:00').getTime() }, // this week
        { id: 't2', doneOn: new Date('2026-06-30T12:00:00').getTime() }, // this week
      ]);

      // Weekly goal counts 2
      expect(callProgressProjector('g_week', goalState, taskEntities)).toBe(2);
      // Monthly goal rolls up: sees t1 and t2, both done in June 2026
      expect(callProgressProjector('g_month', goalState, taskEntities)).toBe(2);
      // Yearly goal rolls up: same tasks done in 2026
      expect(callProgressProjector('g_year', goalState, taskEntities)).toBe(2);
    });

    it('does not double-count tasks that appear in both parent and child linkedTaskIds', () => {
      const goalState: GoalState = {
        ids: ['g_parent', 'g_child'],
        entities: {
          g_parent: {
            id: 'g_parent',
            title: 'Parent',
            horizon: 'YEARLY',
            unit: 'COMPLETIONS',
            targetCount: 10,
            linkedTaskIds: ['t1'], // also linked directly to parent
            missedWeekBehavior: 'FORGIVE',
            created: 1000,
          },
          g_child: {
            id: 'g_child',
            title: 'Child',
            horizon: 'WEEKLY',
            unit: 'COMPLETIONS',
            targetCount: 2,
            parentGoalId: 'g_parent',
            linkedTaskIds: ['t1', 't2'], // t1 in both
            missedWeekBehavior: 'FORGIVE',
            created: 1000,
          },
        },
      };

      const taskEntities = makeTaskEntities([
        { id: 't1', doneOn: new Date('2026-06-29T12:00:00').getTime() },
        { id: 't2', doneOn: new Date('2026-06-29T12:00:00').getTime() },
      ]);

      // Parent rollup should count 2 distinct tasks, not 3
      expect(callProgressProjector('g_parent', goalState, taskEntities)).toBe(2);
    });
  });
});

describe('selectTasksForGoalFactory', () => {
  it('returns non-done tasks linked to goal', () => {
    const goalState = makeGoalState();
    const taskEntities = makeTaskEntities([
      { id: 't1' },
      { id: 't2', doneOn: new Date('2026-06-29T12:00:00').getTime() },
      { id: 't3' },
    ]);
    const result = callTasksProjector('g1', goalState, taskEntities);
    expect(result.map((t) => t.id)).toEqual(jasmine.arrayContaining(['t1', 't3']));
    expect(result.find((t) => t.id === 't2')).toBeUndefined();
  });

  it('returns empty array for unknown goal', () => {
    const goalState = makeGoalState();
    const result = callTasksProjector('nonexistent', goalState, {});
    expect(result).toEqual([]);
  });

  it('includes tasks that reference goalId directly (not via linkedTaskIds)', () => {
    const goalState: GoalState = {
      ids: ['g1'],
      entities: {
        g1: {
          id: 'g1',
          title: 'Goal',
          horizon: 'WEEKLY',
          linkedTaskIds: [],
          missedWeekBehavior: 'FORGIVE',
          created: 1000,
        },
      },
    };
    // Task has goalId set directly
    const entities: EntityState<Task>['entities'] = {
      t_direct: {
        id: 't_direct',
        title: 'Direct task',
        projectId: 'p1',
        tagIds: [],
        subTaskIds: [],
        attachments: [],
        timeSpentOnDay: {},
        timeEstimate: 0,
        timeSpent: 0,
        created: 1000,
        isDone: false,
        goalId: 'g1',
      } as unknown as Task,
    };
    const result = callTasksProjector('g1', goalState, entities);
    expect(result.map((t) => t.id)).toContain('t_direct');
  });
});

describe('selectFocusedGoals', () => {
  it('returns only goals with isFocusedThisWeek=true', () => {
    const goals = [
      {
        id: 'g1',
        title: 'Focused',
        horizon: 'WEEKLY' as const,
        linkedTaskIds: [],
        missedWeekBehavior: 'FORGIVE' as const,
        created: 1000,
        isFocusedThisWeek: true,
      },
      {
        id: 'g2',
        title: 'Not focused',
        horizon: 'MONTHLY' as const,
        linkedTaskIds: [],
        missedWeekBehavior: 'FORGIVE' as const,
        created: 1000,
        isFocusedThisWeek: false,
      },
      {
        id: 'g3',
        title: 'Unset',
        horizon: 'YEARLY' as const,
        linkedTaskIds: [],
        missedWeekBehavior: 'FORGIVE' as const,
        created: 1000,
      },
    ];
    // projector takes all goals and filters
    const result = selectFocusedGoals.projector(goals);
    expect(result.map((g: any) => g.id)).toEqual(['g1']);
  });

  it('returns empty array when no goals are focused', () => {
    const goals = [
      {
        id: 'g1',
        title: 'G1',
        horizon: 'WEEKLY' as const,
        linkedTaskIds: [],
        missedWeekBehavior: 'FORGIVE' as const,
        created: 1000,
      },
    ];
    const result = selectFocusedGoals.projector(goals);
    expect(result).toEqual([]);
  });
});

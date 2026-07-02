import { selectGoalProgressFactory } from './goal.selectors';
import { GoalState } from '../goal.model';
import { EntityState } from '@ngrx/entity';
import { Task } from '../../tasks/task.model';

const NOW = new Date('2026-06-30T12:00:00Z').getTime(); // Tuesday of ISO week 26

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
    } as unknown as Task;
  }
  return entities;
};

// Helper to call the projector of a factory selector
const callProjector = (
  goalId: string,
  goalState: GoalState,
  taskEntities: EntityState<Task>['entities'],
): number => {
  const selector = selectGoalProgressFactory(goalId, NOW);
  return selector.projector(goalState, taskEntities);
};

describe('selectGoalProgressFactory', () => {
  describe('COMPLETIONS goal', () => {
    it('counts tasks done within the current week', () => {
      const goalState = makeGoalState();
      // t1 done this week (2026-06-29), t2 done last week, t3 not done
      const taskEntities = makeTaskEntities([
        { id: 't1', doneOn: new Date('2026-06-29').getTime() }, // this week
        { id: 't2', doneOn: new Date('2026-06-22').getTime() }, // last week
        { id: 't3' },
      ]);
      const result = callProjector('g1', goalState, taskEntities);
      expect(result).toBe(1);
    });

    it('counts multiple tasks done this week', () => {
      const goalState = makeGoalState();
      const taskEntities = makeTaskEntities([
        { id: 't1', doneOn: new Date('2026-06-29').getTime() },
        { id: 't2', doneOn: new Date('2026-06-30').getTime() },
        { id: 't3' },
      ]);
      const result = callProjector('g1', goalState, taskEntities);
      expect(result).toBe(2);
    });

    it('returns 0 when no tasks done this week', () => {
      const goalState = makeGoalState();
      const taskEntities = makeTaskEntities([{ id: 't1' }, { id: 't2' }, { id: 't3' }]);
      const result = callProjector('g1', goalState, taskEntities);
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
      const result = callProjector('g1', goalState, taskEntities);
      expect(result).toBe(5400000); // 1.5hr
    });
  });

  it('returns 0 for unknown goal', () => {
    const goalState = makeGoalState();
    const result = callProjector('nonexistent', goalState, {});
    expect(result).toBe(0);
  });
});

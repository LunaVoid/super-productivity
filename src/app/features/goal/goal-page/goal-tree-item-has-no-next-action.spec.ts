/**
 * Unit tests for the hasNoNextAction / hasLinkedRepeatTask logic
 * extracted from GoalTreeItemComponent.
 *
 * Tests the pure logic in isolation — the computed signals call these
 * same conditions:
 *   hasLinkedRepeatTask = linkedTaskIds.some(id => !!entities[id]?.repeatCfgId)
 *   hasNoNextAction = isWeeklyOrDaily && linkedTasks.length === 0
 *                     && !linkedRepeatCfgId && !hasLinkedRepeatTask
 */

type GoalHorizon = 'AREA' | 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY';

interface MockGoal {
  id: string;
  horizon: GoalHorizon;
  linkedTaskIds: string[];
  linkedRepeatCfgId?: string;
}

interface MockTask {
  id: string;
  isDone: boolean;
  repeatCfgId?: string;
}

const hasLinkedRepeatTask = (
  goal: MockGoal,
  taskEntities: Record<string, MockTask | undefined>,
): boolean => {
  return (goal.linkedTaskIds ?? []).some((id) => !!taskEntities[id]?.repeatCfgId);
};

const hasNoNextAction = (
  goal: MockGoal,
  linkedActiveTasks: MockTask[],
  taskEntities: Record<string, MockTask | undefined>,
): boolean => {
  const isWeeklyOrDaily = goal.horizon === 'WEEKLY' || goal.horizon === 'DAILY';
  return (
    isWeeklyOrDaily &&
    linkedActiveTasks.length === 0 &&
    !goal.linkedRepeatCfgId &&
    !hasLinkedRepeatTask(goal, taskEntities)
  );
};

describe('hasLinkedRepeatTask', () => {
  it('returns true when any linked task has a repeatCfgId', () => {
    const goal: MockGoal = {
      id: 'g1',
      horizon: 'WEEKLY',
      linkedTaskIds: ['t1', 't2'],
    };
    const entities: Record<string, MockTask> = {
      t1: { id: 't1', isDone: true, repeatCfgId: 'rc1' },
      t2: { id: 't2', isDone: false },
    };
    expect(hasLinkedRepeatTask(goal, entities)).toBe(true);
  });

  it('returns false when no linked tasks have a repeatCfgId', () => {
    const goal: MockGoal = {
      id: 'g1',
      horizon: 'WEEKLY',
      linkedTaskIds: ['t1', 't2'],
    };
    const entities: Record<string, MockTask> = {
      t1: { id: 't1', isDone: false },
      t2: { id: 't2', isDone: false },
    };
    expect(hasLinkedRepeatTask(goal, entities)).toBe(false);
  });

  it('returns false when linkedTaskIds is empty', () => {
    const goal: MockGoal = { id: 'g1', horizon: 'WEEKLY', linkedTaskIds: [] };
    expect(hasLinkedRepeatTask(goal, {})).toBe(false);
  });

  it('handles missing task entities gracefully', () => {
    const goal: MockGoal = {
      id: 'g1',
      horizon: 'WEEKLY',
      linkedTaskIds: ['t_missing'],
    };
    expect(hasLinkedRepeatTask(goal, {})).toBe(false);
  });
});

describe('hasNoNextAction', () => {
  it('shows warning when weekly goal has no active tasks, no repeat', () => {
    const goal: MockGoal = { id: 'g1', horizon: 'WEEKLY', linkedTaskIds: ['t1'] };
    const entities: Record<string, MockTask> = { t1: { id: 't1', isDone: true } };
    expect(hasNoNextAction(goal, [], entities)).toBe(true);
  });

  it('suppresses warning when done linked task has a repeatCfgId (will regenerate)', () => {
    const goal: MockGoal = { id: 'g1', horizon: 'WEEKLY', linkedTaskIds: ['t1'] };
    const entities: Record<string, MockTask> = {
      t1: { id: 't1', isDone: true, repeatCfgId: 'rc1' },
    };
    expect(hasNoNextAction(goal, [], entities)).toBe(false);
  });

  it('suppresses warning when goal has linkedRepeatCfgId', () => {
    const goal: MockGoal = {
      id: 'g1',
      horizon: 'WEEKLY',
      linkedTaskIds: [],
      linkedRepeatCfgId: 'rc1',
    };
    expect(hasNoNextAction(goal, [], {})).toBe(false);
  });

  it('suppresses warning when active tasks exist', () => {
    const goal: MockGoal = { id: 'g1', horizon: 'WEEKLY', linkedTaskIds: ['t1'] };
    const entities: Record<string, MockTask> = { t1: { id: 't1', isDone: false } };
    const activeTasks: MockTask[] = [{ id: 't1', isDone: false }];
    expect(hasNoNextAction(goal, activeTasks, entities)).toBe(false);
  });

  it('does NOT warn for MONTHLY goals even if no tasks', () => {
    const goal: MockGoal = { id: 'g1', horizon: 'MONTHLY', linkedTaskIds: [] };
    expect(hasNoNextAction(goal, [], {})).toBe(false);
  });

  it('does NOT warn for AREA goals', () => {
    const goal: MockGoal = { id: 'g1', horizon: 'AREA', linkedTaskIds: [] };
    expect(hasNoNextAction(goal, [], {})).toBe(false);
  });

  it('warns for DAILY goal with no tasks and no repeat', () => {
    const goal: MockGoal = { id: 'g1', horizon: 'DAILY', linkedTaskIds: ['t1'] };
    const entities: Record<string, MockTask> = { t1: { id: 't1', isDone: true } };
    expect(hasNoNextAction(goal, [], entities)).toBe(true);
  });

  it('suppresses warning for DAILY goal when task has repeatCfgId', () => {
    const goal: MockGoal = { id: 'g1', horizon: 'DAILY', linkedTaskIds: ['t1'] };
    const entities: Record<string, MockTask> = {
      t1: { id: 't1', isDone: true, repeatCfgId: 'rc_daily' },
    };
    expect(hasNoNextAction(goal, [], entities)).toBe(false);
  });
});

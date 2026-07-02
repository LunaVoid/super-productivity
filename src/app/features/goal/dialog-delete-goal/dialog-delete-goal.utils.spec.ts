import { getGoalSubtree } from './dialog-delete-goal.utils';
import { Goal, MissedWeekBehavior } from '../goal.model';

const makeGoal = (id: string, parentGoalId?: string): Goal => ({
  id,
  title: id,
  horizon: 'YEARLY',
  parentGoalId,
  linkedTaskIds: [],
  missedWeekBehavior: 'FORGIVE' as MissedWeekBehavior,
  created: 0,
});

describe('getGoalSubtree', () => {
  it('returns only the root goal when it has no children', () => {
    const root = makeGoal('root');
    const all = [root];
    const result = getGoalSubtree(root, all);
    expect(result).toEqual([root]);
  });

  it('returns children before parent for a goal with 2 children', () => {
    const root = makeGoal('root');
    const child1 = makeGoal('child1', 'root');
    const child2 = makeGoal('child2', 'root');
    const all = [root, child1, child2];

    const result = getGoalSubtree(root, all);

    // Children must appear before root
    expect(result.length).toBe(3);
    const rootIdx = result.findIndex((g) => g.id === 'root');
    const child1Idx = result.findIndex((g) => g.id === 'child1');
    const child2Idx = result.findIndex((g) => g.id === 'child2');
    expect(child1Idx).toBeLessThan(rootIdx);
    expect(child2Idx).toBeLessThan(rootIdx);
  });

  it('returns deepest goals first for a 3-level tree', () => {
    const root = makeGoal('root');
    const mid = makeGoal('mid', 'root');
    const deep = makeGoal('deep', 'mid');
    const all = [root, mid, deep];

    const result = getGoalSubtree(root, all);

    expect(result.length).toBe(3);
    const deepIdx = result.findIndex((g) => g.id === 'deep');
    const midIdx = result.findIndex((g) => g.id === 'mid');
    const rootIdx = result.findIndex((g) => g.id === 'root');
    expect(deepIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(rootIdx);
  });
});

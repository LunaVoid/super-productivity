import { Goal } from '../goal.model';

export const getGoalSubtree = (root: Goal, all: Goal[]): Goal[] => {
  const result: Goal[] = [];
  const collect = (id: string): void => {
    const children = all.filter((g) => g.parentGoalId === id);
    for (const child of children) collect(child.id);
    const goal = all.find((g) => g.id === id);
    if (goal) result.push(goal); // children before parent
  };
  collect(root.id);
  return result;
};

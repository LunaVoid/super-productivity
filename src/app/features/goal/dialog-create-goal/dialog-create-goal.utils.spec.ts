import { buildCascadeGoals } from './dialog-create-goal.utils';
import { GoalHorizon } from '../goal.model';

// DAILY is no longer a goal level — daily goals are just recurring tasks
const ALL_LEVELS = new Set<GoalHorizon>(['YEARLY', 'MONTHLY', 'WEEKLY']);

describe('buildCascadeGoals', () => {
  describe('COUNT', () => {
    it('should return 3 levels for COUNT, 1 per day, all selected', () => {
      const result = buildCascadeGoals('Exercise', 'COUNT', 1, 'DAY', ALL_LEVELS);
      expect(result.length).toBe(3);
      const weekly = result.find((r) => r.horizon === 'WEEKLY');
      const monthly = result.find((r) => r.horizon === 'MONTHLY');
      const yearly = result.find((r) => r.horizon === 'YEARLY');
      expect(weekly?.targetCount).toBe(7);
      expect(monthly?.targetCount).toBe(30);
      expect(yearly?.targetCount).toBe(365);
    });

    it('should include suffix in title for COUNT', () => {
      const result = buildCascadeGoals('Drink water', 'COUNT', 1, 'DAY', ALL_LEVELS);
      const weekly = result.find((r) => r.horizon === 'WEEKLY');
      expect(weekly?.title).toContain('7x/week');
    });

    it('should set targetCount not targetMs for COUNT', () => {
      const result = buildCascadeGoals('Exercise', 'COUNT', 1, 'DAY', ALL_LEVELS);
      result.forEach((level) => {
        expect(level.targetCount).toBeDefined();
        expect(level.targetMs).toBeUndefined();
      });
    });
  });

  describe('TIME', () => {
    it('should return correct targetMs for TIME 5hrs/week with WEEKLY+MONTHLY+YEARLY', () => {
      const result = buildCascadeGoals('Art practice', 'TIME', 5, 'WEEK', ALL_LEVELS);
      expect(result.length).toBe(3);
      const weekly = result.find((r) => r.horizon === 'WEEKLY');
      const monthly = result.find((r) => r.horizon === 'MONTHLY');
      const yearly = result.find((r) => r.horizon === 'YEARLY');
      // 5hrs/week => perDay = 5/7
      expect(weekly?.targetMs).toBe(Math.round(5 * 3600000));
      expect(monthly?.targetMs).toBe(Math.round((5 / 7) * 30 * 3600000));
      expect(yearly?.targetMs).toBe(Math.round((5 / 7) * 365 * 3600000));
    });

    it('should NOT include suffix in title for TIME', () => {
      const result = buildCascadeGoals('Art practice', 'TIME', 1, 'DAY', ALL_LEVELS);
      result.forEach((level) => {
        expect(level.title).toBe('Art practice');
        expect(level.title).not.toContain('x/');
      });
    });

    it('should set targetMs not targetCount for TIME', () => {
      const result = buildCascadeGoals('Art practice', 'TIME', 1, 'DAY', ALL_LEVELS);
      result.forEach((level) => {
        expect(level.targetMs).toBeDefined();
        expect(level.targetCount).toBeUndefined();
      });
    });
  });

  describe('STREAK', () => {
    it('should return only 1 level for STREAK with only WEEKLY selected', () => {
      const levels = new Set<GoalHorizon>(['WEEKLY']);
      const result = buildCascadeGoals('Voice practice', 'STREAK', 2, 'DAY', levels);
      expect(result.length).toBe(1);
      expect(result[0].horizon).toBe('WEEKLY');
    });

    it('should include suffix in title for STREAK weekly', () => {
      const levels = new Set<GoalHorizon>(['WEEKLY']);
      const result = buildCascadeGoals('Voice practice', 'STREAK', 2, 'DAY', levels);
      expect(result[0].title).toContain('14x/week');
    });
  });

  describe('edge cases', () => {
    it('should return [] for empty title', () => {
      expect(buildCascadeGoals('', 'COUNT', 1, 'DAY', ALL_LEVELS)).toEqual([]);
      expect(buildCascadeGoals('  ', 'COUNT', 1, 'DAY', ALL_LEVELS)).toEqual([]);
    });

    it('should return [] for targetValue of 0', () => {
      expect(buildCascadeGoals('Exercise', 'COUNT', 0, 'DAY', ALL_LEVELS)).toEqual([]);
    });

    it('should return [] for negative targetValue', () => {
      expect(buildCascadeGoals('Exercise', 'COUNT', -1, 'DAY', ALL_LEVELS)).toEqual([]);
    });

    it('should return [] for empty selected levels', () => {
      const empty = new Set<GoalHorizon>();
      expect(buildCascadeGoals('Exercise', 'COUNT', 1, 'DAY', empty)).toEqual([]);
    });

    it('should return levels in YEARLY→WEEKLY order', () => {
      const result = buildCascadeGoals('Exercise', 'COUNT', 1, 'DAY', ALL_LEVELS);
      expect(result.map((r) => r.horizon)).toEqual(['YEARLY', 'MONTHLY', 'WEEKLY']);
    });
  });
});

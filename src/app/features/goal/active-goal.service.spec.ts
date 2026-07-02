import { TestBed } from '@angular/core/testing';
import { ActiveGoalService } from './active-goal.service';

describe('ActiveGoalService', () => {
  let service: ActiveGoalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActiveGoalService);
  });

  it('should start with null active goal', () => {
    expect(service.activeGoalId()).toBeNull();
  });

  it('setActiveGoal should set the active goal id', () => {
    service.setActiveGoal('goal-123');
    expect(service.activeGoalId()).toBe('goal-123');
  });

  it('clear should reset active goal to null', () => {
    service.setActiveGoal('goal-456');
    service.clear();
    expect(service.activeGoalId()).toBeNull();
  });

  it('setActiveGoal should replace a previous active goal', () => {
    service.setActiveGoal('goal-1');
    service.setActiveGoal('goal-2');
    expect(service.activeGoalId()).toBe('goal-2');
  });
});

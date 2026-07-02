import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { DialogCreateGoalComponent } from './dialog-create-goal.component';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { TaskService } from '../../tasks/task.service';
import { addGoal } from '../store/goal.actions';
import { GoalHorizon } from '../goal.model';

describe('DialogCreateGoalComponent', () => {
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DialogCreateGoalComponent>>;
  let mockTaskRepeatCfgService: jasmine.SpyObj<TaskRepeatCfgService>;
  let store: MockStore;

  let mockTaskService: jasmine.SpyObj<TaskService>;

  const setupTestBed = async (
    dialogData: { preselectedHorizon?: GoalHorizon; parentGoalId?: string } = {},
  ): Promise<DialogCreateGoalComponent> => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockTaskRepeatCfgService = jasmine.createSpyObj('TaskRepeatCfgService', [
      'addTaskRepeatCfgToTask',
    ]);
    mockTaskService = jasmine.createSpyObj('TaskService', ['add']);
    mockTaskService.add.and.returnValue('mock-task-id');

    await TestBed.configureTestingModule({
      imports: [DialogCreateGoalComponent, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: TaskRepeatCfgService, useValue: mockTaskRepeatCfgService },
        { provide: TaskService, useValue: mockTaskService },
      ],
    })
      .overrideComponent(DialogCreateGoalComponent, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch').and.callThrough();

    const fixture = TestBed.createComponent(DialogCreateGoalComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create', async () => {
    const component = await setupTestBed();
    expect(component).toBeTruthy();
  });

  describe('canGoNext', () => {
    it('should be false when title is empty on step 1', async () => {
      const component = await setupTestBed();
      expect(component.step()).toBe(1);
      component.title.set('');
      expect(component.canGoNext()).toBeFalse();
    });

    it('should be false when title is only whitespace on step 1', async () => {
      const component = await setupTestBed();
      component.title.set('   ');
      expect(component.canGoNext()).toBeFalse();
    });

    it('should be true when title has content on step 1', async () => {
      const component = await setupTestBed();
      component.title.set('Exercise more');
      expect(component.canGoNext()).toBeTrue();
    });

    it('should be false when targetValue is 0 on step 2', async () => {
      const component = await setupTestBed();
      component.title.set('Exercise');
      component.step.set(2);
      component.targetValue.set(0);
      expect(component.canGoNext()).toBeFalse();
    });

    it('should be true when targetValue > 0 on step 2', async () => {
      const component = await setupTestBed();
      component.title.set('Exercise');
      component.step.set(2);
      component.targetValue.set(3);
      expect(component.canGoNext()).toBeTrue();
    });
  });

  describe('cascadeGoals', () => {
    it('should return 3 levels for COUNT, 1/week, all selected', async () => {
      const component = await setupTestBed();
      component.title.set('Exercise');
      component.measureType.set('COUNT');
      component.targetValue.set(1);
      component.targetPer.set('WEEK');
      component.selectedLevels.set(new Set<GoalHorizon>(['YEARLY', 'MONTHLY', 'WEEKLY']));

      const levels = component.cascadeGoals();
      expect(levels.length).toBe(3);
      expect(levels.map((l) => l.horizon)).toEqual(['YEARLY', 'MONTHLY', 'WEEKLY']);
    });

    it('should return empty for empty title', async () => {
      const component = await setupTestBed();
      component.title.set('');
      expect(component.cascadeGoals()).toEqual([]);
    });
  });

  describe('toggleLevel', () => {
    it('should remove MONTHLY from selected levels when toggled off', async () => {
      const component = await setupTestBed();
      expect(component.isLevelSelected('MONTHLY')).toBeTrue();
      component.toggleLevel('MONTHLY');
      expect(component.isLevelSelected('MONTHLY')).toBeFalse();
    });

    it('should add MONTHLY back when toggled again', async () => {
      const component = await setupTestBed();
      component.toggleLevel('MONTHLY');
      expect(component.isLevelSelected('MONTHLY')).toBeFalse();
      component.toggleLevel('MONTHLY');
      expect(component.isLevelSelected('MONTHLY')).toBeTrue();
    });
  });

  describe('submit', () => {
    it('should dispatch addGoal actions for each cascade level', async () => {
      const component = await setupTestBed();
      component.title.set('Exercise');
      component.measureType.set('COUNT');
      component.targetValue.set(7);
      component.targetPer.set('WEEK');
      component.selectedLevels.set(new Set<GoalHorizon>(['YEARLY', 'MONTHLY', 'WEEKLY']));
      component.doesRepeat.set(false);

      component.submit();

      expect(store.dispatch).toHaveBeenCalledTimes(3);
      const calls = (store.dispatch as jasmine.Spy).calls.allArgs();
      calls.forEach((args) => {
        expect(args[0].type).toBe(addGoal.type);
      });
    });

    it('should not dispatch if no cascade levels', async () => {
      const component = await setupTestBed();
      component.title.set('');
      component.submit();
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should close dialog with true on successful submit', async () => {
      const component = await setupTestBed();
      component.title.set('Exercise');
      component.measureType.set('COUNT');
      component.targetValue.set(1);
      component.targetPer.set('WEEK');
      component.doesRepeat.set(false);

      component.submit();
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should call addTaskRepeatCfgToTask when doesRepeat is true and task title is set', async () => {
      const component = await setupTestBed();
      component.title.set('Exercise');
      component.measureType.set('COUNT');
      component.targetValue.set(1);
      component.targetPer.set('WEEK');
      component.doesRepeat.set(true);
      component.taskTitle.set('Daily workout');

      component.submit();

      expect(mockTaskService.add).toHaveBeenCalledWith(
        'Daily workout',
        false,
        { timeEstimate: jasmine.any(Number) },
        false,
      );
      expect(mockTaskRepeatCfgService.addTaskRepeatCfgToTask).toHaveBeenCalledWith(
        'mock-task-id',
        null,
        jasmine.any(Object),
      );
    });
  });

  describe('navigation', () => {
    it('should advance step on next()', async () => {
      const component = await setupTestBed();
      expect(component.step()).toBe(1);
      component.next();
      expect(component.step()).toBe(2);
      component.next();
      expect(component.step()).toBe(3);
    });

    it('should not go beyond step 3', async () => {
      const component = await setupTestBed();
      component.step.set(3);
      component.next();
      expect(component.step()).toBe(3);
    });

    it('should go back on back()', async () => {
      const component = await setupTestBed();
      component.step.set(3);
      component.back();
      expect(component.step()).toBe(2);
    });

    it('should not go below step 1', async () => {
      const component = await setupTestBed();
      component.back();
      expect(component.step()).toBe(1);
    });
  });

  describe('cancel', () => {
    it('should close dialog with false', async () => {
      const component = await setupTestBed();
      component.cancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });
  });

  describe('preselectedHorizon', () => {
    it('should pre-select only WEEKLY when preselectedHorizon is WEEKLY', async () => {
      const component = await setupTestBed({ preselectedHorizon: 'WEEKLY' });
      expect(component.isLevelSelected('WEEKLY')).toBeTrue();
      expect(component.isLevelSelected('YEARLY')).toBeFalse();
      expect(component.isLevelSelected('MONTHLY')).toBeFalse();
    });

    it('should fall back to WEEKLY when preselectedHorizon is DAILY', async () => {
      const component = await setupTestBed({ preselectedHorizon: 'DAILY' });
      expect(component.isLevelSelected('WEEKLY')).toBeTrue();
      expect(component.isLevelSelected('YEARLY')).toBeFalse();
      expect(component.isLevelSelected('MONTHLY')).toBeFalse();
    });
  });

  describe('topHorizon → selectedLevels sync', () => {
    it('defaults topHorizon to YEARLY with all three levels selected', async () => {
      const component = await setupTestBed();
      expect(component.topHorizon()).toBe('YEARLY');
      expect(component.isLevelSelected('YEARLY')).toBeTrue();
      expect(component.isLevelSelected('MONTHLY')).toBeTrue();
      expect(component.isLevelSelected('WEEKLY')).toBeTrue();
    });

    it('MONTHLY topHorizon selects MONTHLY + WEEKLY only', async () => {
      const component = await setupTestBed();
      component.topHorizon.set('MONTHLY');
      // Trigger effect synchronously in tests
      TestBed.flushEffects();
      expect(component.isLevelSelected('YEARLY')).toBeFalse();
      expect(component.isLevelSelected('MONTHLY')).toBeTrue();
      expect(component.isLevelSelected('WEEKLY')).toBeTrue();
    });

    it('WEEKLY topHorizon selects only WEEKLY', async () => {
      const component = await setupTestBed();
      component.topHorizon.set('WEEKLY');
      TestBed.flushEffects();
      expect(component.isLevelSelected('YEARLY')).toBeFalse();
      expect(component.isLevelSelected('MONTHLY')).toBeFalse();
      expect(component.isLevelSelected('WEEKLY')).toBeTrue();
    });

    it('switching back to YEARLY restores all levels', async () => {
      const component = await setupTestBed();
      component.topHorizon.set('WEEKLY');
      TestBed.flushEffects();
      component.topHorizon.set('YEARLY');
      TestBed.flushEffects();
      expect(component.isLevelSelected('YEARLY')).toBeTrue();
      expect(component.isLevelSelected('MONTHLY')).toBeTrue();
      expect(component.isLevelSelected('WEEKLY')).toBeTrue();
    });
  });

  describe('msToHours', () => {
    it('should convert milliseconds to hours rounded', () => {
      // Not async but we need a component instance
      TestBed.configureTestingModule({
        imports: [DialogCreateGoalComponent, NoopAnimationsModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          provideMockStore(),
          {
            provide: MatDialogRef,
            useValue: jasmine.createSpyObj('MatDialogRef', ['close']),
          },
          { provide: MAT_DIALOG_DATA, useValue: {} },
          {
            provide: TaskRepeatCfgService,
            useValue: jasmine.createSpyObj('TaskRepeatCfgService', [
              'addTaskRepeatCfgToTask',
            ]),
          },
          {
            provide: TaskService,
            useValue: jasmine.createSpyObj('TaskService', { add: 'mock-task-id' }),
          },
        ],
      })
        .overrideComponent(DialogCreateGoalComponent, {
          set: { template: '<div></div>' },
        })
        .compileComponents();

      const fixture = TestBed.createComponent(DialogCreateGoalComponent);
      const component = fixture.componentInstance;
      expect(component.msToHours(3600000)).toBe(1);
      expect(component.msToHours(7200000)).toBe(2);
      expect(component.msToHours(5400000)).toBe(2); // 1.5h rounds to 2
    });
  });
});

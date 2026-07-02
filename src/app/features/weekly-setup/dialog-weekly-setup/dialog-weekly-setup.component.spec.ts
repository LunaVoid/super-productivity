import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MemoizedSelector } from '@ngrx/store';

import { DialogWeeklySetupComponent } from './dialog-weekly-setup.component';
import {
  selectThisWeekTasks,
  selectTaskEntities,
} from '../../tasks/store/task.selectors';
import { selectActiveProjectManagerItems } from '../../project-manager/store/project-manager.selectors';
import { selectAllGoals } from '../../goal/store/goal.selectors';
import { updateGoal } from '../../goal/store/goal.actions';
import { Task } from '../../tasks/task.model';
import { Goal } from '../../goal/goal.model';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';

const makeTask = (id: string, overrides: Partial<Task> = {}): Task =>
  ({
    id,
    title: `Task ${id}`,
    isDone: false,
    tagIds: [],
    subTaskIds: [],
    attachments: [],
    timeSpentOnDay: {},
    timeEstimate: 0,
    timeSpent: 0,
    created: 1000,
    ...overrides,
  }) as unknown as Task;

const makeGoal = (id: string, overrides: Partial<Goal> = {}): Goal =>
  ({
    id,
    title: `Goal ${id}`,
    horizon: 'WEEKLY' as const,
    linkedTaskIds: [],
    missedWeekBehavior: 'FORGIVE' as const,
    created: 1000,
    ...overrides,
  }) as unknown as Goal;

describe('DialogWeeklySetupComponent', () => {
  let component: DialogWeeklySetupComponent;
  let store: MockStore;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DialogWeeklySetupComponent>>;
  let mockThisWeekSelector: MemoizedSelector<object, Task[]>;
  let mockGoalsSelector: MemoizedSelector<object, Goal[]>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DialogWeeklySetupComponent, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [provideMockStore(), { provide: MatDialogRef, useValue: mockDialogRef }],
    })
      .overrideComponent(DialogWeeklySetupComponent, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    store = TestBed.inject(MockStore);
    mockThisWeekSelector = store.overrideSelector(selectThisWeekTasks, []);
    mockGoalsSelector = store.overrideSelector(selectAllGoals, []);
    store.overrideSelector(selectActiveProjectManagerItems, []);
    // Also override selectTaskEntities to prevent selector errors
    store.overrideSelector(selectTaskEntities, {});
    spyOn(store, 'dispatch').and.callThrough();

    const fixture = TestBed.createComponent(DialogWeeklySetupComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('step navigation', () => {
    it('starts at step 0', () => {
      expect(component.step()).toBe(0);
    });

    it('next() increments step', () => {
      component.next();
      expect(component.step()).toBe(1);
      component.next();
      expect(component.step()).toBe(2);
    });

    it('back() decrements step', () => {
      component.step.set(3);
      component.back();
      expect(component.step()).toBe(2);
    });

    it('cancel() closes dialog', () => {
      component.cancel();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  describe('intentions', () => {
    it('starts with 3 empty intentions', () => {
      expect(component.intentions()).toEqual(['', '', '']);
    });

    it('setIntention() updates the correct slot', () => {
      component.setIntention(1, 'Build the app');
      expect(component.intentions()[1]).toBe('Build the app');
      expect(component.intentions()[0]).toBe('');
    });

    it('summaryIntentions() filters out empty strings', () => {
      component.setIntention(0, 'Work out');
      component.setIntention(2, 'Read more');
      expect(component.summaryIntentions()).toEqual(['Work out', 'Read more']);
    });
  });

  describe('task selection', () => {
    it('toggleTask() adds and removes task IDs', () => {
      component.toggleTask('t1');
      expect(component.isChecked('t1')).toBeTrue();
      component.toggleTask('t1');
      expect(component.isChecked('t1')).toBeFalse();
    });

    it('limits task selection to 7', () => {
      for (let i = 0; i < 8; i++) {
        component.toggleTask(`t${i}`);
      }
      expect(component.checkedTaskIds().size).toBe(7);
    });
  });

  describe('goal focus (new feature)', () => {
    it('toggleGoalFocus() adds and removes goal IDs', () => {
      component.toggleGoalFocus('g1');
      expect(component.isGoalFocused('g1')).toBeTrue();
      component.toggleGoalFocus('g1');
      expect(component.isGoalFocused('g1')).toBeFalse();
    });

    it('limits focus to 5 goals', () => {
      for (let i = 0; i < 6; i++) {
        component.toggleGoalFocus(`g${i}`);
      }
      expect(component.focusGoalIds().size).toBe(5);
    });

    it('focusableGoals filters out AREA goals', () => {
      const goals = [
        makeGoal('g1', { horizon: 'WEEKLY' }),
        makeGoal('g2', { horizon: 'AREA' }),
        makeGoal('g3', { horizon: 'MONTHLY' }),
      ];
      mockGoalsSelector.setResult(goals);
      store.refreshState();
      const focusable = component.focusableGoals();
      expect(focusable.map((g) => g.id)).toEqual(jasmine.arrayContaining(['g1', 'g3']));
      expect(focusable.find((g) => g.id === 'g2')).toBeUndefined();
    });

    it('summaryFocusGoals() returns only selected goal objects', () => {
      const goals = [
        makeGoal('g1', { horizon: 'WEEKLY' }),
        makeGoal('g2', { horizon: 'MONTHLY' }),
      ];
      mockGoalsSelector.setResult(goals);
      store.refreshState();
      component.toggleGoalFocus('g1');
      const summary = component.summaryFocusGoals();
      expect(summary.map((g) => g.id)).toEqual(['g1']);
    });
  });

  describe('submit', () => {
    it('dispatches saveWeeklyReview and closes dialog', () => {
      component.submit();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('dispatches updateGoal to set isFocusedThisWeek=true for focused goals', () => {
      const goals = [makeGoal('g1', { horizon: 'WEEKLY', isFocusedThisWeek: false })];
      mockGoalsSelector.setResult(goals);
      store.refreshState();
      component.toggleGoalFocus('g1');

      component.submit();

      const calls = (store.dispatch as jasmine.Spy).calls.allArgs();
      const updateCalls = calls.filter((args) => args[0].type === updateGoal.type);
      expect(updateCalls.length).toBeGreaterThan(0);
      const g1Update = updateCalls.find((args) => args[0].goal?.id === 'g1');
      expect(g1Update).toBeTruthy();
      expect(g1Update![0].goal.changes.isFocusedThisWeek).toBeTrue();
    });

    it('dispatches updateGoal to clear isFocusedThisWeek for previously focused goals not re-selected', () => {
      const goals = [makeGoal('g1', { horizon: 'WEEKLY', isFocusedThisWeek: true })];
      mockGoalsSelector.setResult(goals);
      store.refreshState();
      // Don't toggle g1 — so g1 should be cleared

      component.submit();

      const calls = (store.dispatch as jasmine.Spy).calls.allArgs();
      const updateCalls = calls.filter((args) => args[0].type === updateGoal.type);
      const g1Update = updateCalls.find((args) => args[0].goal?.id === 'g1');
      expect(g1Update).toBeTruthy();
      expect(g1Update![0].goal.changes.isFocusedThisWeek).toBeFalse();
    });

    it('does not dispatch updateGoal when goal focus state has not changed', () => {
      const goals = [makeGoal('g1', { horizon: 'WEEKLY', isFocusedThisWeek: false })];
      mockGoalsSelector.setResult(goals);
      store.refreshState();
      // g1 already not focused, not toggled → no update needed

      component.submit();

      const calls = (store.dispatch as jasmine.Spy).calls.allArgs();
      const updateCalls = calls.filter((args) => args[0].type === updateGoal.type);
      const g1Update = updateCalls.find((args) => args[0].goal?.id === 'g1');
      expect(g1Update).toBeUndefined();
    });

    it('dispatches planTasksForToday for checked task IDs', () => {
      mockThisWeekSelector.setResult([makeTask('t1'), makeTask('t2')]);
      store.refreshState();
      component.toggleTask('t1');
      component.toggleTask('t2');

      component.submit();

      const calls = (store.dispatch as jasmine.Spy).calls.allArgs();
      const planCall = calls.find(
        (args) => args[0].type === TaskSharedActions.planTasksForToday.type,
      );
      expect(planCall).toBeTruthy();
      expect(planCall![0].taskIds).toEqual(jasmine.arrayContaining(['t1', 't2']));
    });

    it('does not dispatch planTasksForToday when no tasks checked', () => {
      component.submit();

      const calls = (store.dispatch as jasmine.Spy).calls.allArgs();
      const planCall = calls.find(
        (args) => args[0].type === TaskSharedActions.planTasksForToday.type,
      );
      expect(planCall).toBeUndefined();
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';
import { GoalSelectComponent } from './goal-select.component';
import { TaskService } from '../../tasks/task.service';
import { DEFAULT_TASK, Task } from '../../tasks/task.model';
import { Goal } from '../goal.model';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const makeGoal = (partial: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  title: 'Exercise 4x/week',
  horizon: 'WEEKLY',
  linkedTaskIds: [],
  missedWeekBehavior: 'FORGIVE',
  created: 1000,
  ...partial,
});

const makeTask = (partial: Partial<Task & { goalId?: string }> = {}): Task =>
  ({
    ...(DEFAULT_TASK as Task),
    id: 'task1',
    title: 'Run 5k',
    ...partial,
  }) as Task;

describe('GoalSelectComponent', () => {
  let component: GoalSelectComponent;
  let fixture: ComponentFixture<GoalSelectComponent>;
  let mockTaskService: jasmine.SpyObj<TaskService>;
  let mockAllGoals: Goal[];

  beforeEach(async () => {
    mockAllGoals = [makeGoal()];
    mockTaskService = jasmine.createSpyObj('TaskService', ['update']);

    const mockStore = jasmine.createSpyObj('Store', [
      'selectSignal',
      'dispatch',
      'select',
    ]);
    mockStore.selectSignal.and.returnValue(
      jasmine.createSpy().and.returnValue(mockAllGoals),
    );
    mockStore.select.and.returnValue(of(mockAllGoals));

    await TestBed.configureTestingModule({
      imports: [GoalSelectComponent, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: TaskService, useValue: mockTaskService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalSelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('task', makeTask());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize selectedGoalId from task.goalId', () => {
    fixture.componentRef.setInput('task', makeTask({ goalId: 'g1' } as any));
    component.ngOnInit();
    expect(component.selectedGoalId()).toBe('g1');
  });

  it('should set selectedGoalId to null when task has no goalId', () => {
    component.ngOnInit();
    expect(component.selectedGoalId()).toBeNull();
  });

  it('should call taskService.update when goal changes', () => {
    component.onGoalChange('g1');
    expect(mockTaskService.update).toHaveBeenCalledWith(
      'task1',
      jasmine.objectContaining({ goalId: 'g1' }),
    );
  });

  it('should call taskService.update with undefined when goal cleared', () => {
    component.onGoalChange(null);
    expect(mockTaskService.update).toHaveBeenCalledWith(
      'task1',
      jasmine.objectContaining({ goalId: undefined }),
    );
  });
});

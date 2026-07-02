import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlannerUnscheduledComponent } from './planner-unscheduled.component';
import { provideMockStore } from '@ngrx/store/testing';
import { TaskCopy } from '../../tasks/task.model';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { signal } from '@angular/core';

const mockTask = (overrides: Partial<TaskCopy> = {}): TaskCopy =>
  ({
    id: 'task-1',
    title: 'Test task',
    isDone: false,
    dueDay: undefined,
    dueWithTime: undefined,
    parentId: undefined,
    subTaskIds: [],
    tagIds: [],
    timeEstimate: 0,
    timeSpent: 0,
    timeSpentOnDay: {},
    attachments: [],
    created: Date.now(),
    ...overrides,
  }) as TaskCopy;

describe('PlannerUnscheduledComponent', () => {
  let component: PlannerUnscheduledComponent;
  let fixture: ComponentFixture<PlannerUnscheduledComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlannerUnscheduledComponent],
      providers: [
        provideMockStore(),
        {
          provide: LayoutService,
          useValue: {
            isXs: signal(false),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PlannerUnscheduledComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tasks', [mockTask()]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start collapsed', () => {
    expect(component.isExpanded()).toBe(false);
  });

  it('should toggle expanded on header click', () => {
    component.toggleExpanded();
    expect(component.isExpanded()).toBe(true);
    component.toggleExpanded();
    expect(component.isExpanded()).toBe(false);
  });

  it('should show task count in header', () => {
    fixture.componentRef.setInput('tasks', [mockTask(), mockTask({ id: 'task-2' })]);
    fixture.detectChanges();
    const countEl = fixture.nativeElement.querySelector('.unscheduled-count');
    expect(countEl?.textContent?.trim()).toBe('2');
  });
});

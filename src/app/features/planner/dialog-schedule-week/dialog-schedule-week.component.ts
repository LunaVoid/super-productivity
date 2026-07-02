import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../store/planner.actions';
import {
  selectUnscheduledTasks,
  selectUndoneOverdue,
} from '../../tasks/store/task.selectors';
import { Task } from '../../tasks/task.model';
import { getDbDateStr } from '../../../util/get-db-date-str';

interface DayColumn {
  dateStr: string;
  label: string;
  tasks: Task[];
}

@Component({
  selector: 'dialog-schedule-week',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './dialog-schedule-week.component.html',
  styleUrls: ['./dialog-schedule-week.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogScheduleWeekComponent {
  private _store = inject(Store);
  private _dialogRef = inject(MatDialogRef<DialogScheduleWeekComponent>);

  private readonly _unscheduled = this._store.selectSignal(selectUnscheduledTasks);
  private readonly _overdue = this._store.selectSignal(selectUndoneOverdue);

  readonly DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly weekDates = computed(() => {
    const today = new Date();
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${day}`);
    }
    return days;
  });

  readonly assignments = signal<Map<string, string>>(new Map());

  readonly candidateTasks = computed((): Task[] => {
    const unscheduled = this._unscheduled();
    const overdue = this._overdue();
    const seen = new Set<string>();
    const result: Task[] = [];
    for (const t of [...overdue, ...unscheduled]) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        result.push(t);
      }
    }
    return result;
  });

  readonly suggestedAssignments = computed((): Map<string, string> => {
    const map = new Map<string, string>();
    const tasks = this.candidateTasks();
    const dates = this.weekDates();
    const tasksPerDay = Math.ceil(tasks.length / Math.max(dates.length, 1));

    tasks.forEach((task, idx) => {
      const dayIndex = Math.min(
        Math.floor(idx / Math.max(tasksPerDay, 1)),
        dates.length - 1,
      );
      const targetDate = _getDeadlineConstrainedDate(task, dates, dayIndex);
      map.set(task.id, targetDate);
    });

    return map;
  });

  readonly effectiveAssignments = computed((): Map<string, string> => {
    const suggested = this.suggestedAssignments();
    const manual = this.assignments();
    const merged = new Map(suggested);
    for (const [taskId, dateStr] of manual) {
      merged.set(taskId, dateStr);
    }
    return merged;
  });

  readonly dayColumns = computed((): DayColumn[] => {
    const dates = this.weekDates();
    const assignments = this.effectiveAssignments();
    const tasks = this.candidateTasks();

    return dates.map((dateStr) => {
      const d = new Date(dateStr);
      const dayOfWeek = d.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const isToday = dateStr === getDbDateStr();
      const label =
        (isToday ? 'Today ' : '') + this.DAY_NAMES[adjustedDay] + ` ${d.getDate()}`;

      const assignedTasks = tasks.filter((t) => assignments.get(t.id) === dateStr);
      return { dateStr, label, tasks: assignedTasks };
    });
  });

  readonly totalAssigned = computed(() => this.effectiveAssignments().size);

  readonly draggedTaskId = signal<string | null>(null);
  readonly dragOverDate = signal<string | null>(null);

  onDragStart(taskId: string): void {
    this.draggedTaskId.set(taskId);
  }

  onDragOver(event: DragEvent, dateStr: string): void {
    event.preventDefault();
    this.dragOverDate.set(dateStr);
  }

  onDragLeave(): void {
    this.dragOverDate.set(null);
  }

  onDrop(event: DragEvent, dateStr: string): void {
    event.preventDefault();
    const taskId = this.draggedTaskId();
    if (taskId) {
      const current = new Map(this.assignments());
      current.set(taskId, dateStr);
      this.assignments.set(current);
    }
    this.draggedTaskId.set(null);
    this.dragOverDate.set(null);
  }

  apply(): void {
    const assignments = this.effectiveAssignments();
    const tasks = this.candidateTasks();

    for (const task of tasks) {
      const day = assignments.get(task.id);
      if (day) {
        this._store.dispatch(
          PlannerActions.planTaskForDay({ task, day, isShowSnack: false }),
        );
      }
    }

    this._dialogRef.close({ applied: assignments.size });
  }

  cancel(): void {
    this._dialogRef.close();
  }

  formatTime(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.round((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
  }

  totalDayTime(tasks: Task[]): number {
    return tasks.reduce((sum, t) => sum + (t.timeEstimate || 0), 0);
  }
}

const _getDeadlineConstrainedDate = (
  task: Task,
  dates: string[],
  defaultIndex: number,
): string => {
  const deadline = task.deadlineDay;
  if (deadline) {
    const lastBeforeDeadline = dates.filter((d) => d <= deadline).pop();
    if (lastBeforeDeadline) return lastBeforeDeadline;
  }
  return dates[defaultIndex] ?? dates[0];
};

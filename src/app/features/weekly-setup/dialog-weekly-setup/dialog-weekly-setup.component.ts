import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { selectThisWeekTasks } from '../../tasks/store/task.selectors';
import { selectActiveProjectManagerItems } from '../../project-manager/store/project-manager.selectors';
import { saveWeeklyReview } from '../store/weekly-setup.actions';
import { WeeklyReview } from '../weekly-setup.model';
import { Task } from '../../tasks/task.model';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';

@Component({
  selector: 'dialog-weekly-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
  ],
  templateUrl: './dialog-weekly-setup.component.html',
  styleUrls: ['./dialog-weekly-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogWeeklySetupComponent {
  private _store = inject(Store);
  private _dialogRef = inject(MatDialogRef<DialogWeeklySetupComponent>);

  readonly step = signal(0);

  readonly intentions = signal(['', '', '']);

  readonly thisWeekTasks = this._store.selectSignal(selectThisWeekTasks);
  readonly activeProjects = this._store.selectSignal(selectActiveProjectManagerItems);

  readonly checkedTaskIds = signal<Set<string>>(new Set());
  readonly focusProjectId = signal<string | null>(null);

  readonly weekStr = computed(() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const daysDiff = (d.getTime() - yearStart.getTime()) / 86400000;
    const weekNo = Math.ceil((daysDiff + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  });

  readonly summaryIntentions = computed(() => this.intentions().filter((i) => i.trim()));
  readonly summaryTopTasks = computed(() => {
    const ids = this.checkedTaskIds();
    return this.thisWeekTasks().filter((t: Task) => ids.has(t.id));
  });
  readonly summaryProject = computed(() => {
    const id = this.focusProjectId();
    return id ? this.activeProjects().find((p) => p.id === id) : null;
  });

  setIntention(index: number, value: string): void {
    const arr = [...this.intentions()];
    arr[index] = value;
    this.intentions.set(arr);
  }

  toggleTask(taskId: string): void {
    const set = new Set(this.checkedTaskIds());
    if (set.has(taskId)) {
      set.delete(taskId);
    } else if (set.size < 7) {
      set.add(taskId);
    }
    this.checkedTaskIds.set(set);
  }

  isChecked(taskId: string): boolean {
    return this.checkedTaskIds().has(taskId);
  }

  next(): void {
    this.step.update((s) => s + 1);
  }

  back(): void {
    this.step.update((s) => s - 1);
  }

  submit(): void {
    const review: WeeklyReview = {
      id: nanoid(),
      weekStr: this.weekStr(),
      intentions: this.summaryIntentions(),
      topTaskIds: [...this.checkedTaskIds()],
      focusProjectId: this.focusProjectId() ?? undefined,
      created: Date.now(),
    };
    this._store.dispatch(saveWeeklyReview({ review }));

    const topTaskIds = [...this.checkedTaskIds()];
    if (topTaskIds.length > 0) {
      this._store.dispatch(TaskSharedActions.planTasksForToday({ taskIds: topTaskIds }));
    }

    this._dialogRef.close(review);
  }

  cancel(): void {
    this._dialogRef.close();
  }
}

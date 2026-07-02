import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { Goal, GoalHorizon, MissedWeekBehavior } from '../goal.model';
import { addGoal, linkTaskToGoal } from '../store/goal.actions';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { TaskService } from '../../tasks/task.service';
import { DEFAULT_TASK_REPEAT_CFG } from '../../task-repeat-cfg/task-repeat-cfg.model';
import {
  buildCascadeGoals,
  CascadeLevel,
  MeasureType,
  TargetPer,
} from './dialog-create-goal.utils';

export interface DialogCreateGoalData {
  preselectedHorizon?: GoalHorizon;
  parentGoalId?: string;
}

@Component({
  selector: 'dialog-create-goal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    MatTooltipModule,
  ],
  templateUrl: './dialog-create-goal.component.html',
  styleUrls: ['./dialog-create-goal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogCreateGoalComponent {
  private readonly _store = inject(Store);
  private readonly _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private readonly _taskService = inject(TaskService);
  private readonly _dialogRef = inject(MatDialogRef<DialogCreateGoalComponent>);
  readonly data = inject<DialogCreateGoalData>(MAT_DIALOG_DATA);

  // Step tracking
  readonly step = signal<1 | 2 | 3>(1);

  // Step 1 fields
  readonly title = signal('');
  readonly measureType = signal<MeasureType>('COUNT');
  readonly doesRepeat = signal(true);

  // Step 2 fields
  readonly targetValue = signal(1);
  readonly targetPer = signal<TargetPer>('WEEK');
  readonly sessionDurationMin = signal(30);
  readonly taskTitle = signal('');

  readonly repeatDays = signal({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  });

  readonly dayOptions = [
    { key: 'mon' as const, label: 'Mon' },
    { key: 'tue' as const, label: 'Tue' },
    { key: 'wed' as const, label: 'Wed' },
    { key: 'thu' as const, label: 'Thu' },
    { key: 'fri' as const, label: 'Fri' },
    { key: 'sat' as const, label: 'Sat' },
    { key: 'sun' as const, label: 'Sun' },
  ];

  readonly repeatDaysSummary = computed(() => {
    const d = this.repeatDays();
    const active = this.dayOptions.filter((o) => d[o.key]).map((o) => o.label);
    if (active.length === 7) return 'every day';
    if (active.length === 0) return 'no days selected';
    return active.join('/');
  });

  // Step 3 — selected levels (DAILY removed — daily goals are just recurring tasks)
  readonly selectedLevels = signal<Set<GoalHorizon>>(
    new Set<GoalHorizon>(['YEARLY', 'MONTHLY', 'WEEKLY']),
  );

  // Sync taskTitle from title when user hasn't manually changed it
  private _taskTitleManuallySet = false;

  // Computed cascade preview
  readonly cascadeGoals = computed<CascadeLevel[]>(() =>
    buildCascadeGoals(
      this.title(),
      this.measureType(),
      this.targetValue(),
      this.targetPer(),
      this.selectedLevels(),
    ),
  );

  readonly wizardMathSummary = computed(() => {
    const activeDays = Object.values(this.repeatDays()).filter(Boolean).length;
    if (activeDays === 0) return '';
    const minsPerWeek = this.sessionDurationMin() * activeDays;
    const hPerWeek = (minsPerWeek / 60).toFixed(1);
    const hPerMonth = ((minsPerWeek * 4.33) / 60).toFixed(0);
    const hPerYear = ((minsPerWeek * 52) / 60).toFixed(0);
    return `→ ${hPerWeek}h/week · ${hPerMonth}h/month · ${hPerYear}h/year`;
  });

  readonly canGoNext = computed(() => {
    if (this.step() === 1) return this.title().trim().length > 0;
    if (this.step() === 2) return this.targetValue() > 0;
    return this.cascadeGoals().length > 0;
  });

  readonly horizons: GoalHorizon[] = ['YEARLY', 'MONTHLY', 'WEEKLY'];

  constructor() {
    // Pre-fill from dialog data (DAILY is no longer a goal level)
    if (this.data.preselectedHorizon) {
      const allHorizons: GoalHorizon[] = ['YEARLY', 'MONTHLY', 'WEEKLY'];
      const horizon =
        this.data.preselectedHorizon === 'DAILY'
          ? 'WEEKLY'
          : this.data.preselectedHorizon;
      const idx = allHorizons.indexOf(horizon);
      this.selectedLevels.set(new Set(allHorizons.slice(idx >= 0 ? idx : 0)));
    }

    // Sync taskTitle from title
    effect(() => {
      const t = this.title();
      if (!this._taskTitleManuallySet) {
        this.taskTitle.set(t);
      }
    });
  }

  onTaskTitleChange(val: string): void {
    this._taskTitleManuallySet = true;
    this.taskTitle.set(val);
  }

  toggleDay(key: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'): void {
    const d = this.repeatDays();
    this.repeatDays.set({ ...d, [key]: !d[key] });
  }

  toggleLevel(horizon: GoalHorizon): void {
    const current = new Set(this.selectedLevels());
    if (current.has(horizon)) {
      current.delete(horizon);
    } else {
      current.add(horizon);
    }
    this.selectedLevels.set(current);
  }

  isLevelSelected(horizon: GoalHorizon): boolean {
    return this.selectedLevels().has(horizon);
  }

  next(): void {
    if (this.step() < 3) this.step.update((s) => (s + 1) as 1 | 2 | 3);
  }

  back(): void {
    if (this.step() > 1) this.step.update((s) => (s - 1) as 1 | 2 | 3);
  }

  submit(): void {
    const levels = this.cascadeGoals();
    if (!levels.length) return;

    // Build top-down, linking each child to the one above
    const goalIds: string[] = levels.map(() => nanoid());
    levels.forEach((level, i) => {
      const baseGoal = {
        id: goalIds[i],
        title: level.title,
        horizon: level.horizon,
        parentGoalId: i === 0 ? this.data.parentGoalId : goalIds[i - 1],
        linkedTaskIds: [],
        missedWeekBehavior: 'FORGIVE' as MissedWeekBehavior,
        created: Date.now(),
      };
      const goal: Goal =
        level.targetCount !== undefined
          ? { ...baseGoal, targetCount: level.targetCount, unit: 'COMPLETIONS' }
          : level.targetMs !== undefined
            ? { ...baseGoal, targetMs: level.targetMs, unit: 'MS' }
            : baseGoal;
      this._store.dispatch(addGoal({ goal }));
    });

    // Create recurring task linked to most granular goal
    // Must use TaskService.add() first so the task exists in the store,
    // then attach the repeat config to the real task ID.
    if (this.doesRepeat() && this.taskTitle().trim()) {
      const timeEstimate = this.sessionDurationMin() * 60 * 1000;
      const taskId = this._taskService.add(
        this.taskTitle().trim(),
        false,
        { timeEstimate },
        false,
      );
      // Link task to the weekly goal (last entry in goalIds = most granular = WEEKLY)
      const weeklyGoalId = goalIds[goalIds.length - 1];
      this._store.dispatch(linkTaskToGoal({ goalId: weeklyGoalId, taskId }));

      const d = this.repeatDays();
      const allDays = d.mon && d.tue && d.wed && d.thu && d.fri && d.sat && d.sun;
      this._taskRepeatCfgService.addTaskRepeatCfgToTask(taskId, null, {
        ...DEFAULT_TASK_REPEAT_CFG,
        title: this.taskTitle().trim(),
        repeatCycle: 'WEEKLY',
        quickSetting: allDays ? 'DAILY' : 'WEEKLY_CURRENT_WEEKDAY',
        monday: d.mon,
        tuesday: d.tue,
        wednesday: d.wed,
        thursday: d.thu,
        friday: d.fri,
        saturday: d.sat,
        sunday: d.sun,
        goalId: weeklyGoalId,
      });
    }

    this._dialogRef.close(true);
  }

  cancel(): void {
    this._dialogRef.close(false);
  }

  msToHours(ms: number): number {
    return Math.round(ms / 3600000);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Goal, GoalHorizon } from '../goal.model';
import {
  selectAllGoals,
  selectGoalProgressFactory,
  selectTasksForGoalFactory,
} from '../store/goal.selectors';
import { deleteGoal, unlinkTaskFromGoal, updateGoal } from '../store/goal.actions';
import { selectCurrentTaskId } from '../../tasks/store/task.selectors';
import { ActiveGoalService } from '../active-goal.service';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import {
  DialogDeleteGoalComponent,
  DialogDeleteGoalResult,
} from '../dialog-delete-goal/dialog-delete-goal.component';
import { getGoalSubtree } from '../dialog-delete-goal/dialog-delete-goal.utils';

@Component({
  selector: 'goal-tree-item',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './goal-tree-item.component.html',
  styleUrls: ['./goal-tree-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalTreeItemComponent {
  private _store = inject(Store);
  private _activeGoalService = inject(ActiveGoalService);
  private _layoutService = inject(LayoutService);
  private _matDialog = inject(MatDialog);

  readonly goal = input.required<Goal>();
  readonly addChild = output<{ horizon: GoalHorizon; parentId: string }>();

  @ViewChild('intentionInput') intentionInputRef?: ElementRef<HTMLInputElement>;

  private readonly _allGoals = this._store.selectSignal(selectAllGoals);

  /** Children looked up from store — always accurate, no prop-drilling needed. */
  readonly children = computed(() =>
    this._allGoals().filter((g) => g.parentGoalId === this.goal().id),
  );

  /** Active (non-done) tasks linked to this goal. */
  readonly linkedTasks = computed(() =>
    this._store.selectSignal(selectTasksForGoalFactory(this.goal().id))(),
  );

  readonly isExpanded = signal(true);
  readonly isEditingIntention = signal(false);
  readonly intentionDraft = signal('');

  readonly progress = computed(() =>
    this._store.selectSignal(selectGoalProgressFactory(this.goal().id, Date.now()))(),
  );

  private readonly _currentTaskId = this._store.selectSignal(selectCurrentTaskId);

  readonly progressPercent = computed(() => {
    const g = this.goal();
    const p = this.progress();
    if (g.unit === 'MS' && g.targetMs) {
      return Math.min(100, Math.round((p / g.targetMs) * 100));
    }
    if (g.targetCount) {
      return Math.min(100, Math.round((p / g.targetCount) * 100));
    }
    return 0;
  });

  readonly progressDetailLabel = computed(() => {
    const g = this.goal();
    const p = this.progress();
    if (g.unit === 'MS' && g.targetMs) {
      return `${_msToHLabel(p)} / ${_msToHLabel(g.targetMs)}`;
    }
    if (g.unit === 'COMPLETIONS' && g.targetCount) {
      return `${p} / ${g.targetCount}`;
    }
    return null;
  });

  readonly isCurrentlyTracking = computed(() => {
    const currentId = this._currentTaskId();
    if (!currentId) return false;
    return this.linkedTasks().some((t) => t.id === currentId);
  });

  readonly hasNoNextAction = computed(
    () =>
      (this.goal().horizon === 'WEEKLY' || this.goal().horizon === 'DAILY') &&
      this.linkedTasks().length === 0 &&
      !this.goal().linkedRepeatCfgId,
  );

  readonly hasTarget = computed(() => {
    const g = this.goal();
    return !!(g.targetCount || g.targetMs);
  });

  /** Only weekly and daily goals can have tasks added directly. */
  readonly canAddTasks = computed(() => {
    const h = this.goal().horizon;
    return h === 'WEEKLY' || h === 'DAILY';
  });

  toggleExpanded(): void {
    this.isExpanded.update((v) => !v);
  }

  startEditIntention(): void {
    this.intentionDraft.set(this.goal().weeklyIntention ?? '');
    this.isEditingIntention.set(true);
    setTimeout(() => {
      this.intentionInputRef?.nativeElement?.focus();
    }, 0);
  }

  saveIntention(): void {
    this._store.dispatch(
      updateGoal({
        goal: { id: this.goal().id, changes: { weeklyIntention: this.intentionDraft() } },
      }),
    );
    this.isEditingIntention.set(false);
  }

  cancelEditIntention(): void {
    this.isEditingIntention.set(false);
  }

  openDeleteConfirmation(): void {
    const ref = this._matDialog.open(DialogDeleteGoalComponent, {
      data: { goal: this.goal(), allGoals: this._allGoals() },
    });
    ref.afterClosed().subscribe((result: DialogDeleteGoalResult | null | undefined) => {
      if (!result) return;
      this._executeGoalDelete(getGoalSubtree(this.goal(), this._allGoals()), result.mode);
    });
  }

  private _executeGoalDelete(goals: Goal[], mode: 'DELETE_ALL' | 'UNLINK'): void {
    const allTaskIds = goals.flatMap((g) => g.linkedTaskIds ?? []);
    for (const goal of goals) {
      this._store.dispatch(deleteGoal({ id: goal.id }));
    }
    if (mode === 'DELETE_ALL' && allTaskIds.length) {
      this._store.dispatch(TaskSharedActions.deleteTasks({ taskIds: allTaskIds }));
    } else if (mode === 'UNLINK') {
      for (const goal of goals) {
        for (const taskId of goal.linkedTaskIds ?? []) {
          this._store.dispatch(unlinkTaskFromGoal({ goalId: goal.id, taskId }));
        }
      }
    }
  }

  onAddChild(): void {
    const horizonMap: Record<GoalHorizon, GoalHorizon> = {
      YEARLY: 'MONTHLY',
      MONTHLY: 'WEEKLY',
      WEEKLY: 'DAILY',
      DAILY: 'DAILY',
    };
    this.addChild.emit({
      horizon: horizonMap[this.goal().horizon],
      parentId: this.goal().id,
    });
  }

  /** Open the global add-task bar pre-linked to this goal. */
  openGlobalAddTaskBar(): void {
    this._activeGoalService.setActiveGoal(this.goal().id);
    this._layoutService.showAddTaskBar();
  }
}

const _msToHLabel = (ms: number): string => {
  const h = ms / 3600000;
  return h >= 1 ? `${Math.round(h * 10) / 10}h` : `${Math.round(ms / 60000)}m`;
};

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { selectAllGoals } from '../store/goal.selectors';
import { addGoal, updateGoal } from '../store/goal.actions';
import { Goal, GoalHorizon, MissedWeekBehavior } from '../goal.model';
import { selectCalendarProviders } from '../../issue/store/issue-provider.selectors';
import { GoalTreeItemComponent } from './goal-tree-item.component';
import { WeeklyExportService } from '../weekly-export.service';
import { nanoid } from 'nanoid';
import {
  DialogCreateGoalComponent,
  DialogCreateGoalData,
} from '../dialog-create-goal/dialog-create-goal.component';

@Component({
  selector: 'goal-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
    GoalTreeItemComponent,
    DragDropModule,
  ],
  templateUrl: './goal-page.component.html',
  styleUrls: ['./goal-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalPageComponent {
  private _store = inject(Store);
  private _weeklyExportService = inject(WeeklyExportService);
  private _matDialog = inject(MatDialog);

  readonly allGoals = this._store.selectSignal(selectAllGoals);

  private readonly _calendarProviders = this._store.selectSignal(selectCalendarProviders);
  readonly hasCalendarProvider = computed(() => this._calendarProviders().length > 0);

  /** Root goals (no parent) sorted area → yearly → monthly → weekly → daily */
  readonly rootGoals = computed(() => {
    const order: Record<GoalHorizon, number> = {
      AREA: -1,
      YEARLY: 0,
      MONTHLY: 1,
      WEEKLY: 2,
      DAILY: 3,
    };
    return this.allGoals()
      .filter((g) => !g.parentGoalId)
      .sort((a, b) => order[a.horizon] - order[b.horizon]);
  });

  // Quick-add state
  readonly showQuickAdd = signal(false);
  readonly quickAddTitle = signal('');
  readonly quickAddHorizon = signal<GoalHorizon | null>(null);
  readonly quickAddParentId = signal<string | undefined>(undefined);

  readonly isHorizonPreFilled = computed(
    () => this.quickAddHorizon() !== null && this.showQuickAdd(),
  );

  readonly horizonOptions: Array<{ value: GoalHorizon; label: string }> = [
    { value: 'YEARLY', label: 'Yearly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'DAILY', label: 'Daily' },
  ];

  openQuickAdd(horizon: GoalHorizon | null = null, parentId?: string): void {
    this.quickAddHorizon.set(horizon);
    this.quickAddParentId.set(parentId);
    this.quickAddTitle.set('');
    this.showQuickAdd.set(true);
  }

  cancelQuickAdd(): void {
    this.showQuickAdd.set(false);
    this.quickAddTitle.set('');
  }

  submitQuickAdd(): void {
    const title = this.quickAddTitle().trim();
    if (!title) return;
    const horizon: GoalHorizon = this.quickAddHorizon() ?? 'YEARLY';
    const goal: Goal = {
      id: nanoid(),
      title,
      horizon,
      parentGoalId: this.quickAddParentId(),
      linkedTaskIds: [],
      missedWeekBehavior: 'FORGIVE' as MissedWeekBehavior,
      created: Date.now(),
    };
    this._store.dispatch(addGoal({ goal }));
    this.showQuickAdd.set(false);
    this.quickAddTitle.set('');
  }

  openCreateGoalDialog(preselectedHorizon?: GoalHorizon, parentGoalId?: string): void {
    this._matDialog.open(DialogCreateGoalComponent, {
      data: { preselectedHorizon, parentGoalId } satisfies DialogCreateGoalData,
      width: '480px',
    });
  }

  openCreateAreaDialog(): void {
    const ref = this._matDialog.open(DialogCreateGoalComponent, {
      data: { preselectedHorizon: 'AREA' } satisfies DialogCreateGoalData,
      width: '400px',
    });
    ref.componentInstance.isAreaMode.set(true);
  }

  /** IDs of all area cdkDropLists — used so root list can connect to them */
  readonly areaDropListIds = computed(() =>
    this.allGoals()
      .filter((g) => g.horizon === 'AREA')
      .map((g) => `area-drop-${g.id}`),
  );

  dropGoalOnArea(event: CdkDragDrop<Goal[]>, areaId: string): void {
    const goal: Goal = event.item.data;
    if (!goal || goal.horizon === 'AREA') return;
    this._store.dispatch(
      updateGoal({ goal: { id: goal.id, changes: { parentGoalId: areaId } } }),
    );
  }

  dropGoalOnRoot(event: CdkDragDrop<Goal[]>): void {
    if (event.previousContainer === event.container) return;
    const goal: Goal = event.item.data;
    if (!goal || goal.horizon === 'AREA') return;
    // Moved out of an area — clear parent
    this._store.dispatch(
      updateGoal({ goal: { id: goal.id, changes: { parentGoalId: undefined } } }),
    );
  }

  exportWeek(): void {
    void this._weeklyExportService.exportWeek();
  }

  openWeeklySetup(): void {
    import('../../../features/weekly-setup/dialog-weekly-setup/dialog-weekly-setup.component').then(
      ({ DialogWeeklySetupComponent }) => {
        this._matDialog.open(DialogWeeklySetupComponent, {
          width: '560px',
          maxHeight: '90vh',
        });
      },
    );
  }
}

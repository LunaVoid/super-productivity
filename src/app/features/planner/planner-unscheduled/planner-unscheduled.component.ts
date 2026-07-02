import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatIcon } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { TaskCopy } from '../../tasks/task.model';
import { PlannerActions } from '../store/planner.actions';
import { PlannerTaskComponent } from '../planner-task/planner-task.component';
import { UNSCHEDULED_LIST_ID } from '../planner.model';
import { dragDelayForTouch } from '../../../util/input-intent';
import { LayoutService } from '../../../core-ui/layout/layout.service';

@Component({
  selector: 'planner-unscheduled',
  standalone: true,
  imports: [CdkDrag, CdkDropList, MatIcon, PlannerTaskComponent],
  templateUrl: './planner-unscheduled.component.html',
  styleUrl: './planner-unscheduled.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerUnscheduledComponent {
  private _store = inject(Store);
  private _layoutService = inject(LayoutService);

  readonly tasks = input.required<TaskCopy[]>();

  readonly isExpanded = signal(false);
  readonly UNSCHEDULED_LIST_ID = UNSCHEDULED_LIST_ID;
  protected readonly dragDelayForTouch = dragDelayForTouch;
  protected readonly isXs = this._layoutService.isXs;

  toggleExpanded(): void {
    this.isExpanded.update((v) => !v);
  }

  drop(ev: CdkDragDrop<string, string, TaskCopy>): void {
    const task = ev.item.data as TaskCopy;
    const newDay = ev.container.data;
    if (newDay && newDay !== UNSCHEDULED_LIST_ID) {
      this._store.dispatch(
        PlannerActions.planTaskForDay({
          task,
          day: newDay,
          isAddToTop: false,
          isShowSnack: false,
        }),
      );
    }
  }
}

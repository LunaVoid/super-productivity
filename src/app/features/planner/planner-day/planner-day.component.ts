import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  inject,
  Input,
} from '@angular/core';
import { T } from '../../../t.const';
import {
  PlannerDay,
  ScheduleItem,
  ScheduleItemType,
  UNSCHEDULED_LIST_ID,
} from '../planner.model';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { TaskCopy } from '../../tasks/task.model';
import { PlannerActions } from '../store/planner.actions';
import { millisecondsDiffToRemindOption } from '../../tasks/util/remind-option-to-milliseconds';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { TaskService } from '../../tasks/task.service';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { DateService } from '../../../core/date/date.service';
import { DialogScheduleTaskComponent } from '../dialog-schedule-task/dialog-schedule-task.component';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { MatIcon } from '@angular/material/icon';
import { PlannerTaskComponent } from '../planner-task/planner-task.component';
import { PlannerRepeatProjectionComponent } from '../planner-repeat-projection/planner-repeat-projection.component';
import { PlannerDeadlineTaskComponent } from '../planner-deadline-task/planner-deadline-task.component';
import { AddTaskInlineComponent } from '../add-task-inline/add-task-inline.component';
import { LocaleDatePipe } from 'src/app/ui/pipes/locale-date.pipe';
import { NgClass } from '@angular/common';
import { PlannerCalendarEventComponent } from '../planner-calendar-event/planner-calendar-event.component';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { RoundDurationPipe } from '../../../ui/pipes/round-duration.pipe';
import { ShortTimeHtmlPipe } from '../../../ui/pipes/short-time-html.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { ShortDate2Pipe } from '../../../ui/pipes/short-date2.pipe';
import { ProgressBarComponent } from '../../../ui/progress-bar/progress-bar.component';
import { dragDelayForTouch } from '../../../util/input-intent';
import { LayoutService } from '../../../core-ui/layout/layout.service';

@Component({
  selector: 'planner-day',
  templateUrl: './planner-day.component.html',
  styleUrl: './planner-day.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIcon,
    CdkDropList,
    PlannerTaskComponent,
    CdkDrag,
    PlannerRepeatProjectionComponent,
    PlannerDeadlineTaskComponent,
    AddTaskInlineComponent,
    NgClass,
    PlannerCalendarEventComponent,
    LocaleDatePipe,
    MsToStringPipe,
    RoundDurationPipe,
    ShortTimeHtmlPipe,
    TranslatePipe,
    ShortDate2Pipe,
    ProgressBarComponent,
  ],
})
export class PlannerDayComponent {
  private _store = inject(Store);
  private _matDialog = inject(MatDialog);
  private _taskService = inject(TaskService);
  private _dateService = inject(DateService);
  private _layoutService = inject(LayoutService);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() day!: PlannerDay;

  @HostBinding('attr.data-day') get dataDayAttr(): string | undefined {
    return this.day?.dayDate;
  }

  protected readonly T = T;
  protected readonly SCHEDULE_ITEM_TYPE = ScheduleItemType;
  protected readonly dragDelayForTouch = dragDelayForTouch;
  // Lock Y-axis on small screens only — on wider screens the planner uses a
  // multi-column grid where cross-column dragging requires horizontal movement.
  protected readonly isXs = this._layoutService.isXs;

  getProgressBarClass(percentage: number | undefined): string {
    if (!percentage) return 'bg-success';

    if (percentage > 95) {
      return 'bg-danger';
    } else if (percentage > 80) {
      return 'bg-warning';
    } else {
      return 'bg-success';
    }
  }

  // TODO correct type
  drop(
    targetList: 'TODO' | 'SCHEDULED',
    allItems: TaskCopy[] | ScheduleItem[],
    ev: CdkDragDrop<string, string, TaskCopy>,
  ): void {
    const newDay = ev.container.data;
    const task = ev.item.data;

    if (targetList === 'SCHEDULED') {
      if (ev.previousContainer === ev.container) {
        // Same-list reorder: swap dueWithTime between the two tasks
        const items = allItems as ScheduleItem[];
        const fromItem = items[ev.previousIndex];
        const toItem = items[ev.currentIndex];
        if (
          fromItem?.type === ScheduleItemType.Task &&
          toItem?.type === ScheduleItemType.Task &&
          fromItem.task.dueWithTime &&
          toItem.task.dueWithTime
        ) {
          const fromTime = fromItem.task.dueWithTime;
          const toTime = toItem.task.dueWithTime;
          const fromRemind = millisecondsDiffToRemindOption(
            fromItem.task.dueWithTime,
            fromItem.task.remindAt,
          );
          const toRemind = millisecondsDiffToRemindOption(
            toItem.task.dueWithTime,
            toItem.task.remindAt,
          );
          this._taskService.scheduleTask(fromItem.task, toTime, fromRemind, false);
          this._taskService.scheduleTask(toItem.task, fromTime, toRemind, false);
        }
      } else {
        // Cross-container drop into scheduled section.
        // ev.currentIndex is unreliable here because cdkDrag is on a nested child
        // (planner-task inside .scheduled-item), not a direct child of the cdkDropList.
        // Instead, scan the full list for the last timed task and append after it.
        const items = allItems as ScheduleItem[];
        let startTime: number | null = null;
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          if (item?.start && item.end) {
            startTime = item.end;
            break;
          }
        }
        if (startTime !== null) {
          const remindCfg = millisecondsDiffToRemindOption(startTime, undefined);
          this._taskService.scheduleTask(task, startTime, remindCfg, false);
        } else {
          // No timed items in the section — open fresh schedule dialog
          this._matDialog.open(DialogScheduleTaskComponent, {
            data: { task, targetDay: ev.container.data },
          });
        }
      }
      return;
    } else if (targetList === 'TODO') {
      if (ev.previousContainer === ev.container) {
        if (this.day.isToday) {
          this._store.dispatch(
            TaskSharedActions.moveTaskInTodayTagList({
              toTaskId: allItems[ev.currentIndex].id,
              fromTaskId: task.id,
            }),
          );
        } else {
          this._store.dispatch(
            PlannerActions.moveInList({
              targetDay: ev.container.data,
              fromIndex: ev.previousIndex,
              toIndex: ev.currentIndex,
            }),
          );
        }
      } else {
        // When dragging from Unscheduled into a day column, offer to schedule with a time.
        // Find the last timed item in this day's scheduled section and append after it.
        if (ev.previousContainer.data === UNSCHEDULED_LIST_ID) {
          const scheduledItems = this.day.scheduledIItems;
          let startTime: number | null = null;
          for (let i = scheduledItems.length - 1; i >= 0; i--) {
            const item = scheduledItems[i];
            if (item?.start && item.end) {
              startTime = item.end;
              break;
            }
          }
          if (startTime !== null) {
            const remindCfg = millisecondsDiffToRemindOption(startTime, undefined);
            this._taskService.scheduleTask(task, startTime, remindCfg, false);
          } else {
            // No timed items yet — plan the task for this day and open the schedule dialog
            this._store.dispatch(
              PlannerActions.planTaskForDay({
                task,
                day: newDay,
                isAddToTop: false,
                isShowSnack: false,
              }),
            );
            this._matDialog.open(DialogScheduleTaskComponent, {
              data: { task, targetDay: newDay },
            });
          }
          return;
        }

        this._store.dispatch(
          PlannerActions.transferTask({
            task: task,
            prevDay: ev.previousContainer.data,
            newDay: newDay,
            targetIndex: ev.currentIndex,
            today: this._dateService.todayStr(),
            targetTaskId: allItems[ev.currentIndex]?.id,
          }),
        );
      }
    }
  }

  editTaskReminderOrReScheduleIfPossible(task: TaskCopy, newDay?: string): void {
    if (newDay) {
      const newDate = dateStrToUtcDate(newDay);
      if (task.dueWithTime) {
        this._rescheduleTask(task, newDate);
        return;
      }
    }

    this._matDialog.open(DialogScheduleTaskComponent, {
      data: {
        task,
        targetDay: newDay,
      },
    });
  }

  private _rescheduleTask(task: TaskCopy, newDate: Date): void {
    const taskPlannedAtDate = new Date(task.dueWithTime as number);
    newDate.setHours(taskPlannedAtDate.getHours(), taskPlannedAtDate.getMinutes(), 0, 0);
    const selectedReminderCfgId = millisecondsDiffToRemindOption(
      task.dueWithTime as number,
      task.remindAt,
    );
    this._taskService.scheduleTask(task, newDate.getTime(), selectedReminderCfgId, false);
  }
}

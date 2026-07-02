import { Injectable, inject } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { interval } from 'rxjs';
import { startWith, switchMap, mergeMap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { CalendarIntegrationService } from './calendar-integration.service';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { Log } from '../../core/log';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class CalendarSyncPollEffects {
  private _store = inject(Store);
  private _calendarIntegrationService = inject(CalendarIntegrationService);

  /**
   * Periodically polls calendar providers and patches task dueWithTime when
   * an event has been moved in the external calendar (pull-sync).
   */
  syncCalendarEventMovesToTasks$ = createEffect(
    () =>
      interval(POLL_INTERVAL_MS).pipe(
        startWith(0),
        switchMap(() =>
          this._calendarIntegrationService.syncCalendarEventChangesToTasks().pipe(
            mergeMap((diffs) => {
              for (const { task, newDueWithTime } of diffs) {
                Log.log(
                  '[CalendarSyncPoll] Rescheduling task due to calendar event move',
                  { taskId: task.id, newDueWithTime },
                );
                this._store.dispatch(
                  TaskSharedActions.reScheduleTaskWithTime({
                    task,
                    dueWithTime: newDueWithTime,
                    isMoveToBacklog: false,
                  }),
                );
              }
              return EMPTY;
            }),
            catchError((err) => {
              Log.err('[CalendarSyncPoll] Error during calendar event sync', err);
              return EMPTY;
            }),
          ),
        ),
      ),
    { dispatch: false },
  );
}

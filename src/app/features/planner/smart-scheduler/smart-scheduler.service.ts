import { Injectable } from '@angular/core';
import { TaskCopy } from '../../tasks/task.model';
import { ScheduleItem } from '../planner.model';
import { getDbDateStr } from '../../../util/get-db-date-str';

export type SmartScheduleMode = 'PRIORITY' | 'FIT' | 'OVERDUE_FIRST';

export interface SuggestedSlot {
  task: TaskCopy;
  suggestedTime: number;
}

const DEFAULT_TASK_DURATION_MS = 30 * 60 * 1000;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class SmartSchedulerService {
  /**
   * Suggests time slots for unscheduled tasks by finding gaps in today's schedule.
   *
   * PRIORITY mode: ranks tasks by urgency (due date, deadline, age) and places
   * highest-priority tasks into the earliest available slots.
   *
   * FIT mode: sorts largest-first to maximize the number of tasks scheduled.
   *
   * @param unscheduledTasks Tasks without a scheduled time
   * @param todayScheduledItems Already-scheduled items for today
   * @param workStartHour Hour (0–23) when the work day starts
   * @param workEndHour Hour (0–23) when the work day ends
   * @param mode Scheduling strategy — 'PRIORITY' or 'FIT'
   */
  suggestSchedule(
    unscheduledTasks: TaskCopy[],
    todayScheduledItems: ScheduleItem[],
    workStartHour: number | null = null,
    workEndHour: number | null = null,
    mode: SmartScheduleMode = 'PRIORITY',
  ): SuggestedSlot[] {
    const now = Date.now();
    let effectiveStart: number;
    let todayEnd: number;

    if (workStartHour === null || workEndHour === null) {
      // No work hours configured — schedule the next 3 hours from now
      effectiveStart = now;
      todayEnd = now + THREE_HOURS_MS;
    } else {
      const todayStart = this._todayAtDecimalHour(workStartHour);
      todayEnd = this._todayAtDecimalHour(workEndHour);
      effectiveStart = Math.max(now, todayStart);
      if (effectiveStart >= todayEnd) {
        // Outside configured work hours — fall back to next 3 hours
        effectiveStart = now;
        todayEnd = now + THREE_HOURS_MS;
      }
    }

    // Build sorted list of busy intervals from already-scheduled items
    const busyIntervals = todayScheduledItems
      .filter((item) => item.end > effectiveStart && item.start < todayEnd)
      .map((item) => ({ start: item.start, end: item.end }))
      .sort((a, b) => a.start - b.start);

    const merged = this._mergeIntervals(busyIntervals);
    const gaps = this._computeGaps(effectiveStart, todayEnd, merged);

    const sortedTasks =
      mode === 'FIT'
        ? [...unscheduledTasks].sort((a, b) => {
            const aDur = a.timeEstimate || DEFAULT_TASK_DURATION_MS;
            const bDur = b.timeEstimate || DEFAULT_TASK_DURATION_MS;
            return bDur - aDur;
          })
        : [...unscheduledTasks].sort(
            (a, b) => this._priorityScore(b, now) - this._priorityScore(a, now),
          );

    const suggestions: SuggestedSlot[] = [];
    const gapPointers = gaps.map((g) => ({ ...g, cursor: g.start }));

    for (const task of sortedTasks) {
      const duration = task.timeEstimate || DEFAULT_TASK_DURATION_MS;
      const slot = this._findSlot(gapPointers, duration);
      if (slot !== null) {
        suggestions.push({ task, suggestedTime: slot });
      }
    }

    return suggestions;
  }

  /**
   * Priority score for a task — higher = schedule earlier.
   * Overdue (+1000) > due today (+500) > deadline ≤7d (+300) > age (up to +200)
   */
  private _priorityScore(task: TaskCopy, now: number): number {
    const todayStr = getDbDateStr();
    let score = 0;

    if (task.dueDay) {
      if (task.dueDay < todayStr) {
        score += 1000;
      } else if (task.dueDay === todayStr) {
        score += 500;
      }
    }

    if (task.deadlineDay) {
      const daysUntil =
        (new Date(task.deadlineDay).getTime() - now) / (1000 * 60 * 60 * 24);
      if (daysUntil <= 7) score += 300;
    } else if (task.deadlineWithTime) {
      const daysUntil = (task.deadlineWithTime - now) / (1000 * 60 * 60 * 24);
      if (daysUntil <= 7) score += 300;
    }

    // Age bonus: older tasks get higher priority, capped at 200
    const ageDays = (now - task.created) / (1000 * 60 * 60 * 24);
    score += Math.min(ageDays, 200);

    return score;
  }

  private _todayAtDecimalHour(decimalHour: number): number {
    const d = new Date();
    const h = Math.floor(decimalHour);
    const m = Math.round((decimalHour - h) * 60);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  private _mergeIntervals(
    intervals: { start: number; end: number }[],
  ): { start: number; end: number }[] {
    if (!intervals.length) return [];
    const result: { start: number; end: number }[] = [{ ...intervals[0] }];
    for (let i = 1; i < intervals.length; i++) {
      const last = result[result.length - 1];
      if (intervals[i].start <= last.end) {
        last.end = Math.max(last.end, intervals[i].end);
      } else {
        result.push({ ...intervals[i] });
      }
    }
    return result;
  }

  private _computeGaps(
    start: number,
    end: number,
    busyIntervals: { start: number; end: number }[],
  ): { start: number; end: number }[] {
    const gaps: { start: number; end: number }[] = [];
    let cursor = start;
    for (const busy of busyIntervals) {
      const busyStart = Math.max(busy.start, start);
      const busyEnd = Math.min(busy.end, end);
      if (busyStart > cursor) {
        gaps.push({ start: cursor, end: busyStart });
      }
      cursor = Math.max(cursor, busyEnd);
    }
    if (cursor < end) {
      gaps.push({ start: cursor, end });
    }
    return gaps;
  }

  private _findSlot(
    gapPointers: { start: number; end: number; cursor: number }[],
    duration: number,
  ): number | null {
    for (const gap of gapPointers) {
      const available = gap.end - gap.cursor;
      if (available >= duration) {
        const slotTime = gap.cursor;
        gap.cursor += duration;
        return slotTime;
      }
    }
    return null;
  }
}

import {
  isAllDayCalendarEvent,
  ScheduleCalendarMapEntry,
  ScheduleFromCalendarEvent,
} from '../schedule/schedule.model';

/**
 * Timed calendar events starting after `todayEndTime` (end of today) and
 * before the end of the current ISO week (Sunday 23:59:59), sorted by start time.
 *
 * All-day events are excluded to keep the list focused on timed commitments.
 */
export const getThisWeekCalendarEvents = (
  calendarEventEntries: ScheduleCalendarMapEntry[],
  todayStr: string,
  startOfNextDayDiffMs: number,
  now: number,
): ScheduleFromCalendarEvent[] => {
  if (!todayStr) {
    return [];
  }

  const [year, month, day] = todayStr.split('-').map(Number);
  const todayDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  const todayEndTime = todayDate.getTime() + startOfNextDayDiffMs;

  // End of ISO week = Sunday 23:59:59 of the current week
  const weekEndDate = new Date(year, month - 1, day);
  const dayOfWeek = weekEndDate.getDay(); // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  weekEndDate.setDate(weekEndDate.getDate() + daysUntilSunday);
  weekEndDate.setHours(23, 59, 59, 999);
  const weekEndTime = weekEndDate.getTime();

  // If today is Sunday, there are no "rest of week" days
  if (weekEndTime <= todayEndTime) {
    return [];
  }

  const events: ScheduleFromCalendarEvent[] = [];
  for (const entry of calendarEventEntries) {
    for (const calEv of entry.items) {
      if (
        !isAllDayCalendarEvent(calEv) &&
        calEv.start > todayEndTime &&
        calEv.start <= weekEndTime
      ) {
        events.push(calEv);
      }
    }
  }

  return events.sort((a, b) => a.start - b.start);
};

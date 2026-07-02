import { getThisWeekCalendarEvents } from './get-this-week-calendar-events';
import {
  ScheduleCalendarMapEntry,
  ScheduleFromCalendarEvent,
} from '../schedule/schedule.model';

// Use a known Wednesday so there are days before Sunday
const TODAY_STR = '2026-07-01'; // Wednesday
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

const endOfToday = (): number => {
  const [year, month, day] = TODAY_STR.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
};

const ev = (
  id: string,
  start: number,
  overrides: Partial<ScheduleFromCalendarEvent> = {},
): ScheduleFromCalendarEvent => ({
  id,
  calProviderId: 'cal-1',
  title: id,
  start,
  duration: ONE_HOUR_MS,
  issueProviderKey: 'ICAL',
  ...overrides,
});

const entries = (items: ScheduleFromCalendarEvent[]): ScheduleCalendarMapEntry[] => [
  { items },
];

describe('getThisWeekCalendarEvents', () => {
  it('returns [] when todayStr is empty', () => {
    const start = endOfToday() + ONE_DAY_MS;
    expect(
      getThisWeekCalendarEvents(entries([ev('a', start)]), '', 0, Date.now()),
    ).toEqual([]);
  });

  it('excludes events happening today or before', () => {
    const twoHours = ONE_HOUR_MS * 2;
    const now = endOfToday() - twoHours;
    const todayEvent = ev('today', now + ONE_HOUR_MS);
    const result = getThisWeekCalendarEvents(entries([todayEvent]), TODAY_STR, 0, now);
    expect(result).toEqual([]);
  });

  it('includes timed events after today and before end of week', () => {
    const now = endOfToday() - ONE_HOUR_MS;
    const tomorrowEvent = ev('tomorrow', endOfToday() + ONE_HOUR_MS);
    const result = getThisWeekCalendarEvents(entries([tomorrowEvent]), TODAY_STR, 0, now);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('tomorrow');
  });

  it('excludes events after end of week (Sunday 23:59:59)', () => {
    const now = endOfToday() - ONE_HOUR_MS;
    const sixDays = ONE_DAY_MS * 6;
    const nextMonday = ev('next-monday', endOfToday() + sixDays);
    const result = getThisWeekCalendarEvents(entries([nextMonday]), TODAY_STR, 0, now);
    expect(result).toEqual([]);
  });

  it('excludes all-day events', () => {
    const now = endOfToday() - ONE_HOUR_MS;
    const allDayEvent = ev('all-day', endOfToday() + ONE_HOUR_MS, { isAllDay: true });
    const result = getThisWeekCalendarEvents(entries([allDayEvent]), TODAY_STR, 0, now);
    expect(result).toEqual([]);
  });

  it('sorts results by start time', () => {
    const now = endOfToday() - ONE_HOUR_MS;
    const threeDays = ONE_DAY_MS * 3;
    const twoDays = ONE_DAY_MS * 2;
    const e1 = ev('fri', endOfToday() + threeDays);
    const e2 = ev('thu', endOfToday() + twoDays);
    const result = getThisWeekCalendarEvents(entries([e1, e2]), TODAY_STR, 0, now);
    expect(result.map((e) => e.id)).toEqual(['thu', 'fri']);
  });
});

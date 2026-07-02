import { TestBed } from '@angular/core/testing';
import { SmartSchedulerService } from './smart-scheduler.service';
import { TaskCopy } from '../../tasks/task.model';
import { ScheduleItem, ScheduleItemType } from '../planner.model';

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

/** Build a minimal TaskCopy for testing */
const makeTask = (id: string, timeEstimate = 30 * MIN_MS): TaskCopy =>
  ({
    id,
    title: id,
    timeEstimate,
    timeSpent: 0,
    subTaskIds: [],
    tagIds: [],
    projectId: 'p1',
    issueId: undefined,
    issueProviderId: undefined,
    issueType: undefined,
    created: 0,
    isDone: false,
    dueDay: undefined,
    dueWithTime: undefined,
    reminderId: undefined,
    attachments: [],
    timeSpentOnDay: {},
  }) as unknown as TaskCopy;

/** Build a minimal ScheduleItemTask for testing */
const makeScheduleItem = (start: number, end: number): ScheduleItem =>
  ({
    id: `item-${start}`,
    type: ScheduleItemType.Task,
    start,
    end,
    task: makeTask(`task-${start}`),
  }) as ScheduleItem;

describe('SmartSchedulerService', () => {
  let service: SmartSchedulerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SmartSchedulerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('empty schedule', () => {
    it('places a single task starting from workStart when no items exist', () => {
      const task = makeTask('t1', 30 * MIN_MS);

      // Freeze time to 08:00 so workStart (09:00) is in the future
      const fakeNow = todayAt(8);
      spyOn(Date, 'now').and.returnValue(fakeNow);

      const result = service.suggestSchedule([task], [], 9, 18);

      expect(result.length).toBe(1);
      expect(result[0].task.id).toBe('t1');
      expect(result[0].suggestedTime).toBe(todayAt(9));
    });

    it('places task starting from now when now > workStart', () => {
      const task = makeTask('t1', 30 * MIN_MS);
      const fakeNow = todayAt(10, 15); // 10:15
      spyOn(Date, 'now').and.returnValue(fakeNow);

      const result = service.suggestSchedule([task], [], 9, 18);

      expect(result.length).toBe(1);
      expect(result[0].suggestedTime).toBe(fakeNow);
    });

    it('places multiple tasks back-to-back starting from workStart', () => {
      const tasks = [makeTask('t1', 60 * MIN_MS), makeTask('t2', 30 * MIN_MS)];
      const fakeNow = todayAt(8);
      spyOn(Date, 'now').and.returnValue(fakeNow);

      const result = service.suggestSchedule(tasks, [], 9, 18);

      // Sorted largest-first: t1 (60 min) then t2 (30 min)
      expect(result.length).toBe(2);
      const t1Slot = result.find((s) => s.task.id === 't1');
      const t2Slot = result.find((s) => s.task.id === 't2');
      expect(t1Slot?.suggestedTime).toBe(todayAt(9));
      expect(t2Slot?.suggestedTime).toBe(todayAt(10)); // t1 takes 9-10, t2 starts at 10
    });
  });

  describe('existing scheduled items', () => {
    it('places task in the gap after an existing item', () => {
      const task = makeTask('t1', 30 * MIN_MS);
      const fakeNow = todayAt(8);
      spyOn(Date, 'now').and.returnValue(fakeNow);

      // Existing meeting 09:00–10:00
      const items = [makeScheduleItem(todayAt(9), todayAt(10))];

      const result = service.suggestSchedule([task], items, 9, 18);

      expect(result.length).toBe(1);
      expect(result[0].suggestedTime).toBe(todayAt(10));
    });

    it('finds gap between two existing items', () => {
      const task = makeTask('t1', 30 * MIN_MS);
      const fakeNow = todayAt(8);
      spyOn(Date, 'now').and.returnValue(fakeNow);

      const items = [
        makeScheduleItem(todayAt(9), todayAt(10)),
        makeScheduleItem(todayAt(11), todayAt(12)),
      ];

      const result = service.suggestSchedule([task], items, 9, 18);

      // Gap from 10:00–11:00 should fit a 30-min task
      expect(result.length).toBe(1);
      expect(result[0].suggestedTime).toBe(todayAt(10));
    });
  });

  describe('task estimate > remaining day', () => {
    it('skips task when it does not fit in any gap', () => {
      // Task needs 3 hours; only 1 hour left in work day
      const task = makeTask('t1', 3 * HOUR_MS);
      const fakeNow = todayAt(17); // only 1 hour until work day ends at 18
      spyOn(Date, 'now').and.returnValue(fakeNow);

      const result = service.suggestSchedule([task], [], 9, 18);

      expect(result.length).toBe(0);
    });

    it('schedules a short task even when a long one cannot fit', () => {
      const bigTask = makeTask('big', 3 * HOUR_MS);
      const smallTask = makeTask('small', 30 * MIN_MS);
      const fakeNow = todayAt(17);
      spyOn(Date, 'now').and.returnValue(fakeNow);

      const result = service.suggestSchedule([bigTask, smallTask], [], 9, 18);

      // big task (3h) won't fit, small task (30min) will
      expect(result.length).toBe(1);
      expect(result[0].task.id).toBe('small');
    });
  });

  describe('work day already over', () => {
    it('falls back to next 3 hours when current time is past work end', () => {
      const task = makeTask('t1');
      spyOn(Date, 'now').and.returnValue(todayAt(19));

      const result = service.suggestSchedule([task], [], 9, 18);

      // Scheduler falls back to "next 3 hours from now" when outside configured work hours
      expect(result.length).toBe(1);
      expect(result[0].task.id).toBe('t1');
    });
  });
});

// Helper: get Unix ms for today at a specific hour (and optional minute)
const todayAt = (hour: number, minute = 0): number => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
};

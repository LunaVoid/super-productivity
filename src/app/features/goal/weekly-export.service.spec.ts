import { TestBed } from '@angular/core/testing';
import { WeeklyExportService } from './weekly-export.service';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { Goal } from './goal.model';
import { TaskCopy } from '../tasks/task.model';

/** Subclass that captures download calls instead of triggering browser download. */
class TestableWeeklyExportService extends WeeklyExportService {
  lastFilename = '';
  lastContent = '';

  protected override async _triggerDownload(
    filename: string,
    content: string,
  ): Promise<void> {
    this.lastFilename = filename;
    this.lastContent = content;
  }
}

describe('WeeklyExportService', () => {
  let service: TestableWeeklyExportService;
  let mockStore: jasmine.SpyObj<Store>;

  const makeGoal = (partial: Partial<Goal>): Goal =>
    ({
      id: 'g1',
      title: 'Test Goal',
      horizon: 'YEARLY',
      linkedTaskIds: [],
      missedWeekBehavior: 'FORGIVE',
      created: Date.now(),
      ...partial,
    }) as Goal;

  /** Build a minimal TaskCopy with a dueDay set to today so it appears this week. */
  const makeTask = (partial: Partial<TaskCopy>): TaskCopy => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: 'task-1',
      title: 'Test Task',
      isDone: false,
      dueDay: today,
      parentId: undefined,
      ...partial,
    } as unknown as TaskCopy;
  };

  beforeEach(() => {
    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch', 'selectSignal']);
    mockStore.select.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        { provide: WeeklyExportService, useClass: TestableWeeklyExportService },
        { provide: Store, useValue: mockStore },
      ],
    });

    service = TestBed.inject(WeeklyExportService) as TestableWeeklyExportService;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('exportWeek produces a .md filename', async () => {
    await service.exportWeek();
    expect(service.lastFilename).toContain('.md');
  });

  it('exportWeek markdown contains main section headers', async () => {
    await service.exportWeek();
    const md = service.lastContent;
    expect(md).toContain('# Weekly Plan');
    expect(md).toContain('## Yearly Goals');
    expect(md).toContain('## Goal Tasks This Week');
    expect(md).toContain('## Other Tasks This Week');
    expect(md).toContain('## Daily Habit Tracker');
    expect(md).toContain('## End of Week Reflection');
  });

  it('exportWeek includes yearly goal titles', async () => {
    const yearlyGoal = makeGoal({
      id: 'y1',
      title: 'Land an internship',
      horizon: 'YEARLY',
    });
    mockStore.select.and.callFake(() => of([yearlyGoal]));
    await service.exportWeek();
    expect(service.lastContent).toContain('Land an internship');
  });

  it('exportWeek includes weekly intention when set', async () => {
    const weeklyGoal = makeGoal({
      id: 'w1',
      title: 'Ship dementia assistant',
      horizon: 'WEEKLY',
      weeklyIntention: 'Move deployment forward every day',
    });
    mockStore.select.and.callFake(() => of([weeklyGoal]));
    await service.exportWeek();
    expect(service.lastContent).toContain('Move deployment forward every day');
  });

  it('exportWeek handles empty state without throwing', async () => {
    mockStore.select.and.returnValue(of([]));
    await expectAsync(service.exportWeek()).toBeResolved();
    expect(service.lastContent).toBeTruthy();
  });

  it('goal-linked tasks appear under their goal heading in Goal Tasks section', async () => {
    const goal = makeGoal({
      id: 'g-linked',
      title: 'Ship dementia assistant',
      horizon: 'WEEKLY',
    });
    const linkedTask = makeTask({
      id: 't-linked',
      title: 'Deploy staging',
      goalId: 'g-linked',
    });

    mockStore.select.and.callFake((selector: unknown) => {
      // Return goals for first call, tasks for second, empty for third (repeatCfgs)
      const calls = (mockStore.select as jasmine.Spy).calls.count();
      if (calls === 1) return of([goal]);
      if (calls === 2) return of([linkedTask]);
      return of([]);
    });

    await service.exportWeek();
    const md = service.lastContent;

    expect(md).toContain('## Goal Tasks This Week');
    expect(md).toContain('### Ship dementia assistant');
    expect(md).toContain('- [ ] Deploy staging');
  });

  it('unlinked tasks appear in Other Tasks section and not under a goal heading', async () => {
    const unlinkedTask = makeTask({ id: 't-other', title: 'Buy groceries' });

    mockStore.select.and.callFake(() => {
      const calls = (mockStore.select as jasmine.Spy).calls.count();
      if (calls === 2) return of([unlinkedTask]);
      return of([]);
    });

    await service.exportWeek();
    const md = service.lastContent;

    expect(md).toContain('## Other Tasks This Week');
    expect(md).toContain('- [ ] Buy groceries');
    // Should not appear in goal tasks section
    const goalTasksSection = md.split('## Other Tasks This Week')[0];
    expect(goalTasksSection).not.toContain('Buy groceries');
  });
});

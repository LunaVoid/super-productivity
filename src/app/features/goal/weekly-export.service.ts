import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { first } from 'rxjs/operators';
import { selectAllGoals } from './store/goal.selectors';
import { Goal } from './goal.model';
import { selectAllTasksInActiveProjects } from '../tasks/store/task.selectors';
import { selectActiveTaskRepeatCfgs } from '../task-repeat-cfg/store/task-repeat-cfg.selectors';
import { TaskCopy } from '../tasks/task.model';
import { download } from '../../util/download';
import { TASK_REPEAT_WEEKDAY_MAP } from '../task-repeat-cfg/task-repeat-cfg.model';

const ISO_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Returns the ISO week number for a Date. */
const isoWeek = (d: Date): number => {
  const date = new Date(d.valueOf());
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diffMs = date.valueOf() - yearStart.valueOf();
  const diffDays = diffMs / 86400000;
  return Math.ceil((diffDays + 1) / 7);
};

/** Returns the Monday date of the ISO week containing `d`. */
const weekMonday = (d: Date): Date => {
  const day = d.getDay() || 7; // Sunday=7
  const mon = new Date(d);
  mon.setDate(d.getDate() - day + 1);
  mon.setHours(0, 0, 0, 0);
  return mon;
};

/** Human-readable week range string: "Jun 30 – Jul 6, 2026". */
const weekRangeLabel = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date): string =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = sunday.getFullYear();
  return `${fmt(monday)} – ${fmt(sunday)}, ${year}`;
};

@Injectable({
  providedIn: 'root',
})
export class WeeklyExportService {
  private _store = inject(Store);

  async exportWeek(): Promise<void> {
    const [allGoals, allTasks, allRepeatCfgs] = await Promise.all([
      this._store.select(selectAllGoals).pipe(first()).toPromise(),
      this._store.select(selectAllTasksInActiveProjects).pipe(first()).toPromise(),
      this._store.select(selectActiveTaskRepeatCfgs).pipe(first()).toPromise(),
    ]);

    const goals = allGoals ?? [];
    const tasks = allTasks ?? [];
    const repeatCfgs = allRepeatCfgs ?? [];

    const today = new Date();
    const monday = weekMonday(today);
    const weekLabel = weekRangeLabel(monday);
    const weekNum = isoWeek(today);

    // Date strings for Monday–Sunday of current week
    const weekDays: string[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });

    const yearlyGoals = goals.filter((g) => g.horizon === 'YEARLY' && !g.parentGoalId);
    const monthlyGoals = goals.filter((g) => g.horizon === 'MONTHLY');
    const weeklyGoals = goals.filter((g) => g.horizon === 'WEEKLY');

    // Tasks this week: due this week, not done, top-level only
    const candidateTasks = tasks
      .filter((t) => !t.isDone && t.dueDay && weekDays.includes(t.dueDay) && !t.parentId)
      .sort((a, b) => (a.dueDay ?? '').localeCompare(b.dueDay ?? ''));

    const goalTasks = candidateTasks.filter((t) => !!t.goalId).slice(0, 7);
    const otherTasks = candidateTasks.filter((t) => !t.goalId).slice(0, 7);

    // Scheduled appointments: tasks with dueWithTime this week
    const appointments = tasks
      .filter((t) => {
        if (!t.dueWithTime) return false;
        const d = new Date(t.dueWithTime).toISOString().slice(0, 10);
        return weekDays.includes(d);
      })
      .sort((a, b) => (a.dueWithTime ?? 0) - (b.dueWithTime ?? 0));

    // Habits: active repeat cfgs that run at least daily (any day is checked)
    const habits = repeatCfgs.filter((cfg) => {
      // Include if any day-of-week is enabled or no specific days (runs every day)
      const hasDays = TASK_REPEAT_WEEKDAY_MAP.some((day) => (cfg as any)[day]);
      return hasDays || cfg.repeatEvery === 1;
    });

    // Check which habits were completed each day this week
    const habitCompletions: Record<string, Record<string, boolean>> = {};
    for (const habit of habits) {
      habitCompletions[habit.id] = {};
      for (const day of weekDays) {
        const completed = tasks.some(
          (t) =>
            t.repeatCfgId === habit.id &&
            t.isDone &&
            t.doneOn &&
            new Date(t.doneOn).toISOString().slice(0, 10) === day,
        );
        habitCompletions[habit.id][day] = completed;
      }
    }

    const md = this._buildMarkdown({
      weekLabel,
      weekNum,
      yearlyGoals,
      monthlyGoals,
      weeklyGoals,
      allGoals: goals,
      goalTasks,
      otherTasks,
      appointments,
      habits: habits.map((h) => ({
        title: h.title ?? 'Untitled habit',
        completions: weekDays.map((d) => habitCompletions[h.id][d] ?? false),
      })),
    });

    const filename = `weekly-plan-w${weekNum}-${weekLabel.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
    await this._triggerDownload(filename, md);
  }

  /** Separated for testability. */
  protected async _triggerDownload(filename: string, content: string): Promise<void> {
    await download(filename, content);
  }

  private _buildMarkdown(opts: {
    weekLabel: string;
    weekNum: number;
    yearlyGoals: Goal[];
    monthlyGoals: Goal[];
    weeklyGoals: Goal[];
    allGoals: Goal[];
    goalTasks: TaskCopy[];
    otherTasks: TaskCopy[];
    appointments: TaskCopy[];
    habits: Array<{ title: string; completions: boolean[] }>;
  }): string {
    const {
      weekLabel,
      weekNum,
      yearlyGoals,
      monthlyGoals,
      weeklyGoals,
      allGoals,
      goalTasks,
      otherTasks,
      appointments,
      habits,
    } = opts;

    const lines: string[] = [];

    lines.push(`# Weekly Plan — Week ${weekNum}: ${weekLabel}`);
    lines.push('');

    // Yearly goals table
    lines.push('## Yearly Goals');
    lines.push('');
    if (yearlyGoals.length > 0) {
      lines.push('| # | Goal |');
      lines.push('|---|------|');
      yearlyGoals.forEach((g, i) => {
        lines.push(`| ${i + 1} | ${g.title} |`);
      });
    } else {
      lines.push('*No yearly goals set.*');
    }
    lines.push('');

    // Monthly goals table
    lines.push('## Monthly Goals');
    lines.push('');
    if (monthlyGoals.length > 0) {
      lines.push('| # | Goal | Status |');
      lines.push('|---|------|--------|');
      monthlyGoals.forEach((g, i) => {
        lines.push(`| ${i + 1} | ${g.title} |  |`);
      });
    } else {
      lines.push('*No monthly goals set.*');
    }
    lines.push('');

    // Weekly intentions
    lines.push("## This Week's Intentions");
    lines.push('');
    lines.push('> Directional, not checklists. What kind of week do you want?');
    lines.push('');
    if (weeklyGoals.length > 0) {
      weeklyGoals.forEach((g, i) => {
        const intention = g.weeklyIntention
          ? `${g.title} — ${g.weeklyIntention}`
          : g.title;
        lines.push(`${i + 1}. ${intention}`);
      });
    } else {
      lines.push('1. ');
      lines.push('2. ');
      lines.push('3. ');
    }
    lines.push('');

    // Goal tasks grouped by goal
    lines.push('## Goal Tasks This Week');
    lines.push('');
    if (goalTasks.length > 0) {
      // Group by goalId
      const byGoal = new Map<string, TaskCopy[]>();
      for (const t of goalTasks) {
        const gid = t.goalId!;
        if (!byGoal.has(gid)) byGoal.set(gid, []);
        byGoal.get(gid)!.push(t);
      }
      for (const [gid, gtasks] of byGoal) {
        const goalTitle = allGoals.find((g) => g.id === gid)?.title ?? 'Unknown goal';
        lines.push(`### ${goalTitle}`);
        lines.push('');
        for (const t of gtasks) {
          lines.push(`- [ ] ${t.title}`);
        }
        lines.push('');
      }
    } else {
      lines.push('*No goal-linked tasks scheduled this week.*');
      lines.push('');
    }

    // Other tasks (not linked to any goal)
    lines.push('## Other Tasks This Week');
    lines.push('');
    lines.push("> Max 7. If it's not here it's backlog.");
    lines.push('');
    if (otherTasks.length > 0) {
      otherTasks.forEach((t) => {
        lines.push(`- [ ] ${t.title}`);
      });
    } else {
      lines.push('*No other tasks scheduled this week.*');
    }
    lines.push('');

    // Habit tracker
    lines.push('## Daily Habit Tracker');
    lines.push('');
    if (habits.length > 0) {
      lines.push('| Habit | M | T | W | T | F | S | S |');
      lines.push('|-------|---|---|---|---|---|---|---|');
      habits.forEach((h) => {
        const cells = h.completions.map((done) => (done ? '✅' : '☐')).join(' | ');
        lines.push(`| ${h.title} | ${cells} |`);
      });
    } else {
      lines.push('| Habit | M | T | W | T | F | S | S |');
      lines.push('|-------|---|---|---|---|---|---|---|');
      lines.push(
        '| *(add recurring tasks to see habits here)* | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |',
      );
    }
    lines.push('');

    // Appointments
    lines.push('## Appointments & Time Blocks This Week');
    lines.push('');
    if (appointments.length > 0) {
      appointments.forEach((t) => {
        const dt = new Date(t.dueWithTime!);
        const dayName = ISO_DAY_NAMES[dt.getDay()];
        const timeStr = dt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
        lines.push(`- ${dayName} ${timeStr} — ${t.title}`);
      });
    } else {
      lines.push('*No timed appointments this week.*');
    }
    lines.push('');

    // End of week reflection
    lines.push('## End of Week Reflection');
    lines.push('');
    lines.push("> Fill this out Sunday before writing next week's plan.");
    lines.push('');
    lines.push('**What actually got done?**');
    lines.push('');
    lines.push('');
    lines.push('**What kept not getting done, and why?**');
    lines.push('');
    lines.push('');
    lines.push("**What's carrying over to next week?**");
    lines.push('');
    lines.push('');
    lines.push('**Anything to move back to the someday list?**');
    lines.push('');
    lines.push('');

    const reviewDay = new Date();
    reviewDay.setDate(reviewDay.getDate() + ((7 - reviewDay.getDay()) % 7) || 7);
    lines.push(
      `**Next review date:** ${reviewDay.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })}`,
    );
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(
      `*Generated by SuperProd on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*`,
    );
    lines.push('');

    return lines.join('\n');
  }
}

import { Injectable, signal } from '@angular/core';

/**
 * Tracks the goal that is currently "active" on the goal page.
 * When the user opens the inline add-task row for a goal, that goal becomes
 * active. The global Shift+A shortcut reads this service so the new task bar
 * can pre-link the created task to the active goal.
 *
 * The goal is cleared when the add-task bar closes or when the user navigates
 * away from the goal page.
 */
@Injectable({
  providedIn: 'root',
})
export class ActiveGoalService {
  readonly activeGoalId = signal<string | null>(null);

  setActiveGoal(goalId: string): void {
    this.activeGoalId.set(goalId);
  }

  clear(): void {
    this.activeGoalId.set(null);
  }
}

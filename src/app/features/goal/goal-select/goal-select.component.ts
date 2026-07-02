import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { Store } from '@ngrx/store';
import { Task } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { Goal } from '../goal.model';
import { selectAllGoals } from '../store/goal.selectors';

@Component({
  selector: 'goal-select',
  templateUrl: './goal-select.component.html',
  styleUrls: ['./goal-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FormsModule, MatSelect, MatOption],
})
export class GoalSelectComponent implements OnInit {
  private _store = inject(Store);
  private _taskService = inject(TaskService);

  readonly task = input.required<Task>();

  readonly allGoals = this._store.selectSignal(selectAllGoals);
  readonly selectedGoalId = signal<string | null>(null);

  ngOnInit(): void {
    const t = this.task() as Task & { goalId?: string };
    this.selectedGoalId.set(t.goalId ?? null);
  }

  onGoalChange(goalId: string | null): void {
    this._taskService.update(this.task().id, {
      goalId: goalId ?? undefined,
    } as Partial<Task>);
  }

  trackByGoal(_: number, g: Goal): string {
    return g.id;
  }
}

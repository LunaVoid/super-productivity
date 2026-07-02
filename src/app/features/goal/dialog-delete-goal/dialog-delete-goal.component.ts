import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Goal } from '../goal.model';
import { getGoalSubtree } from './dialog-delete-goal.utils';

export interface DialogDeleteGoalData {
  goal: Goal;
  allGoals: Goal[];
}

export interface DialogDeleteGoalResult {
  mode: 'DELETE_ALL' | 'UNLINK';
  remember: boolean;
}

@Component({
  selector: 'dialog-delete-goal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatRadioModule,
    MatCheckboxModule,
  ],
  templateUrl: './dialog-delete-goal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogDeleteGoalComponent {
  readonly data = inject<DialogDeleteGoalData>(MAT_DIALOG_DATA);
  private readonly _dialogRef =
    inject<MatDialogRef<DialogDeleteGoalComponent, DialogDeleteGoalResult | null>>(
      MatDialogRef,
    );

  readonly affectedGoals = computed(() =>
    getGoalSubtree(this.data.goal, this.data.allGoals),
  );
  readonly deleteMode = signal<'DELETE_ALL' | 'UNLINK'>('DELETE_ALL');
  readonly rememberChoice = signal(false);

  confirm(): void {
    this._dialogRef.close({ mode: this.deleteMode(), remember: this.rememberChoice() });
  }

  cancel(): void {
    this._dialogRef.close(null);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { CommonModule } from '@angular/common';
import { selectAllGoals } from '../../goal/store/goal.selectors';
import { addProjectManagerItem } from '../store/project-manager.actions';
import { ProjectManagerItem } from '../project-manager.model';

@Component({
  selector: 'dialog-create-project-manager-item',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './dialog-create-project.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogCreateProjectManagerItemComponent {
  private _store = inject(Store);
  private _dialogRef = inject(MatDialogRef<DialogCreateProjectManagerItemComponent>);

  private readonly _allGoals = this._store.selectSignal(selectAllGoals);
  readonly linkableGoals = computed(() =>
    this._allGoals().filter((g) => g.horizon !== 'AREA'),
  );

  readonly deadlineDate = signal<Date | null>(null);

  readonly title = signal('');
  readonly description = signal('');
  readonly goalId = signal<string | null>(null);

  submit(): void {
    const t = this.title().trim();
    if (!t) return;
    const d = this.deadlineDate();
    const deadline = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : undefined;
    const project: ProjectManagerItem = {
      id: nanoid(),
      title: t,
      description: this.description().trim(),
      deadline,
      status: 'ACTIVE',
      goalId: this.goalId() ?? undefined,
      tagIds: [],
      created: Date.now(),
    };
    this._store.dispatch(addProjectManagerItem({ project }));
    this._dialogRef.close(project);
  }

  cancel(): void {
    this._dialogRef.close();
  }
}

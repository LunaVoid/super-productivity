import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { selectAllProjectManagerItems } from '../store/project-manager.selectors';
import {
  updateProjectManagerItem,
  deleteProjectManagerItem,
} from '../store/project-manager.actions';
import { ProjectManagerItem, ProjectManagerStatus } from '../project-manager.model';
import { DialogCreateProjectManagerItemComponent } from '../dialog-create-project/dialog-create-project.component';
import { DialogAskClaudeComponent } from '../dialog-ask-claude/dialog-ask-claude.component';

@Component({
  selector: 'project-manager-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './project-manager-page.component.html',
  styleUrls: ['./project-manager-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectManagerPageComponent {
  private _store = inject(Store);
  private _matDialog = inject(MatDialog);

  readonly allProjects = this._store.selectSignal(selectAllProjectManagerItems);

  readonly filterStatus = signal<ProjectManagerStatus | 'ALL'>('ALL');

  readonly filteredProjects = computed(() => {
    const f = this.filterStatus();
    return f === 'ALL'
      ? this.allProjects()
      : this.allProjects().filter((p) => p.status === f);
  });

  openCreateDialog(): void {
    this._matDialog.open(DialogCreateProjectManagerItemComponent, { width: '520px' });
  }

  openAskClaude(project: ProjectManagerItem): void {
    this._matDialog.open(DialogAskClaudeComponent, {
      width: '640px',
      data: { project },
    });
  }

  setStatus(project: ProjectManagerItem, status: ProjectManagerStatus): void {
    this._store.dispatch(
      updateProjectManagerItem({ project: { id: project.id, changes: { status } } }),
    );
  }

  deleteProject(id: string): void {
    this._store.dispatch(deleteProjectManagerItem({ id }));
  }

  isDeadlineSoon(deadline: string | undefined): boolean {
    if (!deadline) return false;
    const daysUntil = (new Date(deadline).getTime() - Date.now()) / 86400000;
    return daysUntil >= 0 && daysUntil <= 7;
  }

  deadlineLabel(deadline: string | undefined): string {
    if (!deadline) return '';
    return new Date(deadline + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  setFilter(f: ProjectManagerStatus | 'ALL'): void {
    this.filterStatus.set(f);
  }
}

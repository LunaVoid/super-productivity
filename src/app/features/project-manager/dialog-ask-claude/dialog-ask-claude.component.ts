import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TaskService } from '../../tasks/task.service';
import { ProjectManagerItem } from '../project-manager.model';

interface ClaudeSubtask {
  title: string;
  notes?: string;
}

interface ClaudeTask {
  title: string;
  timeEstimate?: number;
  dueDay?: string;
  deadlineDay?: string;
  notes?: string;
  subtasks?: ClaudeSubtask[];
}

@Component({
  selector: 'dialog-ask-claude',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './dialog-ask-claude.component.html',
  styleUrls: ['./dialog-ask-claude.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAskClaudeComponent {
  private _taskService = inject(TaskService);
  private _dialogRef = inject(MatDialogRef<DialogAskClaudeComponent>);
  readonly project: ProjectManagerItem = inject(MAT_DIALOG_DATA).project;

  readonly step = signal<'copy' | 'paste' | 'preview'>('copy');
  readonly pastedJson = signal('');
  readonly parseError = signal('');
  readonly parsedTasks = signal<ClaudeTask[]>([]);
  readonly copied = signal(false);

  readonly prompt = computed(() => {
    const deadline = this.project.deadline ?? 'none';
    return `You are a project planning assistant. Given this project, generate a list of tasks needed to complete it.

Project: ${this.project.title}
Description: ${this.project.description || 'No description provided.'}
Deadline: ${deadline}

Return ONLY a JSON array with this exact structure (no other text):
[
  {
    "title": "Task title",
    "timeEstimate": 3600000,
    "dueDay": "2026-07-10",
    "deadlineDay": "2026-07-15",
    "notes": "optional notes",
    "subtasks": [
      { "title": "Subtask title", "notes": "optional notes" }
    ]
  }
]

Rules:
- timeEstimate is in milliseconds (1h = 3600000)
- dueDay is when you plan to work on it (YYYY-MM-DD)
- deadlineDay is the hard deadline (YYYY-MM-DD), optional
- subtasks is optional — use it for exercise sessions (sets/reps per exercise), meals (items per meal), etc.
- Generate 3-8 tasks that cover the full scope`;
  });

  async copyPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.prompt());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // fallback — user can manually copy from the textarea
    }
    this.step.set('paste');
  }

  parseJson(): void {
    this.parseError.set('');
    try {
      const raw = this.pastedJson().trim();
      const tasks = JSON.parse(raw) as unknown;
      if (!Array.isArray(tasks)) {
        this.parseError.set('Expected a JSON array.');
        return;
      }
      const validated: ClaudeTask[] = (tasks as Record<string, unknown>[]).map((t) => ({
        title: String(t['title'] ?? ''),
        timeEstimate:
          typeof t['timeEstimate'] === 'number' ? t['timeEstimate'] : undefined,
        dueDay: typeof t['dueDay'] === 'string' ? t['dueDay'] : undefined,
        deadlineDay: typeof t['deadlineDay'] === 'string' ? t['deadlineDay'] : undefined,
        notes: typeof t['notes'] === 'string' ? t['notes'] : undefined,
        subtasks: Array.isArray(t['subtasks'])
          ? (t['subtasks'] as Record<string, unknown>[]).map((s) => ({
              title: String(s['title'] ?? ''),
              notes: typeof s['notes'] === 'string' ? s['notes'] : undefined,
            }))
          : undefined,
      }));
      this.parsedTasks.set(validated);
      this.step.set('preview');
    } catch {
      this.parseError.set('Invalid JSON — please paste the raw JSON array from Claude.');
    }
  }

  createAll(): void {
    for (const t of this.parsedTasks()) {
      if (!t.title.trim()) continue;
      const taskId = this._taskService.add(
        t.title,
        false,
        {
          timeEstimate: t.timeEstimate ?? 0,
          dueDay: t.dueDay ?? undefined,
          deadlineDay: t.deadlineDay ?? undefined,
          notes: t.notes ?? undefined,
        },
        true,
      );
      if (t.subtasks?.length && taskId) {
        for (const s of t.subtasks) {
          if (!s.title.trim()) continue;
          this._taskService.addSubTaskTo(taskId, {
            title: s.title,
            notes: s.notes ?? undefined,
          });
        }
      }
    }
    this._dialogRef.close(this.parsedTasks());
  }

  cancel(): void {
    this._dialogRef.close();
  }

  back(): void {
    this.step.set(this.step() === 'preview' ? 'paste' : 'copy');
  }

  msToHours(ms: number | undefined): string {
    if (!ms) return '—';
    return `${(ms / 3600000).toFixed(1)}h`;
  }
}

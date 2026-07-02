import { EntityState } from '@ngrx/entity';

export type ProjectManagerStatus = 'ACTIVE' | 'DONE' | 'PAUSED';

export interface ProjectManagerItemCopy {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  status: ProjectManagerStatus;
  goalId?: string;
  tagIds: string[];
  created: number;
  spProjectId?: string;
}

export type ProjectManagerItem = Readonly<ProjectManagerItemCopy>;
export type ProjectManagerState = EntityState<ProjectManagerItem>;

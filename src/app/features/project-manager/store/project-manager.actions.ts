import { createAction } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { ProjectManagerItem } from '../project-manager.model';
import { PersistentActionMeta } from '../../../op-log/core/persistent-action.interface';
import { OpType } from '../../../op-log/core/operation.types';

export const addProjectManagerItem = createAction(
  '[ProjectManager] Add Project',
  (props: { project: ProjectManagerItem }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'PROJECT_MANAGER',
      entityId: props.project.id,
      opType: OpType.Create,
    } satisfies PersistentActionMeta,
  }),
);

export const updateProjectManagerItem = createAction(
  '[ProjectManager] Update Project',
  (props: { project: Update<ProjectManagerItem> }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'PROJECT_MANAGER',
      entityId: props.project.id as string,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const deleteProjectManagerItem = createAction(
  '[ProjectManager] Delete Project',
  (props: { id: string }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'PROJECT_MANAGER',
      entityId: props.id,
      opType: OpType.Delete,
    } satisfies PersistentActionMeta,
  }),
);

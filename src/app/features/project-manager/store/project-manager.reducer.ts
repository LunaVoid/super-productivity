import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { ProjectManagerItem, ProjectManagerState } from '../project-manager.model';
import { createFeatureSelector, createReducer, on } from '@ngrx/store';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import {
  addProjectManagerItem,
  deleteProjectManagerItem,
  updateProjectManagerItem,
} from './project-manager.actions';

export const PROJECT_MANAGER_FEATURE_NAME = 'projectManager';

export const projectManagerAdapter: EntityAdapter<ProjectManagerItem> =
  createEntityAdapter<ProjectManagerItem>();

export const selectProjectManagerFeatureState =
  createFeatureSelector<ProjectManagerState>(PROJECT_MANAGER_FEATURE_NAME);

export const { selectIds, selectEntities, selectAll, selectTotal } =
  projectManagerAdapter.getSelectors();

export const initialProjectManagerState: ProjectManagerState =
  projectManagerAdapter.getInitialState();

export const projectManagerReducer = createReducer<ProjectManagerState>(
  initialProjectManagerState,

  on(loadAllData, (oldState, { appDataComplete }) => {
    const loaded = (appDataComplete as Record<string, unknown>)['projectManager'] as
      | ProjectManagerState
      | undefined;
    return loaded ? { ...loaded } : oldState;
  }),

  on(addProjectManagerItem, (state, { project }) =>
    projectManagerAdapter.addOne(project, state),
  ),

  on(updateProjectManagerItem, (state, { project }) =>
    projectManagerAdapter.updateOne(project, state),
  ),

  on(deleteProjectManagerItem, (state, { id }) =>
    projectManagerAdapter.removeOne(id, state),
  ),
);

import { createSelector } from '@ngrx/store';
import {
  projectManagerAdapter,
  selectProjectManagerFeatureState,
} from './project-manager.reducer';
import { ProjectManagerItem, ProjectManagerStatus } from '../project-manager.model';

const { selectAll, selectEntities } = projectManagerAdapter.getSelectors();

export const selectAllProjectManagerItems = createSelector(
  selectProjectManagerFeatureState,
  selectAll,
);

export const selectProjectManagerEntities = createSelector(
  selectProjectManagerFeatureState,
  selectEntities,
);

export const selectActiveProjectManagerItems = createSelector(
  selectAllProjectManagerItems,
  (items) => items.filter((p) => p.status === ('ACTIVE' satisfies ProjectManagerStatus)),
);

export const selectProjectManagerItemById = createSelector(
  selectProjectManagerFeatureState,
  (state, props: { id: string }): ProjectManagerItem => {
    const item = state.entities[props.id];
    if (!item) throw new Error('No project manager item ' + props.id);
    return item;
  },
);

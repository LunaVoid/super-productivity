import { createSelector } from '@ngrx/store';
import {
  projectManagerAdapter,
  selectProjectManagerFeatureState,
} from './project-manager.reducer';
import { ProjectManagerStatus } from '../project-manager.model';

const { selectAll } = projectManagerAdapter.getSelectors();

export const selectAllProjectManagerItems = createSelector(
  selectProjectManagerFeatureState,
  selectAll,
);

export const selectActiveProjectManagerItems = createSelector(
  selectAllProjectManagerItems,
  (items) => items.filter((p) => p.status === ('ACTIVE' satisfies ProjectManagerStatus)),
);

export const selectProjectManagerItemById = createSelector(
  selectProjectManagerFeatureState,
  (state, props: { id: string }) => state.entities[props.id],
);

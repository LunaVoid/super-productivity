import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { WeeklyReview, WeeklyReviewState } from '../weekly-setup.model';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { saveWeeklyReview } from './weekly-setup.actions';

export const WEEKLY_REVIEW_FEATURE_NAME = 'weeklyReview';

export const weeklyReviewAdapter: EntityAdapter<WeeklyReview> =
  createEntityAdapter<WeeklyReview>();

export const selectWeeklyReviewFeatureState = createFeatureSelector<WeeklyReviewState>(
  WEEKLY_REVIEW_FEATURE_NAME,
);

export const initialWeeklyReviewState: WeeklyReviewState =
  weeklyReviewAdapter.getInitialState();

export const weeklyReviewReducer = createReducer<WeeklyReviewState>(
  initialWeeklyReviewState,

  on(loadAllData, (oldState, { appDataComplete }) => {
    const loaded = (appDataComplete as Record<string, unknown>)['weeklyReview'] as
      | WeeklyReviewState
      | undefined;
    return loaded ? { ...loaded } : oldState;
  }),

  on(saveWeeklyReview, (state, { review }) =>
    weeklyReviewAdapter.upsertOne(review, state),
  ),
);

const { selectAll } = weeklyReviewAdapter.getSelectors();
export const selectAllWeeklyReviews = createSelector(
  selectWeeklyReviewFeatureState,
  selectAll,
);

export const selectLatestWeeklyReview = createSelector(
  selectAllWeeklyReviews,
  (reviews) => reviews.sort((a, b) => b.created - a.created)[0] ?? null,
);

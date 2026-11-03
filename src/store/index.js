import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { useDispatch, useSelector } from 'react-redux';
import storage from './storage.js';
import authReducer from './slices/authSlice.js';
import teamsReducer from './slices/teamsSlice.js';
import uiReducer from './slices/uiSlice.js';

const rootReducer = combineReducers({
  auth: authReducer,
  teams: teamsReducer,
  ui: uiReducer,
});

const persistConfig = {
  key: 'office_roster_root',
  version: 1,
  storage,
  whitelist: ['auth', 'teams'], // Persist both authentication and teams across refreshes
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Synchronous mirror to localStorage for instant pre-hydration and native widget sync
store.subscribe(() => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const state = store.getState();
    if (state.teams?.teams && state.teams.teams.length > 0) {
      window.localStorage.setItem('office_teams_list', JSON.stringify(state.teams.teams));
    }
    if (state.teams?.activeTeamId) {
      window.localStorage.setItem('office_active_team_id', state.teams.activeTeamId);
    }
    if (state.auth?.user) {
      window.localStorage.setItem('google_auth_user', JSON.stringify(state.auth.user));
    }
  } catch {}
});

export const persistor = persistStore(store);

// Convenient hooks
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// Re-export actions & selectors
export * from './slices/authSlice.js';
export * from './slices/teamsSlice.js';
export * from './slices/uiSlice.js';


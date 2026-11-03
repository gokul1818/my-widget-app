import { createSlice } from '@reduxjs/toolkit';

const getInitialUser = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('google_auth_user');
      if (saved) return JSON.parse(saved);
    }
  } catch {}
  return null;
};

const savedUser = getInitialUser();

const initialState = {
  user: savedUser,
  isAuthenticated: Boolean(savedUser),
  loading: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.loading = false;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
    setAuthLoading: (state, action) => {
      state.loading = Boolean(action.payload);
    },
  },
});

export const { setUser, clearUser, setAuthLoading } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;

export default authSlice.reducer;

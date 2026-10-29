import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeFilter: 'all', // 'all' | 'office' | 'wfh' | 'leave'
  searchQuery: '',
  theme: 'dark',
  toastMessage: null,
  modals: {
    isAddModalOpen: false,
    isGoogleModalOpen: false,
    isCalendarModalOpen: false,
    isCreateTeamOpen: false,
    isInviteModalOpen: false,
    isJoinModalOpen: false,
    isTeamChoiceModalOpen: false,
    isEditMemberOpen: false,
  },
  initialJoinCode: '',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveFilter: (state, action) => {
      state.activeFilter = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    showToast: (state, action) => {
      state.toastMessage = action.payload;
    },
    hideToast: (state) => {
      state.toastMessage = null;
    },
    setModalOpen: (state, action) => {
      const { modalName, isOpen } = action.payload;
      if (modalName in state.modals) {
        state.modals[modalName] = Boolean(isOpen);
      }
    },
    setInitialJoinCode: (state, action) => {
      state.initialJoinCode = action.payload || '';
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key] = false;
      });
      state.initialJoinCode = '';
    },
  },
});

export const {
  setActiveFilter,
  setSearchQuery,
  setTheme,
  showToast,
  hideToast,
  setModalOpen,
  setInitialJoinCode,
  closeAllModals,
} = uiSlice.actions;

export const selectActiveFilter = (state) => state.ui.activeFilter;
export const selectSearchQuery = (state) => state.ui.searchQuery;
export const selectTheme = (state) => state.ui.theme;
export const selectToastMessage = (state) => state.ui.toastMessage;
export const selectModals = (state) => state.ui.modals;
export const selectInitialJoinCode = (state) => state.ui.initialJoinCode;

export default uiSlice.reducer;

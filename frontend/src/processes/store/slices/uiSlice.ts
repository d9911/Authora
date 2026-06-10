import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  modalOpen: boolean;
  toast: string | null;
}

const initialState: UiState = { modalOpen: false, toast: null };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setModalOpen(state, action: PayloadAction<boolean>) {
      state.modalOpen = action.payload;
    },
    showToast(state, action: PayloadAction<string | null>) {
      state.toast = action.payload;
    },
  },
});

export const { setModalOpen, showToast } = uiSlice.actions;
export default uiSlice.reducer;

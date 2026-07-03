import { create } from 'zustand'

interface EditModeState {
  isEditMode: boolean
  setEditMode: (val: boolean) => void
  toggleEditMode: () => void
}

export const useEditModeStore = create<EditModeState>((set) => ({
  isEditMode: false,
  setEditMode: (val: boolean) => set({ isEditMode: val }),
  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
}))

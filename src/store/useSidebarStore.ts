import { create } from 'zustand'

interface SidebarState {
  isMobileOpen: boolean
  toggleMobile: () => void
  closeMobile: () => void
  openMobile: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isMobileOpen: false,
  toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  closeMobile: () => set({ isMobileOpen: false }),
  openMobile: () => set({ isMobileOpen: true }),
}))

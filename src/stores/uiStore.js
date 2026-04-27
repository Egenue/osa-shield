import { create } from 'zustand';

export const useUIStore = create((set) => ({
  isMobileMenuOpen: false,
  isReportModalOpen: false,
  activeAnalyzerTab: 'text',
  toggleMobileMenu: () => set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
  setReportModalOpen: (open) => set({ isReportModalOpen: open }),
  setActiveAnalyzerTab: (tab) => set({ activeAnalyzerTab: tab }),
}));

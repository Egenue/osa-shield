import { create } from 'zustand';

interface UIState {
  isMobileMenuOpen: boolean;
  isReportModalOpen: boolean;
  activeAnalyzerTab: 'text' | 'url' | 'password';
  toggleMobileMenu: () => void;
  setReportModalOpen: (open: boolean) => void;
  setActiveAnalyzerTab: (tab: 'text' | 'url' | 'password') => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileMenuOpen: false,
  isReportModalOpen: false,
  activeAnalyzerTab: 'text',
  toggleMobileMenu: () => set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
  setReportModalOpen: (open) => set({ isReportModalOpen: open }),
  setActiveAnalyzerTab: (tab) => set({ activeAnalyzerTab: tab }),
}));

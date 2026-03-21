import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  trustScore: number;
  totalScans: number;
  totalReports: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async (email: string, _password: string) => {
    set({ isLoading: true });
    // Simulated login
    await new Promise(resolve => setTimeout(resolve, 1000));
    set({
      user: {
        id: '1',
        name: 'Agent Smith',
        email,
        role: 'user',
        trustScore: 85,
        totalScans: 42,
        totalReports: 12,
      },
      isAuthenticated: true,
      isLoading: false,
    });
  },
  register: async (name: string, email: string, _password: string) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set({
      user: {
        id: '1',
        name,
        email,
        role: 'user',
        trustScore: 50,
        totalScans: 0,
        totalReports: 0,
      },
      isAuthenticated: true,
      isLoading: false,
    });
  },
  logout: () => set({ user: null, isAuthenticated: false }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));

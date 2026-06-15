import { create } from 'zustand';
import type { AuthUser } from '../types';
import { api } from '../services/api';
import { useVistaAdministradorStore } from './vistaAdministradorStore';

interface AuthState {
  user: AuthUser | null;

  setUser: (user: AuthUser | null) => void;

  initAuth: () => Promise<void>;

  logout: () => Promise<void>;

  broadcastLogin: () => void;

  listenToAuthEvents: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,

  setUser: (user) => set({ user }),

  initAuth: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      set({ user: null });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      useVistaAdministradorStore.getState().salirVistaAdministrador();
      set({ user: null });
      localStorage.setItem('AUTH_LOGOUT_EVENT', Date.now().toString());
    }
  },

  broadcastLogin: () => {
    localStorage.setItem('AUTH_LOGIN_EVENT', Date.now().toString());
  },

  listenToAuthEvents: () => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'AUTH_LOGOUT_EVENT') {
        useVistaAdministradorStore.getState().salirVistaAdministrador();
        set({ user: null });
      }
      if (e.key === 'AUTH_LOGIN_EVENT') {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
        } catch {
          set({ user: null });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => window.removeEventListener('storage', handleStorageChange);
  },
}));
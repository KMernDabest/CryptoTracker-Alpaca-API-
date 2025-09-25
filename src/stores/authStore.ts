import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user: User) =>
        set({ 
          user,
          isAuthenticated: !!user 
        }),

      setToken: (token: string) =>
        set({ 
          token,
          isAuthenticated: !!token 
        }),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Mock API call - replace with actual API integration
          const response = await new Promise<{user: User, token: string}>((resolve, reject) => {
            setTimeout(() => {
              if (email === 'demo@example.com' && password === 'password') {
                resolve({
                  user: {
                    id: '1',
                    username: 'demo',
                    email: 'demo@example.com',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  token: 'mock-jwt-token'
                });
              } else {
                reject(new Error('Invalid credentials'));
              }
            }, 1000);
          });

          set({ 
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Login failed' 
          });
          throw error;
        }
      },

      register: async (email: string, password: string, username: string) => {
        set({ isLoading: true, error: null });
        try {
          // Mock API call - replace with actual API integration
          const response = await new Promise<{user: User, token: string}>((resolve, reject) => {
            setTimeout(() => {
              // Simple validation
              if (!email || !password || !username) {
                reject(new Error('All fields are required'));
                return;
              }
              
              resolve({
                user: {
                  id: Date.now().toString(),
                  username,
                  email,
                  createdAt: new Date(),
                  updatedAt: new Date()
                },
                token: 'mock-jwt-token-' + Date.now()
              });
            }, 1000);
          });

          set({ 
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Registration failed' 
          });
          throw error;
        }
      },

      logout: () =>
        set({ 
          user: null,
          token: null,
          isAuthenticated: false,
          error: null 
        }),

      setLoading: (loading: boolean) =>
        set({ isLoading: loading }),

      setError: (error: string | null) =>
        set({ error }),

      clearError: () =>
        set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
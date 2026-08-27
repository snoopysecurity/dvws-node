import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: any | null;
}

function createAuthStore() {
  const initialToken = browser ? localStorage.getItem('JWTSessionID') : null;
  
  const { subscribe, set, update } = writable<AuthState>({
    token: initialToken,
    isAuthenticated: !!initialToken,
    user: null
  });

  return {
    subscribe,
    setToken: (token: string, user?: any) => {
      if (browser) {
        localStorage.setItem('JWTSessionID', token);
      }
      update(s => ({ ...s, token, isAuthenticated: true, user: user || s.user }));
    },
    setUser: (user: any) => {
      update(s => ({ ...s, user }));
    },
    logout: () => {
      if (browser) {
        localStorage.removeItem('JWTSessionID');
      }
      set({ token: null, isAuthenticated: false, user: null });
    }
  };
}

export const authStore = createAuthStore();

import type { User } from '../types';

export const AUTH_STORAGE_KEYS = {
  accessToken: 'NIVAANA_ACCESS_TOKEN',
  refreshToken: 'NIVAANA_REFRESH_TOKEN',
  userData: 'NIVAANA_USER_DATA',
  pendingLogin: 'NIVAANA_PENDING_LOGIN',
} as const;

export interface PendingLoginState {
  mobileNumber: string;
  isNewUser?: boolean;
  expiresIn?: number;
  canResendAfter?: number;
  redirectPath?: string;
}

export const authStorage = {
  getAccessToken() {
    return localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  },

  getRefreshToken() {
    return localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  },

  getUserData() {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.userData);
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      return null;
    }
  },

  setSession(user: User, accessToken: string, refreshToken: string) {
    localStorage.setItem(AUTH_STORAGE_KEYS.userData, JSON.stringify(user));
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
  },

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
  },

  clearSession() {
    localStorage.removeItem(AUTH_STORAGE_KEYS.userData);
    localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  },

  getPendingLogin() {
    const pendingLogin = sessionStorage.getItem(AUTH_STORAGE_KEYS.pendingLogin);
    if (!pendingLogin) {
      return null;
    }

    try {
      return JSON.parse(pendingLogin) as PendingLoginState;
    } catch {
      return null;
    }
  },

  setPendingLogin(pendingLogin: PendingLoginState) {
    sessionStorage.setItem(
      AUTH_STORAGE_KEYS.pendingLogin,
      JSON.stringify(pendingLogin),
    );
  },

  clearPendingLogin() {
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.pendingLogin);
  },
};

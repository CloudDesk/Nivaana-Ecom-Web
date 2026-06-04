import type { User } from "../types";

const TOKEN_KEY = "nivaana_access_token";
const REFRESH_TOKEN_KEY = "nivaana_refresh_token";
const USER_KEY = "nivaana_user";

export interface AuthSession {
  token: string;
  refreshToken?: string;
  user: User;
}

export const getUserDisplayName = (user?: User | null) => {
  if (!user) return "";

  const firstName = user.firstname?.trim() || "";
  const lastName = user.lastname?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  if (fullName) return fullName;

  const email = user.useremail?.trim();
  if (email) return email;

  return user.usermobilenumber ? user.usermobilenumber.toString() : "Account";
};

export const sessionService = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  getSession(): AuthSession | null {
    const token = this.getToken();
    const user = this.getUser();
    if (!token || !user) return null;

    return {
      token,
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || undefined,
      user,
    };
  },

  saveSession(session: AuthSession) {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));

    if (session.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    }

    window.dispatchEvent(new Event("nivaana-session-change"));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("nivaana-session-change"));
  },
};

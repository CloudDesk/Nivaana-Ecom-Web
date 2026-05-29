import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '../services/authService';
import { authStorage } from '../services/authStorage';
import { setUnauthorizedCallback } from '../services/apiService';
import { AuthContext, type AuthContextType } from './authContextCore';
import type { AppUser, User } from '../types';

const normalizeUser = (apiUser: User): AppUser => {
  const firstName = apiUser.firstname?.trim() || '';
  const lastName = apiUser.lastname?.trim() || '';
  const name = [firstName, lastName].filter(Boolean).join(' ');

  return {
    id: apiUser.id.toString(),
    name,
    phoneNumber: apiUser.usermobilenumber.toString(),
    email: apiUser.useremail?.trim() || undefined,
    gender: apiUser.gender?.trim() || undefined,
    isBusinessUser: apiUser.isbusinessuser,
    gstNumber: apiUser.gstnumber?.trim() || undefined,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);

  const logout = useCallback(() => {
    authStorage.clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    const storedUser = authStorage.getUserData();
    const accessToken = authStorage.getAccessToken();

    if (storedUser && accessToken) {
      setUser(normalizeUser(storedUser));
    } else {
      authStorage.clearSession();
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    setUnauthorizedCallback(logout);

    return () => {
      setUnauthorizedCallback(null);
    };
  }, [logout]);

  const login = useCallback(
    (apiUser: User, accessToken: string, refreshToken: string) => {
      authStorage.setSession(apiUser, accessToken, refreshToken);
      setUser(normalizeUser(apiUser));
    },
    [],
  );

  const requestOtp = useCallback((mobileNumber: string) => {
    const parsedMobile = authService.parseMobileNumber(mobileNumber);

    if (!parsedMobile) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }

    return authService.requestOTP(parsedMobile);
  }, []);

  const verifyOtp = useCallback(
    async (mobileNumber: string, otp: string) => {
      const parsedMobile = authService.parseMobileNumber(mobileNumber);

      if (!parsedMobile) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      if (!/^\d{4}$/.test(otp)) {
        throw new Error('Please enter a valid 4-digit OTP');
      }

      const response = await authService.verifyOTP(parsedMobile, Number(otp));

      if (
        response.success &&
        response.data.user &&
        response.data.token &&
        response.data.refreshToken
      ) {
        login(response.data.user, response.data.token, response.data.refreshToken);
      }

      return response;
    },
    [login],
  );

  const refreshUserData = useCallback(async () => {
    const storedUser = authStorage.getUserData();
    if (storedUser) {
      setUser(normalizeUser(storedUser));
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: Boolean(user),
      isLoading,
      user,
      requestOtp,
      verifyOtp,
      login,
      logout,
      refreshUserData,
    }),
    [isLoading, login, logout, refreshUserData, requestOtp, user, verifyOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

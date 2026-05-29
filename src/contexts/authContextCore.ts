import { createContext, useContext } from 'react';
import type {
  ApiResponse,
  AppUser,
  OTPRequestResponse,
  OTPVerifyResponse,
  User,
} from '../types';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AppUser | null;
  requestOtp: (
    mobileNumber: string,
  ) => Promise<ApiResponse<OTPRequestResponse>>;
  verifyOtp: (
    mobileNumber: string,
    otp: string,
  ) => Promise<ApiResponse<OTPVerifyResponse>>;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};

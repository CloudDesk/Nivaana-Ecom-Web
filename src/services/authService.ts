import { apiService } from './apiService';
import type { 
  ApiResponse, 
  OTPRequest, 
  OTPVerifyRequest, 
  OTPRequestResponse, 
  OTPVerifyResponse 
} from '../types';
import { sessionService } from './sessionService';

/**
 * Authentication Service
 * Handles OTP authentication and account deletion
 */
class AuthService {
  /**
   * Request OTP for mobile authentication
   * @param usermobilenumber - User's mobile number
   * @param verifyOnly - If true, only verify existing user (don't create new user)
   * @returns Promise with OTP request response
   */
  async requestOTP(usermobilenumber: number, verifyOnly: boolean = false): Promise<ApiResponse<OTPRequestResponse>> {
    const payload: OTPRequest = { 
      usermobilenumber,
      verifyOnly
    };
    return apiService.post<OTPRequestResponse>('/mobile-auth/request-otp', payload);
  }

  /**
   * Verify OTP for mobile authentication
   * @param usermobilenumber - User's mobile number
   * @param otp - OTP code received
   * @returns Promise with user data and token
   */
  async verifyOTP(usermobilenumber: number, otp: number, firstname?: string): Promise<ApiResponse<OTPVerifyResponse>> {
    const payload: OTPVerifyRequest = {
      usermobilenumber,
      otp,
      ...(firstname?.trim() ? { firstname: firstname.trim().replace(/\s+/g, " ") } : {}),
    };
    const response = await apiService.post<OTPVerifyResponse>('/mobile-auth/verify-otp', payload);
    const token = response.data.token || response.data.accessToken || response.data.access_token;
    const refreshToken = response.data.refreshToken || response.data.refresh_token;

    if (token && response.data.user) {
      sessionService.saveSession({
        token,
        refreshToken,
        user: response.data.user,
      });
    }

    return response;
  }

  /**
   * Confirm account deletion
   * @param userid - User ID to delete
   * @param useremail - User email (optional, required if user doesn't have email)
   * @returns Promise with deletion confirmation
   */
  async deleteAccount(userid: number, useremail?: string): Promise<ApiResponse<{ message?: string }>> {
    const payload: { userid: number; useremail?: string } = { userid };
    if (useremail) {
      payload.useremail = useremail;
    }
    
    return apiService.post('/mobile-auth/delete-account', payload);
  }
}

// Create and export a singleton instance
export const authService = new AuthService();

// Export the class for custom instances if needed
export default AuthService;


import { apiService } from './apiService';
import type { 
  ApiResponse, 
  OTPRequest, 
  OTPVerifyRequest, 
  OTPRequestResponse, 
  OTPVerifyResponse 
} from '../types';

/**
 * Authentication Service
 * Handles OTP authentication and account deletion
 */
class AuthService {
  /**
   * Request OTP for mobile authentication
   * @param usermobilenumber - User's mobile number
   * @returns Promise with OTP request response
   */
  async requestOTP(usermobilenumber: number): Promise<ApiResponse<OTPRequestResponse>> {
    const payload: OTPRequest = { usermobilenumber };
    return apiService.post<OTPRequestResponse>('/mobile-auth/request-otp', payload);
  }

  /**
   * Verify OTP for mobile authentication
   * @param usermobilenumber - User's mobile number
   * @param otp - OTP code received
   * @returns Promise with user data and token
   */
  async verifyOTP(usermobilenumber: number, otp: number): Promise<ApiResponse<OTPVerifyResponse>> {
    const payload: OTPVerifyRequest = { usermobilenumber, otp };
    return apiService.post<OTPVerifyResponse>('/mobile-auth/verify-otp', payload);
  }

  /**
   * Confirm account deletion
   * @param userid - User ID to delete
   * @param useremail - User email (optional, required if user doesn't have email)
   * @returns Promise with deletion confirmation
   */
  async deleteAccount(userid: number, useremail?: string): Promise<ApiResponse<any>> {
    const url = useremail 
      ? `/confirm/delete-account?userid=${userid}&useremail=${encodeURIComponent(useremail)}`
      : `/confirm/delete-account?userid=${userid}`;
    
    return apiService.delete(url);
  }
}

// Create and export a singleton instance
export const authService = new AuthService();

// Export the class for custom instances if needed
export default AuthService;


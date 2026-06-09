import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { sessionService } from "./sessionService";

// API Response interface
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    filters: unknown[];
    total: number;
    filtered: boolean;
  };
}

// API Error interface
export interface ApiError {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
  validation_errors?: unknown[];
  errors?: unknown[];
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// API Service configuration
class ApiService {
  private baseURL: string;
  private client: AxiosInstance;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5600/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 20000,
    });
  }

  /**
   * Common API method that handles all HTTP requests
   * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
   * @param url - API endpoint URL (relative to base URL)
   * @param payload - Request payload (optional, for POST/PUT/PATCH requests)
   * @returns Promise with API response data
   */
  async request<T = unknown>(
    method: HttpMethod,
    url: string,
    payload?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const token = sessionService.getToken();
      const config: AxiosRequestConfig = {
        method,
        url,
        data: payload,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      };

      const response = await this.client.request<ApiResponse<T>>(config);
      const data = response.data;

      // Check if API response indicates success
      if (!data.success) {
        throw new Error('API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as Partial<ApiError> | undefined;
        const message = responseData?.message || responseData?.error || error.message;
        if (error.response?.status === 401 && sessionService.getToken()) {
          sessionService.clearSession();
        }
        const apiError = new Error(message) as Error & {
          data?: Partial<ApiError>;
          statusCode?: number;
        };
        apiError.data = responseData;
        apiError.statusCode = error.response?.status;
        throw apiError;
      }

      throw error;
    }
  }

  /**
   * GET request
   * @param url - API endpoint URL
   * @returns Promise with API response data
   */
  async get<T = unknown>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url);
  }

  /**
   * POST request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async post<T = unknown>(url: string, payload?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, payload);
  }

  /**
   * PUT request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async put<T = unknown>(url: string, payload?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, payload);
  }

  /**
   * PATCH request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async patch<T = unknown>(url: string, payload?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, payload);
  }

  /**
   * DELETE request
   * @param url - API endpoint URL
   * @returns Promise with API response data
   */
  async delete<T = unknown>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url);
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export the class for custom instances if needed
export default ApiService;

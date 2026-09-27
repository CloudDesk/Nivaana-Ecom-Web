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
  error_code?: string;
  action_required?: string;
  submitted_amount?: number;
  expected_amount?: number;
  pricing?: unknown;
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
   * @param configOverrides - Optional Axios configuration overrides (e.g. timeout)
   * @returns Promise with API response data
   */
  async request<T = unknown>(
    method: HttpMethod,
    url: string,
    payload?: unknown,
    configOverrides?: Partial<AxiosRequestConfig>
  ): Promise<ApiResponse<T>> {
    try {
      const token = sessionService.getToken();
      const requestUrl = url.startsWith('/v2/')
        ? `${this.baseURL.replace(/\/v1\/?$/, '')}${url}`
        : url;
      const config: AxiosRequestConfig = {
        method,
        url: requestUrl,
        data: payload,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        ...configOverrides,
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
        const responseData = error.response?.data as (Partial<ApiError> & { details?: string; retryAfter?: number }) | undefined;
        const message = responseData?.details || responseData?.message || responseData?.error || error.message;

        let retryAfter: number | undefined;
        if (typeof responseData?.retryAfter === 'number' && responseData.retryAfter >= 0) {
          retryAfter = Math.floor(responseData.retryAfter);
        } else {
          const retryHeader = error.response?.headers?.['retry-after'] ?? error.response?.headers?.['Retry-After'];
          if (retryHeader) {
            const parsed = Number(Array.isArray(retryHeader) ? retryHeader[0] : retryHeader);
            if (Number.isFinite(parsed) && parsed >= 0) {
              retryAfter = Math.floor(parsed);
            }
          }
        }
        if (retryAfter === undefined && typeof message === 'string') {
          const match = message.match(/(\d+)\s*(second|seconds|minute|minutes)/i);
          if (match) {
            const val = Number(match[1]);
            retryAfter = match[2].toLowerCase().startsWith('minute') ? val * 60 : val;
          }
        }

        if (error.response?.status === 401 && sessionService.getToken()) {
          sessionService.clearSession();
        }
        const apiError = new Error(message) as Error & {
          data?: Partial<ApiError>;
          statusCode?: number;
          retryAfter?: number;
        };
        apiError.data = responseData;
        apiError.statusCode = error.response?.status;
        apiError.retryAfter = retryAfter;
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
  async get<T = unknown>(url: string, configOverrides?: Partial<AxiosRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, configOverrides);
  }

  /**
   * POST request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async post<T = unknown>(url: string, payload?: unknown, configOverrides?: Partial<AxiosRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, payload, configOverrides);
  }

  /**
   * PUT request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async put<T = unknown>(url: string, payload?: unknown, configOverrides?: Partial<AxiosRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, payload, configOverrides);
  }

  /**
   * PATCH request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async patch<T = unknown>(url: string, payload?: unknown, configOverrides?: Partial<AxiosRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, payload, configOverrides);
  }

  /**
   * DELETE request
   * @param url - API endpoint URL
   * @returns Promise with API response data
   */
  async delete<T = unknown>(url: string, configOverrides?: Partial<AxiosRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, configOverrides);
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export the class for custom instances if needed
export default ApiService;

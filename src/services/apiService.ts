import { authStorage } from './authStorage';

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
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  skipAuth?: boolean;
  timeoutMs?: number;
}

interface ApiErrorPayload {
  message?: string;
  error?: string;
  details?: string;
}

interface RefreshTokenResponse {
  data?: {
    token?: string;
    refreshToken?: string;
  };
}

export class ApiRequestError extends Error {
  statusCode?: number;
  details?: string;

  constructor(message: string, statusCode?: number, details?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

let unauthorizedCallback: (() => void) | null = null;

export const setUnauthorizedCallback = (callback: (() => void) | null) => {
  unauthorizedCallback = callback;
};

// API Service configuration
class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5600/v1';
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
    payload?: unknown,
    options: ApiRequestOptions = {},
    hasRetried = false
  ): Promise<ApiResponse<T>> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      // Construct full URL
      const fullUrl = `${this.baseURL}${url.startsWith('/') ? url : `/${url}`}`;
      const hasJsonBody =
        payload !== undefined && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (hasJsonBody) {
        headers['Content-Type'] = 'application/json';
      }

      const accessToken = authStorage.getAccessToken();
      if (accessToken && !options.skipAuth) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const controller = options.timeoutMs ? new AbortController() : undefined;
      if (controller && options.timeoutMs) {
        timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);
      }

      // Prepare request configuration
      const config: RequestInit = {
        method,
        headers,
        signal: controller?.signal,
      };

      // Add payload for non-GET requests
      if (hasJsonBody) {
        config.body = JSON.stringify(payload);
      }

      // Make the request
      const response = await fetch(fullUrl, config);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({})) as ApiErrorPayload;

        if (
          response.status === 401 &&
          !hasRetried &&
          !options.skipAuth &&
          !url.includes('/auth/refresh')
        ) {
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            return this.request<T>(method, url, payload, options, true);
          }

          authStorage.clearSession();
          unauthorizedCallback?.();
        }

        throw new ApiRequestError(
          errorData.message || 
          errorData.error || 
          `HTTP Error: ${response.status} ${response.statusText}`,
          response.status,
          errorData.details
        );
      }

      // Parse response
      const data: ApiResponse<T> = await response.json();

      // Check if API response indicates success
      if (!data.success) {
        throw new Error('API request failed');
      }

      return data;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      console.error('API Request Error:', error);

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiRequestError('Network error. Please check your connection.');
      }

      if (error instanceof TypeError) {
        throw new ApiRequestError('Network error. Please check your connection.');
      }

      throw error;
    }
  }

  private async refreshTokens(): Promise<boolean> {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json() as RefreshTokenResponse;
      const newAccessToken = result?.data?.token;
      const newRefreshToken = result?.data?.refreshToken;

      if (!newAccessToken || !newRefreshToken) {
        return false;
      }

      authStorage.setTokens(newAccessToken, newRefreshToken);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * GET request
   * @param url - API endpoint URL
   * @returns Promise with API response data
   */
  async get<T = unknown>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * POST request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async post<T = unknown>(url: string, payload?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, payload, options);
  }

  /**
   * PUT request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async put<T = unknown>(url: string, payload?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, payload, options);
  }

  /**
   * PATCH request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async patch<T = unknown>(url: string, payload?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, payload, options);
  }

  /**
   * DELETE request
   * @param url - API endpoint URL
   * @returns Promise with API response data
   */
  async delete<T = unknown>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export the class for custom instances if needed
export default ApiService;

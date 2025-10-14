// API Response interface
export interface ApiResponse<T = any> {
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
    filters: any[];
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
  async request<T = any>(
    method: HttpMethod,
    url: string,
    payload?: any
  ): Promise<ApiResponse<T>> {
    try {
      // Construct full URL
      const fullUrl = `${this.baseURL}${url.startsWith('/') ? url : `/${url}`}`;

      // Prepare request configuration
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      // Add payload for non-GET requests
      if (payload && ['POST', 'PUT', 'PATCH'].includes(method)) {
        config.body = JSON.stringify(payload);
      }

      // Make the request
      const response = await fetch(fullUrl, config);

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.message || 
          errorData.error || 
          `HTTP Error: ${response.status} ${response.statusText}`
        ) as Error & { statusCode?: number; details?: string };
        error.statusCode = response.status;
        error.details = errorData.details;
        throw error;
      }

      // Parse response
      const data: ApiResponse<T> = await response.json();

      // Check if API response indicates success
      if (!data.success) {
        throw new Error('API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      
      // Return a standardized error response
      const errorResponse: ApiResponse<T> = {
        success: false,
        data: null as T
      } as any;

      throw errorResponse;
    }
  }

  /**
   * GET request
   * @param url - API endpoint URL
   * @returns Promise with API response data
   */
  async get<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url);
  }

  /**
   * POST request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async post<T = any>(url: string, payload?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, payload);
  }

  /**
   * PUT request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async put<T = any>(url: string, payload?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, payload);
  }

  /**
   * PATCH request
   * @param url - API endpoint URL
   * @param payload - Request payload
   * @returns Promise with API response data
   */
  async patch<T = any>(url: string, payload?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, payload);
  }

  /**
   * DELETE request
   * @param url - API endpoint URL
   * @returns Promise with API response data
   */
  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url);
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export the class for custom instances if needed
export default ApiService;

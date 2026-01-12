import { apiService } from './apiService';
import type { Product, ApiResponse } from '../types';

export class PlatformProductService {
    /**
     * Get all products
     * @param page - Page number (optional)
     * @param limit - Items per page (optional)
     * @returns Promise with products data
     */
    async getProducts(page?: number, limit?: number): Promise<ApiResponse<Product[]>> {
        let url = '/products/platform/nivapp';
        const params = new URLSearchParams();

        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        return apiService.get<Product[]>(url);
    }





    /**
     * Get featured products (deal of the day)
     * @returns Promise with products data
     */
    async getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
        return apiService.get<Product[]>('/products/platform/nivapp?limit=5');
    }

}

// Create and export a singleton instance
export const platformProductService = new PlatformProductService();

// Export the class for custom instances if needed
export default PlatformProductService;

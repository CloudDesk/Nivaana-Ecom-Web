import { apiService } from './apiService';
import type { Product, ApiResponse } from '../types';

interface ProductFilters {
    category?: string;
    subcategory?: string;
    isdealoftheday?: boolean;
    search?: string;
}

export class PlatformProductService {
    /**
     * Get all products
     * @param page - Page number (optional)
     * @param limit - Items per page (optional)
     * @returns Promise with products data
     */
    async getProducts(page?: number, limit?: number, filters: ProductFilters = {}): Promise<ApiResponse<Product[]>> {
        let url = '/products/platform/nivapp';
        const params = new URLSearchParams();

        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());
        if (filters.category) params.append('category', filters.category);
        if (filters.subcategory) params.append('subcategory', filters.subcategory);
        if (filters.search) params.append('search', filters.search);
        if (filters.isdealoftheday !== undefined) {
            params.append('isdealoftheday', filters.isdealoftheday.toString());
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        return apiService.get<Product[]>(url);
    }

    async getProductForPlatform(productId: number, platform = 'nivapp'): Promise<ApiResponse<Product>> {
        return apiService.get<Product>(`/products/${productId}/platform/${platform}`);
    }





    /**
     * Get featured products (deal of the day)
     * @returns Promise with products data
     */
    async getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
        return apiService.get<Product[]>('/products/platform/nivapp?limit=5');
    }

    async getDealOfTheDayProducts(): Promise<ApiResponse<Product[]>> {
        return apiService.get<Product[]>('/products/platform/nivapp?isdealoftheday=true&limit=10');
    }

}

// Create and export a singleton instance
export const platformProductService = new PlatformProductService();

// Export the class for custom instances if needed
export default PlatformProductService;

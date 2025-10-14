import { apiService } from './apiService';
import type { Product, ApiResponse } from '../types';

export class ProductService {
  /**
   * Get all products
   * @param page - Page number (optional)
   * @param limit - Items per page (optional)
   * @returns Promise with products data
   */
  async getProducts(page?: number, limit?: number): Promise<ApiResponse<Product[]>> {
    let url = '/products';
    const params = new URLSearchParams();
    
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return apiService.get<Product[]>(url);
  }

  /**
   * Get a single product by ID
   * @param id - Product ID
   * @returns Promise with product data
   */
  async getProductById(id: number): Promise<ApiResponse<Product>> {
    return apiService.get<Product>(`/products/${id}`);
  }

  /**
   * Get products by category
   * @param category - Product category
   * @param page - Page number (optional)
   * @param limit - Items per page (optional)
   * @returns Promise with products data
   */
  async getProductsByCategory(
    category: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<Product[]>> {
    let url = `/products/category/${category}`;
    const params = new URLSearchParams();
    
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return apiService.get<Product[]>(url);
  }

  /**
   * Search products
   * @param query - Search query
   * @param page - Page number (optional)
   * @param limit - Items per page (optional)
   * @returns Promise with products data
   */
  async searchProducts(
    query: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<Product[]>> {
    let url = `/products/search`;
    const params = new URLSearchParams();
    
    params.append('q', query);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    url += `?${params.toString()}`;
    
    return apiService.get<Product[]>(url);
  }

  /**
   * Get deal of the day products
   * @returns Promise with products data
   */
  async getDealOfTheDayProducts(): Promise<ApiResponse<Product[]>> {
    return apiService.get<Product[]>('/products?isdealoftheday=true');
  }


 

  /**
   * Get featured products (deal of the day)
   * @returns Promise with products data
   */
  async getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
    return apiService.get<Product[]>('/products?limit=3');
  }

  /**
   * Create a new product
   * @param productData - Product data
   * @returns Promise with created product data
   */
  async createProduct(productData: Omit<Product, 'id' | 'createddate' | 'modifieddate'>): Promise<ApiResponse<Product>> {
    return apiService.post<Product>('/products', productData);
  }

  /**
   * Update an existing product
   * @param id - Product ID
   * @param productData - Updated product data
   * @returns Promise with updated product data
   */
  async updateProduct(id: number, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    return apiService.put<Product>(`/products/${id}`, productData);
  }

  /**
   * Delete a product
   * @param id - Product ID
   * @returns Promise with deletion result
   */
  async deleteProduct(id: number): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/products/${id}`);
  }
}

// Create and export a singleton instance
export const productService = new ProductService();

// Export the class for custom instances if needed
export default ProductService;

import { apiService } from './apiService';
import type { Product, ApiResponse, ProductCategoryTree } from '../types';

interface ProductPicklistItem {
    label: string | null;
    value: string | null;
    fieldname: string | null;
    controlledvalue: string | null;
    parent: string | null;
    sortorder: number | null;
}

const taxonomyOrder = (
    left: { label: string; sortOrder?: number | null },
    right: { label: string; sortOrder?: number | null }
) => {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.label.localeCompare(right.label);
};

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

    async getProduct(productId: number): Promise<ApiResponse<Product>> {
        return apiService.get<Product>(`/products/${productId}/platform/nivapp`);
    }

    async getCategoryTree(): Promise<ApiResponse<ProductCategoryTree>> {
        const [countsResponse, picklistsResponse] = await Promise.all([
            apiService.get<ProductCategoryTree>('/products/platform/nivapp/counts'),
            apiService.get<ProductPicklistItem[]>('/picklists?object=product&isactive=true&limit=1000'),
        ]);

        const countCategories = new Map(
            (countsResponse.data.categories ?? []).map((category) => [category.id, category])
        );
        const categories = new Map<string, ProductCategoryTree['categories'][number]>();

        for (const item of picklistsResponse.data) {
            if (item.fieldname !== 'category' || !item.value || !item.label) continue;
            const counted = countCategories.get(item.value);
            categories.set(item.value, {
                id: item.value,
                label: item.label,
                count: counted?.count ?? 0,
                sortOrder: item.sortorder,
                subcategories: [],
            });
        }

        for (const item of picklistsResponse.data) {
            if (item.fieldname !== 'subcategory' || !item.value || !item.label) continue;
            const parentCategory = item.controlledvalue || item.parent;
            const category = parentCategory ? categories.get(parentCategory) : undefined;
            if (!category) continue;

            const countedCategory = countCategories.get(category.id);
            const counted = countedCategory?.subcategories.find((subcategory) => subcategory.id === item.value);
            category.subcategories.push({
                id: item.value,
                label: item.label,
                count: counted?.count ?? 0,
                sortOrder: item.sortorder,
                subsubcategories: [],
            });
        }

        for (const item of picklistsResponse.data) {
            if (item.fieldname !== 'subsubcategory' || !item.value || !item.label) continue;
            const parentSubcategory = item.controlledvalue || item.parent;
            if (!parentSubcategory) continue;

            for (const category of categories.values()) {
                const subcategory = category.subcategories.find((candidate) => candidate.id === parentSubcategory);
                if (!subcategory) continue;
                const counted = countCategories
                    .get(category.id)
                    ?.subcategories.find((candidate) => candidate.id === subcategory.id)
                    ?.subsubcategories.find((candidate) => candidate.id === item.value);
                subcategory.subsubcategories.push({
                    id: item.value,
                    label: item.label,
                    count: counted?.count ?? 0,
                    sortOrder: item.sortorder,
                });
                break;
            }
        }

        const sortedCategories = Array.from(categories.values())
            .sort(taxonomyOrder)
            .map((category) => ({
                ...category,
                subcategories: category.subcategories
                    .sort(taxonomyOrder)
                    .map((subcategory) => ({
                        ...subcategory,
                        subsubcategories: subcategory.subsubcategories.sort(taxonomyOrder),
                    })),
            }));

        return {
            ...countsResponse,
            data: {
                platform: countsResponse.data.platform,
                totalProducts: countsResponse.data.totalProducts,
                categories: sortedCategories,
            },
        };
    }

    /**
     * Get featured products (deal of the day)
     * @returns Promise with products data
     */
    async getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
        return apiService.get<Product[]>('/products/platform/nivapp?limit=12');
    }

}

// Create and export a singleton instance
export const platformProductService = new PlatformProductService();

// Export the class for custom instances if needed
export default PlatformProductService;

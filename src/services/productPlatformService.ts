import { apiService } from './apiService';
import type { Product, ApiResponse, ProductCategoryTree } from '../types';

interface ProductPicklistItem {
    label: string | null;
    value: string | null;
    fieldname: string | null;
    controlledvalue: string | null;
    parent: string | null;
    sortorder: number | null;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
}

type ProductTaxonomyField = 'category' | 'subcategory' | 'subsubcategory';

type HomeCatalogImages = Pick<Product, 'large' | 'medium' | 'small'>;

/** Storefront Home sections ranked by the backend (GET /products/platform/nivapp/home). */
export interface HomeCatalog {
    bestSellers: Product[];
    newArrivals: Product[];
    bestOfNivaana: Product[];
    flavours: Array<HomeCatalogImages & { value: string }>;
    categories: Array<HomeCatalogImages & { category: string | null; subcategory: string | null }>;
}

export interface PlatformProductFilters {
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price' | 'createddate' | 'averagerating' | 'name' | 'bestselling';
    sortOrder?: 'asc' | 'desc';
    /** storefront = backend applies the Ecom listing rules for the filters below. */
    filterMode?: 'storefront';
    category?: string;
    excludeCategory?: string;
    subcategory?: string;
    subcategoryMatch?: 'taxonomy' | 'loose';
    subsubcategory?: string;
    subsubcategoryMatch?: 'taxonomy' | 'loose';
    collection?: string;
    search?: string;
}

const getActiveProductPicklists = async (
    fieldname: ProductTaxonomyField
): Promise<ProductPicklistItem[]> => {
    const items: ProductPicklistItem[] = [];
    let page = 1;

    while (true) {
        const params = new URLSearchParams({
            object: 'product',
            fieldname,
            isactive: 'true',
            page: page.toString(),
            limit: '100',
        });
        const response = await apiService.get<ProductPicklistItem[]>(
            `/picklists?${params.toString()}`
        );

        items.push(...response.data);

        if (!response.pagination?.hasNext) break;
        page += 1;
    }

    return items;
};

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
    async getProducts(
        page?: number,
        limit?: number,
        filters: PlatformProductFilters = {}
    ): Promise<ApiResponse<Product[]>> {
        let url = '/products/platform/nivapp';
        const params = new URLSearchParams();

        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());
        if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
        if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
        if (filters.filterMode) params.append('filterMode', filters.filterMode);
        if (filters.category) params.append('category', filters.category);
        if (filters.excludeCategory) params.append('excludeCategory', filters.excludeCategory);
        if (filters.subcategory) params.append('subcategory', filters.subcategory);
        if (filters.subcategoryMatch) params.append('subcategoryMatch', filters.subcategoryMatch);
        if (filters.subsubcategory) params.append('subsubcategory', filters.subsubcategory);
        if (filters.subsubcategoryMatch) params.append('subsubcategoryMatch', filters.subsubcategoryMatch);
        if (filters.collection) params.append('collection', filters.collection);
        if (filters.search) params.append('search', filters.search);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        return apiService.get<Product[]>(url);
    }

    /**
     * Home page sections in a single read-only request.
     * Product items have the same shape as getProducts().
     */
    async getHomeCatalog(): Promise<ApiResponse<HomeCatalog>> {
        return apiService.get<HomeCatalog>('/products/platform/nivapp/home');
    }

    async getProduct(productId: number): Promise<ApiResponse<Product>> {
        return apiService.get<Product>(`/products/${productId}/platform/nivapp`);
    }

    async getCategoryTree(): Promise<ApiResponse<ProductCategoryTree>> {
        const [
            countsResponse,
            categoryItems,
            subcategoryItems,
            subsubcategoryItems,
        ] = await Promise.all([
            apiService.get<ProductCategoryTree>('/products/platform/nivapp/counts'),
            getActiveProductPicklists('category'),
            getActiveProductPicklists('subcategory'),
            getActiveProductPicklists('subsubcategory'),
        ]);
        const picklistItems = [...categoryItems, ...subcategoryItems, ...subsubcategoryItems];

        const countCategories = new Map(
            (countsResponse.data.categories ?? []).map((category) => [category.id, category])
        );
        const categories = new Map<string, ProductCategoryTree['categories'][number]>();

        for (const item of picklistItems) {
            if (item.fieldname !== 'category' || !item.value || !item.label) continue;
            const counted = countCategories.get(item.value);
            categories.set(item.value, {
                id: item.value,
                label: item.label,
                count: counted?.count ?? 0,
                imageUrl: counted?.imageUrl ?? item.imageUrl ?? null,
                thumbnailUrl: counted?.thumbnailUrl ?? item.thumbnailUrl ?? null,
                sortOrder: item.sortorder,
                subcategories: [],
            });
        }

        for (const item of picklistItems) {
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
                imageUrl: counted?.imageUrl ?? item.imageUrl ?? null,
                thumbnailUrl: counted?.thumbnailUrl ?? item.thumbnailUrl ?? null,
                sortOrder: item.sortorder,
                subsubcategories: [],
            });
        }

        for (const item of picklistItems) {
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

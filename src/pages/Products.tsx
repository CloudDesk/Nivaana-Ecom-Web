import React, { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import CategoryNavigationRail from "../components/CategoryNavigationRail";
import {
  buildChildCategoryItems,
  buildNestedCategoryItems,
  buildTopCategoryItems,
  isKnownCategoryChildValue,
  resolveActiveCategory,
  resolveActiveChildKey,
  type CategoryNavChildItem,
  type CategoryNavTopItem,
} from "../components/categoryNavigationData";
import CategoryShowcaseBanner from "../components/CategoryShowcaseBanner";
import ProductCard from "../components/ProductCard";
import ProductFilters, {
  type ProductPriceRange,
  type ProductSort,
} from "../components/ProductFilters";
import RecentProductRail from "../components/RecentProductRail";
import { readRecentlyViewedProductIds } from "../lib/recentlyViewed";
import type { Product } from "../types";
import { platformProductService } from "../services/productPlatformService";

const PRODUCTS_PAGE_SIZE = 40;

const PRICE_RANGES: Record<ProductPriceRange, { minPrice?: number; maxPrice?: number }> = {
  "under-100": { maxPrice: 99.99 },
  "100-250": { minPrice: 100, maxPrice: 249.99 },
  "250-500": { minPrice: 250, maxPrice: 499.99 },
  "500-1000": { minPrice: 500, maxPrice: 1000 },
  "above-1000": { minPrice: 1000.01 },
};

const SORT_OPTIONS: Record<
  ProductSort,
  { sortBy: "price" | "createddate" | "averagerating" | "name" | "bestselling"; sortOrder: "asc" | "desc" }
> = {
  newest: { sortBy: "createddate", sortOrder: "desc" },
  bestselling: { sortBy: "bestselling", sortOrder: "desc" },
  "price-asc": { sortBy: "price", sortOrder: "asc" },
  "price-desc": { sortBy: "price", sortOrder: "desc" },
  "rating-desc": { sortBy: "averagerating", sortOrder: "desc" },
  "name-asc": { sortBy: "name", sortOrder: "asc" },
  "name-desc": { sortBy: "name", sortOrder: "desc" },
};

const isProductSort = (value: string | null): value is ProductSort =>
  Boolean(value && value in SORT_OPTIONS);

const isProductPriceRange = (value: string | null): value is ProductPriceRange =>
  Boolean(value && value in PRICE_RANGES);

const formatFilterLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

interface ProductsProps {
  defaultCollection?: string;
}

const Products: React.FC<ProductsProps> = ({ defaultCollection }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);
  // Scroll marker kept in state so the observer re-attaches whenever the marker mounts or remounts.
  const [loadMoreNode, setLoadMoreNode] = useState<HTMLDivElement | null>(null);

  const category = searchParams.get("category");
  const excludeCategory = searchParams.get("excludeCategory");
  const subcategory = searchParams.get("subcategory");
  const subsubcategory = searchParams.get("subsubcategory");
  const collection = searchParams.get("collection") || defaultCollection;
  const offerId = searchParams.get("offerId");
  const routeTitle = searchParams.get("title");
  const search = searchParams.get("search");
  const sortParam = searchParams.get("sort");
  const priceParam = searchParams.get("price");
  // Best Sellers page defaults to the backend best-selling rank (same as Home Best Sellers).
  const defaultSort: ProductSort = collection === "best-sellers" ? "bestselling" : "newest";
  const sort: ProductSort = isProductSort(sortParam) ? sortParam : defaultSort;
  const priceRange: ProductPriceRange | "" = isProductPriceRange(priceParam) ? priceParam : "";
  const categoryTreeQuery = useQuery({
    queryKey: ["product-category-tree", "sortorder-v3"],
    queryFn: () => platformProductService.getCategoryTree(),
    staleTime: 1000 * 60,
  });
  const categoryTree = categoryTreeQuery.data?.data;

  // Subcategory values that are known children in the category tree match taxonomy
  // fields only; other values (for example flavour links) also match fragrance type.
  const waitForCategoryTree = Boolean(subcategory || subsubcategory) && categoryTreeQuery.isPending;

  // Filtering, sorting and paging happen on the backend (filterMode=storefront),
  // so only the pages the shopper scrolls to are downloaded.
  const apiFilters = useMemo(() => {
    const childMatch = (value: string | null): "taxonomy" | "loose" | undefined =>
      value ? (isKnownCategoryChildValue(categoryTree, value, category) ? "taxonomy" : "loose") : undefined;

    return {
      ...SORT_OPTIONS[sort],
      ...(priceRange ? PRICE_RANGES[priceRange] : {}),
      filterMode: "storefront" as const,
      category: category || undefined,
      excludeCategory: excludeCategory || undefined,
      subcategory: subcategory || undefined,
      subcategoryMatch: childMatch(subcategory),
      subsubcategory: subsubcategory || undefined,
      subsubcategoryMatch: childMatch(subsubcategory),
      collection: collection || undefined,
      search: search || undefined,
    };
  }, [categoryTree, category, collection, excludeCategory, priceRange, search, sort, subcategory, subsubcategory]);
  const currentCategoryRoute = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams);
    const queryString = nextParams.toString();
    return `/products${queryString ? `?${queryString}` : ""}#category-top`;
  }, [searchParams]);

  const productsQuery = useInfiniteQuery({
    queryKey: ["platform-products-list", apiFilters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      platformProductService.getProducts(pageParam, PRODUCTS_PAGE_SIZE, apiFilters),
    enabled: !waitForCategoryTree,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNext && lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 1000 * 60,
  });

  const products = useMemo(
    () => (productsQuery.data?.pages ?? []).flatMap((page) => page.data ?? []),
    [productsQuery.data?.pages]
  );

  // Products already arrive filtered and sorted by the backend.
  const filteredProducts = products;
  const totalProducts = productsQuery.data?.pages[0]?.pagination?.total;

  const resolvedCategory = useMemo(
    () =>
      resolveActiveCategory({
        tree: categoryTree,
        products,
        category,
        subcategory,
        subsubcategory,
      }),
    [category, categoryTree, products, subcategory, subsubcategory]
  );

  const topCategoryItems = useMemo(() => buildTopCategoryItems(categoryTree), [categoryTree]);

  const childCategoryItems = useMemo(
    () => buildChildCategoryItems(categoryTree, resolvedCategory),
    [categoryTree, resolvedCategory]
  );

  const nestedCategoryItems = useMemo(
    () => buildNestedCategoryItems(products, categoryTree, resolvedCategory, subcategory),
    [categoryTree, products, resolvedCategory, subcategory]
  );

  const activeChildKey = useMemo(
    () =>
      resolveActiveChildKey({
        childItems: childCategoryItems,
        subcategory,
        subsubcategory,
      }),
    [childCategoryItems, subcategory, subsubcategory]
  );

  const activeNestedChildKey = useMemo(
    () =>
      resolveActiveChildKey({
        childItems: nestedCategoryItems,
        subcategory,
        subsubcategory,
      }),
    [nestedCategoryItems, subcategory, subsubcategory]
  );

  const pageTitle = useMemo(() => {
    if (routeTitle) return routeTitle;
    if (subsubcategory) return formatFilterLabel(subsubcategory);
    if (subcategory) return formatFilterLabel(subcategory);
    if (category) return formatFilterLabel(category);
    if (collection) return formatFilterLabel(collection);
    if (offerId) return "Special Deals";
    if (search) return search;
    return "Our Products";
  }, [category, collection, offerId, routeTitle, search, subcategory, subsubcategory]);

  const listingBannerProducts = useMemo(() => {
    const source = filteredProducts.length > 0 ? filteredProducts : products;
    return source.slice(0, 4);
  }, [filteredProducts, products]);

  const listingBannerEyebrow = useMemo(() => {
    if (subsubcategory) return `${formatFilterLabel(subsubcategory)} spotlight`;
    if (subcategory) return `${formatFilterLabel(subcategory)} spotlight`;
    if (resolvedCategory) return `${formatFilterLabel(resolvedCategory)} spotlight`;
    if (collection) return `${formatFilterLabel(collection)} picks`;
    if (search) return "Search spotlight";
    return "Nivaana spotlight";
  }, [collection, resolvedCategory, search, subcategory, subsubcategory]);

  const listingBannerDescription = useMemo(() => {
    if (subsubcategory) {
      return `Explore standout picks from ${formatFilterLabel(subsubcategory)}, selected to keep the same mood, fragrance profile, and everyday ritual feel across this shelf.`;
    }
    if (subcategory) {
      return `Browse the ${formatFilterLabel(subcategory)} collection with product formats and scent directions that stay closely aligned across the category.`;
    }
    if (resolvedCategory) {
      return `A curated look at ${formatFilterLabel(resolvedCategory)}, bringing together the strongest products in this category so comparison feels quick and natural.`;
    }
    if (collection) {
      return `A focused view into ${formatFilterLabel(collection)}, assembled to make browsing and comparing easier.`;
    }
    if (offerId) {
      return "Products connected to the selected deal, gathered here so you can browse and compare quickly.";
    }
    if (search) {
      return `Products related to ${search}, gathered into one visual shelf so you can scan the strongest matches quickly.`;
    }
    return "A broad Nivaana shelf with category-led picks, everyday staples, and giftable products in one place.";
  }, [collection, offerId, resolvedCategory, search, subcategory, subsubcategory]);

  const recentlyViewedProducts = useMemo(() => {
    if (!recentlyViewedIds.length) return [];

    const productsById = new Map(products.map((item) => [item.id, item]));

    return recentlyViewedIds
      .map((itemId) => productsById.get(itemId))
      .filter((item): item is Product => Boolean(item))
      .slice(0, 10);
  }, [products, recentlyViewedIds]);

  const selectTopCategory = (item: CategoryNavTopItem) => {
    const nextParams = new URLSearchParams();
    nextParams.set("category", item.value);
    if (priceRange) nextParams.set("price", priceRange);
    if (sortParam && isProductSort(sortParam)) nextParams.set("sort", sortParam);
    setSearchParams(nextParams);
  };

  const selectChildCategory = (item: CategoryNavChildItem) => {
    const nextParams = new URLSearchParams(item.queryParams);
    if (priceRange) nextParams.set("price", priceRange);
    if (sortParam && isProductSort(sortParam)) nextParams.set("sort", sortParam);
    setSearchParams(nextParams);
  };

  const updateProductFilter = (key: "price" | "sort", value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set(key, value);
    else nextParams.delete(key);
    setSearchParams(nextParams);
  };

  const clearProductFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("price");
    nextParams.delete("sort");
    setSearchParams(nextParams);
  };

  useEffect(() => {
    setRecentlyViewedIds(readRecentlyViewedProductIds());
  }, [category, collection, search, subcategory, subsubcategory]);

  useEffect(() => {
    const node = loadMoreNode;
    if (!node || !productsQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || productsQuery.isFetchingNextPage) return;
        productsQuery.fetchNextPage();
      },
      {
        rootMargin: "400px 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMoreNode, productsQuery.fetchNextPage, productsQuery.hasNextPage, productsQuery.isFetchingNextPage]);


  return (
    <div className="min-h-screen bg-secondary-extra-light-gray">
      <div id="category-top" className="scroll-mt-24 lg:scroll-mt-28">
        <CategoryNavigationRail
          topItems={topCategoryItems}
          childItems={childCategoryItems}
          nestedChildItems={nestedCategoryItems}
          activeTopKey={resolvedCategory}
          activeChildKey={activeChildKey}
          activeNestedChildKey={activeNestedChildKey}
          onTopSelect={selectTopCategory}
          onChildSelect={selectChildCategory}
          onNestedChildSelect={selectChildCategory}
        />
      </div>

      <div id="category-results" className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Results Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-dark-gray sm:text-3xl">{pageTitle}</h1>
            <p className="mt-2 text-secondary-medium-gray">
              Showing {totalProducts ?? filteredProducts.length} products
              {search ? ` matching "${search}"` : ""}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
            <ProductFilters
              sort={sort}
              priceRange={priceRange}
              onSortChange={(value) => updateProductFilter("sort", value)}
              onPriceRangeChange={(value) => updateProductFilter("price", value)}
              onClear={clearProductFilters}
            />
          </div>
        </div>
        {/* Products Grid */}
        {productsQuery.isPending ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-gold mx-auto mb-4"></div>
            <p className="text-secondary-medium-gray">Loading products...</p>
          </div>
        ) : productsQuery.isError ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-secondary-dark-gray mb-2">
              Error Loading Products
            </h3>
            <p className="text-secondary-medium-gray mb-4">{productsQuery.error instanceof Error ? productsQuery.error.message : "Failed to fetch products"}</p>
            <button
              onClick={() => productsQuery.refetch()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {recentlyViewedProducts.length > 0 && (
              <>
                <CategoryShowcaseBanner
                  eyebrow={listingBannerEyebrow}
                  title={pageTitle}
                  description={listingBannerDescription}
                  ctaLabel={(category || subcategory || subsubcategory || collection || search) ? "Browse all products" : "Explore collection"}
                  ctaTo={currentCategoryRoute}
                  products={listingBannerProducts}
                />
                <RecentProductRail
                  eyebrow="Recently viewed"
                  title="Continue browsing"
                  products={recentlyViewedProducts}
                />
              </>
            )}

            <div ref={setLoadMoreNode} className="h-4 w-full" />

            {productsQuery.isFetchingNextPage && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-primary-gold" />
                <p className="text-secondary-medium-gray">Loading more products...</p>
              </div>
            )}

          </>
        ) : (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-secondary-light-gray mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-secondary-dark-gray mb-2">
              No products available
            </h3>
            <p className="text-secondary-medium-gray mb-4">
              Check back later for new products
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;

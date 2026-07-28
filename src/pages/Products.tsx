import React, { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import CategoryNavigationRail from "../components/CategoryNavigationRail";
import {
  buildChildCategoryItems,
  buildNestedCategoryItems,
  buildTopCategoryItems,
  isKnownCategoryChildValue,
  matchesProductCategory,
  matchesProductChildCategory,
  resolveActiveCategory,
  resolveActiveChildKey,
  type CategoryNavChildItem,
  type CategoryNavTopItem,
} from "../components/categoryNavigationData";
import CategoryShowcaseBanner from "../components/CategoryShowcaseBanner";
import ProductCard from "../components/ProductCard";
import RecentProductRail from "../components/RecentProductRail";
import { readRecentlyViewedProductIds } from "../lib/recentlyViewed";
import type { Product } from "../types";
import { platformProductService } from "../services/productPlatformService";

const PRODUCTS_PAGE_SIZE = 40;

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

const normalizeFilterKey = (value?: string | null) =>
  normalize(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");

const filterKeyVariants = (value?: string | null) => {
  const key = normalizeFilterKey(value);
  if (!key) return new Set<string>();

  return new Set([key, key.replace(/(^|_)and(_|$)/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_")]);
};

const filterValueMatches = (productValue: string | null | undefined, filterValue: string | null | undefined) =>
  Boolean(filterValue) &&
  [...filterKeyVariants(productValue)].some((productKey) => filterKeyVariants(filterValue).has(productKey));

const listValueMatches = (productValue: string | null | undefined, filterValue: string | null | undefined) =>
  Boolean(filterValue) &&
  normalize(productValue)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .some((value) => filterValueMatches(value, filterValue));

const formatFilterLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

interface ProductsProps {
  defaultCollection?: string;
}

const Products: React.FC<ProductsProps> = ({ defaultCollection }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const subsubcategory = searchParams.get("subsubcategory");
  const collection = searchParams.get("collection") || defaultCollection;
  const offerId = searchParams.get("offerId");
  const routeTitle = searchParams.get("title");
  const search = searchParams.get("search");
  const hasActiveFilter = Boolean(category || subcategory || subsubcategory || collection || offerId || search);
  const currentCategoryRoute = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams);
    const queryString = nextParams.toString();
    return `/products${queryString ? `?${queryString}` : ""}#category-top`;
  }, [searchParams]);

  const productsQuery = useInfiniteQuery({
    queryKey: ["platform-products-list"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => platformProductService.getProducts(pageParam, PRODUCTS_PAGE_SIZE),
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNext && lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 1000 * 60,
  });

  const categoryTreeQuery = useQuery({
    queryKey: ["product-category-tree", "sortorder-v3"],
    queryFn: () => platformProductService.getCategoryTree(),
    staleTime: 1000 * 60,
  });
  const categoryTree = categoryTreeQuery.data?.data;

  const products = useMemo(
    () => (productsQuery.data?.pages ?? []).flatMap((page) => page.data ?? []),
    [productsQuery.data?.pages]
  );

  const filteredProducts = useMemo(() => {
    let result = products;

    if (category) {
      result = result.filter((product) => matchesProductCategory(product, category));
    }

    if (subcategory) {
      result = result.filter((product) =>
        isKnownCategoryChildValue(categoryTree, subcategory, category)
          ? matchesProductChildCategory(product, subcategory, category)
          : filterValueMatches(product.subcategory, subcategory) ||
            filterValueMatches(product.subsubcategory, subcategory) ||
            filterValueMatches(product.fragnancetype, subcategory) ||
            listValueMatches(product.fragnancetype, subcategory)
      );
    }

    if (subsubcategory) {
      result = result.filter(
        (product) =>
          (isKnownCategoryChildValue(categoryTree, subsubcategory, category)
            ? matchesProductChildCategory(product, subsubcategory, category)
            : filterValueMatches(product.subsubcategory, subsubcategory) ||
              filterValueMatches(product.fragnancetype, subsubcategory) ||
              listValueMatches(product.fragnancetype, subsubcategory))
      );
    }

    if (collection === "deals") {
      result = result.filter((product) => product.isdealoftheday || product.discount > 0);
    }

    if (collection === "best-sellers") {
      result = [...result].sort((a, b) => (b.soldquantity ?? 0) - (a.soldquantity ?? 0));
    }

    if (collection === "new-arrivals") {
      result = [...result].sort((a, b) => b.createddate - a.createddate);
    }

    if (collection === "gift-sets") {
      result = result.filter((product) => product.pack?.includes("pack") || product.name.toLowerCase().includes("combo"));
    }

    if (search) {
      const query = normalize(search);
      result = result.filter((product) =>
        [
          product.name,
          product.shortdescription,
          product.fulldescription,
          product.category,
          product.subcategory,
          product.subsubcategory,
          product.fragnancetype,
          product.brand,
          product.pack,
          product.puc,
        ]
          .filter(Boolean)
          .some((value) => normalize(value).includes(query))
      );
    }

    return result;
  }, [category, categoryTree, collection, products, search, subcategory, subsubcategory]);

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
    () => buildChildCategoryItems(products, categoryTree, resolvedCategory),
    [categoryTree, products, resolvedCategory]
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

  const showAllProducts = () => {
    setSearchParams({});
  };

  const selectTopCategory = (item: CategoryNavTopItem) => {
    setSearchParams({ category: item.value });
  };

  const selectChildCategory = (item: CategoryNavChildItem) => {
    setSearchParams(item.queryParams);
  };

  useEffect(() => {
    setRecentlyViewedIds(readRecentlyViewedProductIds());
  }, [category, collection, search, subcategory, subsubcategory]);

  useEffect(() => {
    const node = loadMoreRef.current;
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
  }, [productsQuery.fetchNextPage, productsQuery.hasNextPage, productsQuery.isFetchingNextPage]);

  useEffect(() => {
    if (
      !hasActiveFilter ||
      productsQuery.isLoading ||
      productsQuery.isFetchingNextPage ||
      !productsQuery.hasNextPage
    ) {
      return;
    }

    productsQuery.fetchNextPage();
  }, [
    hasActiveFilter,
    productsQuery.fetchNextPage,
    productsQuery.hasNextPage,
    productsQuery.isFetchingNextPage,
    productsQuery.isLoading,
  ]);

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
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-secondary-dark-gray sm:text-3xl">{pageTitle}</h1>
            <p className="mt-2 text-secondary-medium-gray">
              Showing {filteredProducts.length}{productsQuery.hasNextPage ? "+" : ""} products
              {search ? ` matching "${search}"` : ""}
            </p>
          </div>
          {(category || subcategory || subsubcategory || collection || search) && (
            <button
              type="button"
              onClick={showAllProducts}
              className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:border-primary-gold"
            >
              All products
            </button>
          )}
        </div>
        {/* Products Grid */}
        {productsQuery.isLoading ? (
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

            <div ref={loadMoreRef} className="h-4 w-full" />

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

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import type { Category, Product } from "../types";
import { picklistService } from "../services/picklistService";
import { platformProductService } from "../services/productPlatformService";

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

type SortOption =
  | "relevance"
  | "price_low_high"
  | "price_high_low"
  | "rating_high_low"
  | "newest"
  | "name_az";

const sortOptions: Array<{ label: string; value: Exclude<SortOption, "relevance"> }> = [
  { label: "Price: Low to High", value: "price_low_high" },
  { label: "Price: High to Low", value: "price_high_low" },
  { label: "Rating: High to Low", value: "rating_high_low" },
  { label: "Newest", value: "newest" },
  { label: "Name: A to Z", value: "name_az" },
];

const Products: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOpen, setSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const categoryFilter = searchParams.get("category") || undefined;
  const subcategoryFilter = searchParams.get("subcategory") || undefined;
  const searchTerm = searchParams.get("q")?.trim() || "";
  const dealsOnly = searchParams.get("deals") === "true";
  const activeCategoryName =
    categories.find((category) => category.id === categoryFilter)?.name ||
    (categoryFilter ? toTitleCase(categoryFilter) : undefined);
  const activeSubcategoryName =
    subcategories.find((subcategory) => subcategory.id === subcategoryFilter)
      ?.name || (subcategoryFilter ? toTitleCase(subcategoryFilter) : undefined);
  const pageTitle = dealsOnly
    ? "Deal Products"
    : activeSubcategoryName
      ? activeSubcategoryName
      : activeCategoryName
        ? activeCategoryName
      : "Our Products";
  const pageDescription = dealsOnly
    ? "Explore today's highlighted offers from Nivaana"
    : activeSubcategoryName && activeCategoryName
      ? `Explore ${activeSubcategoryName} products from ${activeCategoryName}`
      : activeCategoryName
        ? `Explore products from ${activeCategoryName}`
      : "Explore our premium incense sticks, essential oils, and spiritual home decor";
  const hasActiveFilters = sortOption !== "relevance";

  const getEffectivePrice = (product: Product) =>
    product.discount > 0 ? product.price - product.discount : product.price;

  const filteredProducts = useMemo(() => {
    return [...products].sort((firstProduct, secondProduct) => {
      switch (sortOption) {
        case "price_low_high":
          return getEffectivePrice(firstProduct) - getEffectivePrice(secondProduct);
        case "price_high_low":
          return getEffectivePrice(secondProduct) - getEffectivePrice(firstProduct);
        case "rating_high_low":
          return (
            (secondProduct.averagerating || 0) -
            (firstProduct.averagerating || 0)
          );
        case "newest":
          return secondProduct.createddate - firstProduct.createddate;
        case "name_az":
          return firstProduct.name.localeCompare(secondProduct.name);
        default:
          return 0;
      }
    });
  }, [products, sortOption]);

  const clearFilters = () => {
    setSortOption("relevance");
    setSortOpen(false);
  };

  const handleSortSelect = (nextSortOption: SortOption) => {
    setSortOption(nextSortOption);
    setSortOpen(false);
  };

  useEffect(() => {
    if (!sortOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target as Node)
      ) {
        setSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [sortOpen]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryItems = await picklistService.getCategories();
        setCategories(categoryItems);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSubcategories = async () => {
      if (!categoryFilter || dealsOnly) {
        setSubcategories([]);
        return;
      }

      try {
        const subcategoryItems =
          await picklistService.getSubcategories(categoryFilter);

        if (!cancelled) {
          setSubcategories(subcategoryItems);
        }
      } catch (err) {
        console.error("Error fetching subcategories:", err);
        if (!cancelled) {
          setSubcategories([]);
        }
      }
    };

    fetchSubcategories();

    return () => {
      cancelled = true;
    };
  }, [categoryFilter, dealsOnly]);

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await platformProductService.getProducts(undefined, undefined, {
          category: categoryFilter,
          subcategory: subcategoryFilter,
          isdealoftheday: dealsOnly ? true : undefined,
          search: searchTerm || undefined,
        });
        if (response.success) {
          setProducts(response.data);
        } else {
          setError("Failed to fetch products");
        }
      } catch (err) {
        setError("Failed to fetch products");
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryFilter, subcategoryFilter, dealsOnly, searchTerm]);

  return (
    <div className="min-h-screen bg-secondary-extra-light-gray">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="w-full px-4 sm:px-5 lg:px-6 py-5">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark-gray mb-2">
            {pageTitle}
          </h1>
          <p className="text-lg text-secondary-medium-gray">
            {pageDescription}
          </p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-5 lg:px-6 py-5">
        {/* Results Header */}
        <div className="sticky top-20 z-40 -mx-4 mb-6 flex flex-col border-b border-secondary-light-gray/70 bg-secondary-extra-light-gray px-4 py-3 sm:-mx-5 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:-mx-6 lg:px-6">
          <p className="text-secondary-medium-gray mb-2 sm:mb-0">
            Showing {filteredProducts.length}
            {filteredProducts.length !== products.length
              ? ` of ${products.length}`
              : ""}{" "}
            products
            {searchTerm ? ` for "${searchTerm}"` : ""}
          </p>
          <div className="flex items-center space-x-2">
            <div className="relative" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => setSortOpen((current) => !current)}
                className={`relative p-2 rounded-lg transition-colors duration-200 ${
                  sortOpen || hasActiveFilters
                    ? "bg-primary-gold text-primary-blue"
                    : "text-secondary-medium-gray hover:bg-secondary-light-gray"
                }`}
                aria-label="Filter and sort"
                aria-expanded={sortOpen}
                title="Filter and sort"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"
                  />
                </svg>
                {hasActiveFilters && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-secondary-extra-light-gray" />
                )}
              </button>

              {sortOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-secondary-light-gray bg-white p-2 shadow-xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="px-2 pt-1 text-sm font-semibold text-secondary-dark-gray">
                      Filter Products
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="px-2 pt-1 text-xs font-semibold text-primary-blue hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSortSelect(option.value)}
                        className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                          sortOption === option.value
                            ? "bg-primary-gold text-primary-blue"
                            : "text-secondary-dark-gray hover:bg-primary-gold/20 hover:text-primary-blue"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="text-sm text-secondary-medium-gray">View:</span>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                viewMode === "grid"
                  ? "bg-primary-gold text-primary-blue"
                  : "text-secondary-medium-gray hover:bg-secondary-light-gray"
              }`}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                viewMode === "list"
                  ? "bg-primary-gold text-primary-blue"
                  : "text-secondary-medium-gray hover:bg-secondary-light-gray"
              }`}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              title="List view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-gold mx-auto mb-4"></div>
            <p className="text-secondary-medium-gray">Loading products...</p>
          </div>
        ) : error ? (
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
            <p className="text-secondary-medium-gray mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                : "grid grid-cols-1 xl:grid-cols-2 gap-5"
            }
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                layout={viewMode}
              />
            ))}
          </div>
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

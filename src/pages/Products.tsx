import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import type { Product } from "../types";
import { platformProductService } from "../services/productPlatformService";

const normalize = (value?: string | null) => (value || "").toLowerCase();

const formatFilterLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

interface FilterPill {
  label: string;
  param: "category" | "subcategory";
  value: string;
}

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const collection = searchParams.get("collection");
  const search = searchParams.get("search");

  const filteredProducts = useMemo(() => {
    let result = products;

    if (category) {
      result = result.filter((product) => normalize(product.category) === normalize(category));
    }

    if (subcategory) {
      result = result.filter(
        (product) =>
          normalize(product.subcategory) === normalize(subcategory) ||
          normalize(product.fragnancetype) === normalize(subcategory) ||
          normalize(product.fragnancetype)
            .split(",")
            .map((value) => value.trim())
            .includes(normalize(subcategory))
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
  }, [category, collection, products, search, subcategory]);

  const categoryOptions = useMemo<FilterPill[]>(() => {
    const addOption = (map: Map<string, FilterPill>, param: FilterPill["param"], value?: string | null) => {
      const cleanedValue = value?.trim();
      if (!cleanedValue) return;

      const key = `${param}:${normalize(cleanedValue)}`;
      if (!map.has(key)) {
        map.set(key, {
          label: formatFilterLabel(cleanedValue),
          param,
          value: cleanedValue,
        });
      }
    };

    const options = new Map<string, FilterPill>();

    products.forEach((product) => {
      addOption(options, "category", product.category);
      addOption(options, "subcategory", product.subcategory);
    });

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const variantOptions = useMemo<FilterPill[]>(() => {
    const categoryKeys = new Set(categoryOptions.map((option) => normalize(option.value)));
    const options = new Map<string, FilterPill>();

    products.forEach((product) => {
      product.fragnancetype
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => {
          if (categoryKeys.has(normalize(value))) return;

          const key = normalize(value);
          if (!options.has(key)) {
            options.set(key, {
              label: formatFilterLabel(value),
              param: "subcategory",
              value,
            });
          }
        });
    });

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryOptions, products]);

  const pageTitle = useMemo(() => {
    if (subcategory) return formatFilterLabel(subcategory);
    if (category) return formatFilterLabel(category);
    if (collection) return formatFilterLabel(collection);
    if (search) return search;
    return "Our Products";
  }, [category, collection, search, subcategory]);

  const showAllProducts = () => {
    setSearchParams({});
  };

  const selectCategory = (option: FilterPill) => {
    setSearchParams({ [option.param]: option.value });
  };

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await platformProductService.getProducts();
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
  }, []);

  return (
    <div className="min-h-screen bg-secondary-extra-light-gray">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-secondary-dark-gray mb-2">
            {pageTitle}
          </h1>
          <p className="text-lg text-secondary-medium-gray">
            Explore our premium incense sticks, essential oils, and spiritual
            home decor
            {search ? ` matching "${search}"` : ""}
          </p>
          {categoryOptions.length > 0 && (
            <div className="mt-5 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  type="button"
                  onClick={showAllProducts}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    !category && !subcategory && !collection && !search
                      ? "border-primary-gold bg-primary-gold text-primary-blue"
                      : "border-[var(--color-border)] bg-white text-secondary-medium-gray hover:border-primary-gold hover:text-primary-blue"
                  }`}
                >
                  All
                </button>
                {categoryOptions.map((option) => {
                  const isActive =
                    option.param === "category"
                      ? normalize(category) === normalize(option.value)
                      : normalize(subcategory) === normalize(option.value);

                  return (
                    <button
                      key={`${option.param}-${option.value}`}
                      type="button"
                      onClick={() => selectCategory(option)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-primary-gold bg-primary-gold text-primary-blue"
                          : "border-[var(--color-border)] bg-white text-secondary-medium-gray hover:border-primary-gold hover:text-primary-blue"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {variantOptions.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {variantOptions.map((option) => {
                    const isActive = normalize(subcategory) === normalize(option.value);

                    return (
                      <button
                        key={`variant-${option.value}`}
                        type="button"
                        onClick={() => selectCategory(option)}
                        className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "border-primary-gold bg-primary-gold text-primary-blue"
                            : "border-[var(--color-border)] bg-white text-secondary-medium-gray hover:border-primary-gold hover:text-primary-blue"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Header */}
        <div className="mb-6">
          <p className="text-secondary-medium-gray mb-2 sm:mb-0">
            Showing {filteredProducts.length} products
          </p>
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
          <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
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

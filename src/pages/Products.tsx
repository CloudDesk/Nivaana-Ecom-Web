import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import type { Product } from "../types";
import { platformProductService } from "../services/productPlatformService";

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

const filterAliases: Record<string, string[]> = {
  aromatherapy_wellness: ["aromatherapy_&_wellness"],
  bath: ["soaps", "facewash", "handwash"],
  car_room_fresheners: ["car_&_room_fresheners"],
  dhoops: ["premium_dhoop_sticks"],
  diffuser_oil_refill_pack_for_machines: ["diffuser_oils"],
  floor_cleaner_concentrates: ["bath"],
  fragrance_sachets: ["wardrobe_sachets"],
  havan_cups: ["premium_havan_cups"],
  incense_sticks: ["premium_incense_sticks"],
  premium_room_mist: ["room_fresheners", "car_fresheners"],
  wardrobe_sachets: ["fragrance_sachets"],
};

const filterQueryVariants = (value?: string | null) => {
  const keys = new Set(filterKeyVariants(value));

  [...keys].forEach((key) => {
    filterAliases[key]?.forEach((alias) => {
      filterKeyVariants(alias).forEach((aliasKey) => keys.add(aliasKey));
    });
  });

  return keys;
};

const filterValueMatches = (productValue: string | null | undefined, filterValue: string | null | undefined) =>
  Boolean(filterValue) &&
  [...filterKeyVariants(productValue)].some((productKey) => filterQueryVariants(filterValue).has(productKey));

const listValueMatches = (productValue: string | null | undefined, filterValue: string | null | undefined) =>
  Boolean(filterValue) &&
  normalize(productValue)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .some((value) => filterValueMatches(value, filterValue));

const formatFilterLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

interface FilterPill {
  label: string;
  param: "category" | "subcategory" | "subsubcategory";
  value: string;
}

interface ProductsProps {
  defaultCollection?: string;
}

const Products: React.FC<ProductsProps> = ({ defaultCollection }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeCategoryPillRef = useRef<HTMLButtonElement | null>(null);
  const activeDetailPillRef = useRef<HTMLButtonElement | null>(null);

  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const subsubcategory = searchParams.get("subsubcategory");
  const collection = searchParams.get("collection") || defaultCollection;
  const search = searchParams.get("search");

  const filteredProducts = useMemo(() => {
    let result = products;

    if (category) {
      result = result.filter(
        (product) =>
          filterValueMatches(product.category, category) ||
          filterValueMatches(product.subcategory, category) ||
          filterValueMatches(product.subsubcategory, category)
      );
    }

    if (subcategory) {
      result = result.filter(
        (product) =>
          filterValueMatches(product.subcategory, subcategory) ||
          filterValueMatches(product.subsubcategory, subcategory) ||
          filterValueMatches(product.fragnancetype, subcategory) ||
          listValueMatches(product.fragnancetype, subcategory)
      );
    }

    if (subsubcategory) {
      result = result.filter(
        (product) =>
          filterValueMatches(product.subsubcategory, subsubcategory) ||
          filterValueMatches(product.fragnancetype, subsubcategory) ||
          listValueMatches(product.fragnancetype, subsubcategory)
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
  }, [category, collection, products, search, subcategory, subsubcategory]);

  const addFilterOption = (map: Map<string, FilterPill>, param: FilterPill["param"], value?: string | null) => {
    const cleanedValue = value?.trim();
    if (!cleanedValue) return;

    const key = `${param}:${normalizeFilterKey(cleanedValue)}`;
    if (!map.has(key)) {
      map.set(key, {
        label: formatFilterLabel(cleanedValue),
        param,
        value: cleanedValue,
      });
    }
  };

  const topCategoryOptions = useMemo<FilterPill[]>(() => {
    const options = new Map<string, FilterPill>();

    products.forEach((product) => {
      addFilterOption(options, "category", product.category);
      addFilterOption(options, "category", product.subcategory);
    });

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const childCategoryOptions = useMemo<FilterPill[]>(() => {
    if (!category) return [];

    const options = new Map<string, FilterPill>();
    const categoryProducts = products.filter(
      (product) =>
        filterValueMatches(product.category, category) ||
        filterValueMatches(product.subcategory, category) ||
        filterValueMatches(product.subsubcategory, category)
    );

    categoryProducts.forEach((product) => {
      if (!filterValueMatches(product.subcategory, category)) {
        addFilterOption(options, "subcategory", product.subcategory);
      }

      if (!filterValueMatches(product.subsubcategory, category)) {
        addFilterOption(options, "subsubcategory", product.subsubcategory);
      }
    });

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [category, products]);

  const allCategoryOptions = useMemo<FilterPill[]>(() => {
    const addOption = (map: Map<string, FilterPill>, param: FilterPill["param"], value?: string | null) => {
      const cleanedValue = value?.trim();
      if (!cleanedValue) return;

      const key = `${param}:${normalizeFilterKey(cleanedValue)}`;
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
      addOption(options, "subsubcategory", product.subsubcategory);
    });

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const variantOptions = useMemo<FilterPill[]>(() => {
    const categoryKeys = new Set(allCategoryOptions.flatMap((option) => [...filterKeyVariants(option.value)]));
    const options = new Map<string, FilterPill>();

    products.forEach((product) => {
      product.fragnancetype
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => {
          if (categoryKeys.has(normalizeFilterKey(value))) return;

          const key = normalizeFilterKey(value);
          if (!options.has(key)) {
            options.set(key, {
              label: formatFilterLabel(value),
              param: "subsubcategory",
              value,
            });
          }
        });
    });

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allCategoryOptions, products]);

  const pageTitle = useMemo(() => {
    if (subsubcategory) return formatFilterLabel(subsubcategory);
    if (subcategory) return formatFilterLabel(subcategory);
    if (category) return formatFilterLabel(category);
    if (collection) return formatFilterLabel(collection);
    if (search) return search;
    return "Our Products";
  }, [category, collection, search, subcategory, subsubcategory]);

  const showAllProducts = () => {
    setSearchParams({});
  };

  const selectCategory = (option: FilterPill) => {
    if (option.param === "category") {
      setSearchParams({ category: option.value });
      return;
    }

    const nextParams: Record<string, string> = { [option.param]: option.value };
    if (category) nextParams.category = category;

    setSearchParams(nextParams);
  };

  useEffect(() => {
    const centerPill = (activePill: HTMLButtonElement | null) => {
      const scroller = activePill?.parentElement;
      if (!activePill || !scroller) return;

      scroller.scrollTo({
        left: activePill.offsetLeft - scroller.clientWidth / 2 + activePill.clientWidth / 2,
        behavior: "smooth",
      });
    };

    centerPill(activeCategoryPillRef.current);
    centerPill(activeDetailPillRef.current);

    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [category, collection, search, subcategory, subsubcategory, topCategoryOptions, childCategoryOptions, variantOptions]);

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await platformProductService.getProducts(1, 1000);
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
          {topCategoryOptions.length > 0 && (
            <div className="mt-5 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  type="button"
                  onClick={showAllProducts}
                  ref={!category && !subcategory && !subsubcategory && !collection && !search ? activeCategoryPillRef : undefined}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    !category && !subcategory && !subsubcategory && !collection && !search
                      ? "border-primary-gold bg-primary-gold text-[var(--color-text)]"
                      : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-primary-gold"
                  }`}
                >
                  All
                </button>
                {topCategoryOptions.map((option) => {
                  const isActive = filterValueMatches(option.value, category);

                  return (
                    <button
                      key={`${option.param}-${option.value}`}
                      type="button"
                      onClick={() => selectCategory(option)}
                      ref={isActive ? activeCategoryPillRef : undefined}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-primary-gold bg-primary-gold text-[var(--color-text)]"
                          : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-primary-gold"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {category && childCategoryOptions.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {childCategoryOptions.map((option) => {
                    const isActive =
                      option.param === "subcategory"
                        ? filterValueMatches(option.value, subcategory)
                        : filterValueMatches(option.value, subsubcategory);

                    return (
                      <button
                        key={`child-${option.param}-${option.value}`}
                        type="button"
                        onClick={() => selectCategory(option)}
                        ref={isActive ? activeDetailPillRef : undefined}
                        className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "border-primary-gold bg-primary-gold text-[var(--color-text)]"
                            : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-primary-gold"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {!category && variantOptions.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {variantOptions.map((option) => {
                    const isActive = filterValueMatches(option.value, subsubcategory);

                    return (
                      <button
                        key={`variant-${option.value}`}
                        type="button"
                        onClick={() => selectCategory(option)}
                        ref={isActive ? activeDetailPillRef : undefined}
                        className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "border-primary-gold bg-primary-gold text-[var(--color-text)]"
                            : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-primary-gold"
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

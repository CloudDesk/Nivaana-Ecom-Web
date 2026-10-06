import { ArrowUpDown, SlidersHorizontal, X } from "lucide-react";

export type ProductSort =
  | "newest"
  | "bestselling"
  | "price-asc"
  | "price-desc"
  | "rating-desc"
  | "name-asc"
  | "name-desc";

export type ProductPriceRange =
  | "under-100"
  | "100-250"
  | "250-500"
  | "500-1000"
  | "above-1000";

interface ProductFiltersProps {
  sort: ProductSort;
  priceRange: ProductPriceRange | "";
  onSortChange: (sort: ProductSort) => void;
  onPriceRangeChange: (priceRange: ProductPriceRange | "") => void;
  onClear: () => void;
}

const controlClassName =
  "h-10 w-full appearance-none rounded-full border border-[var(--color-border)] bg-white px-4 pr-10 text-sm font-semibold text-[var(--color-text)] outline-none transition hover:border-primary-gold focus:border-primary-gold focus:ring-2 focus:ring-primary-gold/20 sm:w-auto";

export default function ProductFilters({
  sort,
  priceRange,
  onSortChange,
  onPriceRangeChange,
  onClear,
}: ProductFiltersProps) {
  const hasActiveFilter = Boolean(priceRange || sort !== "newest");

  return (
    <>
          <label className="relative min-w-0">
            <span className="sr-only">Price range</span>
            <select
              value={priceRange}
              onChange={(event) => onPriceRangeChange(event.target.value as ProductPriceRange | "")}
              className={controlClassName}
            >
              <option value="">All prices</option>
              <option value="under-100">Under ₹100</option>
              <option value="100-250">₹100 – ₹250</option>
              <option value="250-500">₹250 – ₹500</option>
              <option value="500-1000">₹500 – ₹1000</option>
              <option value="above-1000">Above ₹1000</option>
            </select>
            <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-medium-gray" aria-hidden="true" />
          </label>

          <label className="relative min-w-0">
            <span className="sr-only">Sort products</span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as ProductSort)}
              className={controlClassName}
            >
              <option value="newest">Newest first</option>
              <option value="bestselling">Best selling</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Ratings: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-medium-gray" aria-hidden="true" />
          </label>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-transparent px-3 text-sm font-semibold text-secondary-medium-gray transition hover:bg-[#f6f3ed] hover:text-secondary-dark-gray"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </button>
          )}
    </>
  );
}

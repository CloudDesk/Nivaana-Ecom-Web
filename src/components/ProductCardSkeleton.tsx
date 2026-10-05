import type { CSSProperties } from "react";
import { Skeleton } from "./ui/skeleton";

/**
 * Placeholder that mirrors the listing ProductCard (badge, wishlist heart,
 * two-line name, rating, price with MRP and the add-to-cart button) with the
 * same size, so the grid does not jump when products arrive. `index` staggers
 * the shimmer so the grid shows a gentle wave.
 */
export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
  const style = { "--shimmer-delay": `${(index % 5) * 0.12}s` } as CSSProperties;
  return (
    <div
      className="flex h-full min-h-[270px] flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] sm:min-h-[320px]"
      style={style}
      aria-hidden="true"
    >
      <div className="relative">
        <Skeleton className="aspect-[4/3.75] w-full rounded-none opacity-70" />
        <div className="absolute left-2 top-2 flex gap-1.5 sm:left-3 sm:top-3">
          <span className="h-5 w-12 rounded-full bg-white/80 sm:h-6 sm:w-14" />
        </div>
        <span className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/80 sm:right-3 sm:top-3 sm:h-10 sm:w-10" />
      </div>
      <div className="flex flex-1 flex-col p-2 sm:p-3">
        <Skeleton className="h-4 w-11/12 rounded-full" />
        <Skeleton className="mt-2 h-4 w-3/5 rounded-full" />
        <Skeleton className="ml-auto mt-3 h-3 w-9 rounded-full" />
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-full opacity-70" />
          </div>
          <Skeleton className="h-9 w-9 shrink-0 rounded-[var(--radius-sm)] sm:h-10 sm:w-10" />
        </div>
      </div>
    </div>
  );
}

/** A grid of card skeletons using the same columns as the product listing. */
export function ProductGridSkeleton({ count = 10, className = "" }: { count?: number; className?: string }) {
  return (
    <div
      className={`grid grid-cols-2 items-stretch gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5 ${className}`}
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} index={index} />
      ))}
    </div>
  );
}

export default ProductCardSkeleton;

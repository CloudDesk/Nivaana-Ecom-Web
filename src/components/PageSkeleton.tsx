import React from "react";
import { cn } from "../lib/utils";

export type PageSkeletonVariant =
  | "cart"
  | "wishlist"
  | "checkout"
  | "orders"
  | "payments"
  | "promotions"
  | "wallet"
  | "addresses"
  | "generic";

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  count?: number;
  className?: string;
  hideHeader?: boolean;
}

/* ─── Primitive bone ──────────────────────────────────────────────────────── */
const Bone: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      // Base: subtle background, rounded pill shape, overflow hidden for the sweep
      "relative overflow-hidden rounded-full bg-gray-200",
      // Shimmer sweep via pseudo-element
      "after:absolute after:inset-0 after:-translate-x-full",
      "after:animate-[shimmer_1.6s_ease-in-out_infinite]",
      "after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent",
      className
    )}
  />
);

/* Square/rect bone (images, icons) — uses rounded-lg instead of pill */
const Box: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-lg bg-gray-200",
      "after:absolute after:inset-0 after:-translate-x-full",
      "after:animate-[shimmer_1.6s_ease-in-out_infinite]",
      "after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent",
      className
    )}
  />
);

/* ─── Exported component ─────────────────────────────────────────────────── */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  variant = "generic",
  count,
  className = "",
  hideHeader = false,
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case "cart":
        return <CartSkeleton count={count ?? 3} hideHeader={hideHeader} />;
      case "wishlist":
        return <WishlistSkeleton count={count ?? 4} hideHeader={hideHeader} />;
      case "checkout":
        return <CheckoutSkeleton />;
      case "orders":
        return <OrdersSkeleton count={count ?? 3} hideHeader={hideHeader} />;
      case "payments":
        return <PaymentsSkeleton count={count ?? 4} hideHeader={hideHeader} />;
      case "promotions":
        return <PromotionsSkeleton count={count ?? 4} />;
      case "wallet":
        return <WalletSkeleton />;
      case "addresses":
        return <AddressesSkeleton count={count ?? 3} />;
      case "generic":
      default:
        return <GenericSkeleton count={count ?? 3} hideHeader={hideHeader} />;
    }
  };

  return (
    <div className={cn("animate-in fade-in duration-300", className)}>
      {renderSkeleton()}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Shared sub-elements
   ────────────────────────────────────────────────────────────────────────── */

/** Breadcrumb "Account › Page" line */
function BreadcrumbBones() {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Bone className="h-2.5 w-14" />
      <span className="text-gray-300 text-xs">›</span>
      <Bone className="h-2.5 w-20" />
    </div>
  );
}

/** Page heading block: title + subtitle */
function HeadingBones({
  titleW = "w-36",
  subtitleW = "w-56",
}: {
  titleW?: string;
  subtitleW?: string;
}) {
  return (
    <div className="space-y-2.5 mb-6">
      <Bone className={cn("h-6", titleW)} />
      <Bone className={cn("h-3", subtitleW)} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CART SKELETON
   ────────────────────────────────────────────────────────────────────────── */
function CartSkeleton({
  count,
  hideHeader,
}: {
  count: number;
  hideHeader?: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      {!hideHeader && (
        <>
          <BreadcrumbBones />
          <HeadingBones titleW="w-24" subtitleW="w-40" />
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,0.9fr)_460px]">
        {/* Cart item list */}
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              {/* Product image square */}
              <Box className="h-24 w-24 shrink-0" />

              {/* Text lines */}
              <div className="min-w-0 flex-1 space-y-0">
                {/* Title */}
                <Bone className="h-3 w-3/4 mb-3" />
                {/* Variant / badge */}
                <Bone className="h-2.5 w-1/3 mb-5" />
                {/* Qty + Price row */}
                <div className="flex items-center justify-between">
                  <Box className="h-8 w-24 rounded-lg" />
                  <Bone className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary card */}
        <aside className="h-fit rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          {/* Title */}
          <Bone className="h-4 w-32 mb-6" />

          {/* Line items */}
          <div className="space-y-4 border-b border-gray-100 pb-5">
            {[["w-20", "w-14"], ["w-16", "w-12"], ["w-24", "w-14"]].map(
              ([l, r], i) => (
                <div key={i} className="flex justify-between items-center">
                  <Bone className={cn("h-2.5", l)} />
                  <Bone className={cn("h-2.5", r)} />
                </div>
              )
            )}
            {/* Total row */}
            <div className="flex justify-between items-center pt-1">
              <Bone className="h-3.5 w-16" />
              <Bone className="h-3.5 w-20" />
            </div>
          </div>

          {/* Promo input */}
          <Box className="h-10 w-full rounded-lg mt-5 mb-3" />
          {/* CTA button */}
          <Box className="h-11 w-full rounded-lg" />
        </aside>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   WISHLIST SKELETON
   ────────────────────────────────────────────────────────────────────────── */
function WishlistSkeleton({
  count,
  hideHeader,
}: {
  count: number;
  hideHeader?: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      {!hideHeader && (
        <>
          <BreadcrumbBones />
          <HeadingBones titleW="w-28" subtitleW="w-44" />
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="relative flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <Box className="h-24 w-24 shrink-0" />
            <div className="min-w-0 flex-1 pr-16 space-y-0">
              <Bone className="h-3 w-4/5 mb-3" />
              <Bone className="h-2.5 w-full mb-2" />
              <Bone className="h-2.5 w-2/3 mb-5" />
              <div className="flex items-center gap-2">
                <Box className="h-9 w-28 rounded-lg" />
                <Box className="h-9 w-9 rounded-lg" />
              </div>
            </div>
            {/* Price top-right */}
            <div className="absolute right-4 top-4">
              <Bone className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CHECKOUT SKELETON
   ────────────────────────────────────────────────────────────────────────── */
function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb + heading */}
      <BreadcrumbBones />
      <div className="mb-8 flex items-start justify-between gap-3">
        <HeadingBones titleW="w-44" subtitleW="w-32" />
        <Box className="h-9 w-28 rounded-lg shrink-0" />
      </div>

      {/* Progress steps */}
      <div className="mb-8 flex items-center gap-3 max-w-sm">
        <Box className="h-7 w-24 rounded-full" />
        <Bone className="h-0.5 flex-1" />
        <Box className="h-7 w-24 rounded-full" />
        <Bone className="h-0.5 flex-1" />
        <Box className="h-7 w-24 rounded-full" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left sections */}
        <div className="space-y-4">
          {/* Delivery address */}
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <Bone className="h-3.5 w-32" />
              <Box className="h-7 w-16 rounded-lg" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AddressCard />
              <AddressCard />
            </div>
          </SectionCard>

          {/* Order items preview */}
          <SectionCard>
            <Bone className="h-3.5 w-28 mb-4" />
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <Box className="h-14 w-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-2.5 w-3/4" />
                  <Bone className="h-2 w-1/4" />
                </div>
                <Bone className="h-3 w-14 shrink-0" />
              </div>
            ))}
          </SectionCard>

          {/* Payment method */}
          <SectionCard>
            <Bone className="h-3.5 w-36 mb-4" />
            <div className="grid gap-3 sm:grid-cols-2">
              <PayMethodCard />
              <PayMethodCard />
              <PayMethodCard />
            </div>
          </SectionCard>
        </div>

        {/* Right summary */}
        <aside className="h-fit rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <Bone className="h-4 w-32 mb-2" />
          <div className="space-y-4 border-b border-gray-100 pb-4">
            {[["w-20", "w-12"], ["w-16", "w-10"], ["w-24", "w-14"]].map(
              ([l, r], i) => (
                <div key={i} className="flex justify-between">
                  <Bone className={cn("h-2.5", l)} />
                  <Bone className={cn("h-2.5", r)} />
                </div>
              )
            )}
            <div className="flex justify-between pt-1">
              <Bone className="h-3.5 w-14" />
              <Bone className="h-3.5 w-20" />
            </div>
          </div>
          <Box className="h-11 w-full rounded-lg" />
        </aside>
      </div>
    </div>
  );
}

/* Checkout helpers */
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      {children}
    </div>
  );
}

function AddressCard() {
  return (
    <div className="rounded-lg border border-gray-100 p-4 space-y-2.5">
      <Bone className="h-3 w-24" />
      <Bone className="h-2.5 w-full" />
      <Bone className="h-2.5 w-4/5" />
      <Bone className="h-2.5 w-3/5" />
      <Bone className="h-2.5 w-2/5 mt-1" />
    </div>
  );
}

function PayMethodCard() {
  return (
    <div className="rounded-lg border border-gray-100 p-3 flex items-center gap-3">
      <Box className="h-8 w-8 rounded-md shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Bone className="h-2.5 w-20" />
        <Bone className="h-2 w-14" />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ORDERS SKELETON
   ────────────────────────────────────────────────────────────────────────── */
function OrdersSkeleton({
  count,
  hideHeader,
}: {
  count: number;
  hideHeader?: boolean;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      {!hideHeader && (
        <>
          <BreadcrumbBones />
          <HeadingBones titleW="w-28" subtitleW="w-52" />
        </>
      )}

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3"
          >
            <Bone className="h-2.5 w-20" />
            <Bone className="h-5 w-16" />
          </div>
        ))}
      </div>

      {/* Order rows */}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center gap-4">
                <Bone className="h-2.5 w-28" />
                <Bone className="h-2.5 w-24" />
              </div>
              <div className="flex items-center gap-3">
                <Box className="h-6 w-24 rounded-full" />
                <Bone className="h-2.5 w-16" />
              </div>
            </div>

            {/* Product thumbnails */}
            <div className="flex items-center gap-3 mb-4">
              <Box className="h-14 w-14 shrink-0" />
              <Box className="h-14 w-14 shrink-0" />
              <Box className="h-14 w-14 shrink-0" />
              <div className="flex-1 space-y-2 pl-1">
                <Bone className="h-2.5 w-48" />
                <Bone className="h-2 w-28" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <Box className="h-8 w-28 rounded-lg" />
              <Box className="h-8 w-32 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   PAYMENTS SKELETON
   ────────────────────────────────────────────────────────────────────────── */
function PaymentsSkeleton({
  count,
  hideHeader,
}: {
  count: number;
  hideHeader?: boolean;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      {!hideHeader && (
        <>
          <BreadcrumbBones />
          <HeadingBones titleW="w-32" subtitleW="w-60" />
        </>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        {/* Section heading */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Bone className="h-4 w-36" />
            <Bone className="h-2.5 w-56" />
          </div>
          <Box className="h-8 w-8 rounded-full" />
        </div>

        {/* Table-like rows */}
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="grid min-w-0 gap-4 md:grid-cols-[1.1fr_1.2fr_0.8fr_0.9fr] md:items-center">
                  {/* Column 1: Date */}
                  <div className="space-y-1.5">
                    <Bone className="h-2 w-10" />
                    <Bone className="h-2.5 w-20" />
                  </div>
                  {/* Column 2: Description */}
                  <div className="space-y-1.5">
                    <Bone className="h-2 w-14" />
                    <Bone className="h-2.5 w-32" />
                  </div>
                  {/* Column 3: Amount */}
                  <div className="space-y-1.5">
                    <Bone className="h-2 w-12" />
                    <Bone className="h-2.5 w-20" />
                  </div>
                  {/* Column 4: Status badge */}
                  <div>
                    <Box className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                {/* Chevron */}
                <Box className="h-7 w-7 rounded-full justify-self-end" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   GENERIC / FALLBACK SKELETON
   ────────────────────────────────────────────────────────────────────────── */
function GenericSkeleton({
  count,
  hideHeader,
}: {
  count: number;
  hideHeader?: boolean;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {!hideHeader && (
        <>
          <BreadcrumbBones />
          <HeadingBones titleW="w-44" subtitleW="w-72" />
        </>
      )}

      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3"
          >
            {/* Heading row */}
            <div className="flex items-center justify-between">
              <Bone className="h-3.5 w-1/3" />
              <Box className="h-5 w-20 rounded-full" />
            </div>
            {/* Text lines */}
            <Bone className="h-2.5 w-full" />
            <Bone className="h-2.5 w-4/5" />
            <Bone className="h-2.5 w-3/5" />
            {/* Actions */}
            <div className="pt-2 flex items-center justify-between">
              <Box className="h-8 w-28 rounded-lg" />
              <Bone className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   PROMOTIONS SKELETON
   Layout: hero dark banner (always visible) + grid of promo cards below
   ────────────────────────────────────────────────────────────────────────── */
function PromotionsSkeleton({ count }: { count: number }) {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Breadcrumb */}
      <BreadcrumbBones />

      {/* Hero banner card — dark background mirroring the real gradient card */}
      <div className="relative overflow-hidden rounded-3xl bg-gray-800 p-7 mb-8 sm:p-9">
        {/* Tag pill */}
        <Box className="h-6 w-36 rounded-full mb-5 opacity-60" />
        {/* Title lines */}
        <Bone className="h-5 w-3/4 mb-3 bg-gray-600" />
        <Bone className="h-3 w-2/3 mb-3 bg-gray-600" />
        <Bone className="h-3 w-1/2 mb-8 bg-gray-600" />
        {/* Stat + CTA row */}
        <div className="flex flex-wrap items-center gap-3">
          <Box className="h-14 w-28 rounded-2xl opacity-50" />
          <Box className="h-14 w-20 rounded-2xl opacity-50" />
          <Box className="h-14 w-32 rounded-2xl opacity-50" />
        </div>
      </div>

      {/* Loading indicator row (replaces the spinner) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 mb-8 flex items-center gap-4 shadow-sm">
        <Box className="h-5 w-5 rounded-full shrink-0" />
        <Bone className="h-3 w-64" />
      </div>

      {/* Promo card grid */}
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            {/* Top row: tag + badge */}
            <div className="flex items-center justify-between mb-3">
              <Bone className="h-2.5 w-28" />
              <Box className="h-5 w-20 rounded-full" />
            </div>
            {/* Title */}
            <Bone className="h-4 w-3/5 mb-2" />
            {/* Description lines */}
            <Bone className="h-2.5 w-full mb-1.5" />
            <Bone className="h-2.5 w-4/5 mb-4" />
            {/* Code pill + expiry */}
            <div className="flex items-center gap-3 mb-4">
              <Box className="h-8 w-32 rounded-lg" />
              <Bone className="h-2.5 w-28" />
            </div>
            {/* Action row */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <Bone className="h-2.5 w-24" />
              <Box className="h-9 w-32 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   WALLET SKELETON
   Layout: 2-col — left (balance card + coupon input form), right (credit list)
   ────────────────────────────────────────────────────────────────────────── */
function WalletSkeleton() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb + heading */}
      <BreadcrumbBones />
      <div className="flex items-center gap-3 mb-8">
        <Box className="h-12 w-12 rounded-full shrink-0" />
        <div className="space-y-2">
          <Bone className="h-5 w-28" />
          <Bone className="h-2.5 w-72" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        {/* Left col */}
        <div className="space-y-5">
          {/* Balance card — dark bg */}
          <div className="rounded-2xl bg-gray-800 p-7">
            <Bone className="h-2.5 w-36 mb-3 bg-gray-600" />
            <Bone className="h-8 w-28 mb-4 bg-gray-600" />
            <Bone className="h-2.5 w-3/4 bg-gray-600" />
          </div>

          {/* Coupon input form */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
            <Bone className="h-3.5 w-40 mb-1" />
            <Bone className="h-2.5 w-full" />
            {/* Input field */}
            <Box className="h-12 w-full rounded-lg mt-2" />
            {/* Button */}
            <Box className="h-10 w-full rounded-lg" />
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-6">
          {/* Section: Available to add */}
          <div>
            <Bone className="h-4 w-40 mb-3" />
            {[0, 1].map((i) => (
              <div
                key={i}
                className="mb-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <Bone className="h-2.5 w-28" />
                  <Bone className="h-4 w-48" />
                  <Bone className="h-5 w-20" />
                  <Bone className="h-2.5 w-40" />
                </div>
                <Box className="h-9 w-32 rounded-lg shrink-0" />
              </div>
            ))}
          </div>

          {/* Section: Available wallet credits */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Bone className="h-4 w-44" />
              <Box className="h-8 w-36 rounded-full" />
            </div>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="mb-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1">
                    <Bone className="h-3 w-48" />
                    <Bone className="h-2.5 w-28" />
                  </div>
                  <Box className="h-5 w-20 rounded-full" />
                </div>
                {/* Original / Used / Remaining row */}
                <div className="grid grid-cols-3 gap-3">
                  {["w-10", "w-8", "w-10"].map((w, j) => (
                    <div key={j} className="space-y-1.5">
                      <Bone className={`h-2 ${w}`} />
                      <Bone className="h-3.5 w-14" />
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div className="flex items-end justify-between border-t border-gray-100 pt-3">
                  <div className="space-y-1.5">
                    <Bone className="h-2.5 w-36" />
                    <Bone className="h-2.5 w-24" />
                  </div>
                  <Box className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ADDRESSES SKELETON
   Layout: heading + grid of address cards (name, lines, actions)
   ────────────────────────────────────────────────────────────────────────── */
function AddressesSkeleton({ count }: { count: number }) {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb + heading */}
      <BreadcrumbBones />
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-6 w-36" />
          <Bone className="h-3 w-60" />
        </div>
        <Box className="h-10 w-36 rounded-lg shrink-0" />
      </div>

      {/* Address grid */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2.5"
            >
              {/* Name + default badge */}
              <div className="flex items-center justify-between">
                <Bone className="h-3 w-28" />
                <Box className="h-5 w-16 rounded-full" />
              </div>
              {/* Phone */}
              <Bone className="h-2.5 w-32" />
              {/* Address lines */}
              <Bone className="h-2.5 w-full" />
              <Bone className="h-2.5 w-4/5" />
              <Bone className="h-2.5 w-3/5" />
              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-1">
                <Box className="h-8 w-20 rounded-lg" />
                <Box className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;

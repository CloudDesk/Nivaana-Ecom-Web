import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  BadgePercent,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  Gift,
  Loader2,
  Percent,
  ShoppingBag,
  Sparkles,
  Tag,
  TicketPercent,
  Truck,
  UserRound,
  WalletCards,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { cartService } from "../services/cartService";
import { platformProductService } from "../services/productPlatformService";
import {
  promotionService,
  type ApplicablePromotion,
  type AppliedPromotion,
  type Promotion,
} from "../services/promotionService";
import { sessionService } from "../services/sessionService";
import type { Product } from "../types";
import {
  buildPromotionCartData,
  buildPromotionEvaluationCartItems,
} from "../lib/cartPromotions";
import { toast } from "../components/toastApi";

const formatCurrency = (value?: number | null) =>
  `₹${Math.max(Number(value || 0), 0).toLocaleString("en-IN")}`;

const formatEligibilityReason = (reason?: string | null) => {
  const value = String(reason || "").trim();
  const normalized = value.toLowerCase();
  if (!value) return "This offer is not available for your current cart yet.";
  if (normalized.includes("has not started")) return "This offer is not available yet.";
  if (normalized.includes("expired")) return "This offer has expired.";
  if (normalized.includes("segment not eligible") || normalized.includes("creation date not eligible")) {
    return "This offer is not available for your account.";
  }
  if (normalized.includes("order count not eligible")) {
    return "Your previous order count does not meet this offer's requirements.";
  }
  const cartTotal = value.match(/Cart total value not eligible\. Required: (?:GTE|GT) ([\d.]+), Current: ([\d.]+)/i);
  if (cartTotal) {
    const amountNeeded = Math.max(Number(cartTotal[1]) - Number(cartTotal[2]), 0);
    return amountNeeded > 0
      ? `Add ${formatCurrency(amountNeeded)} more to use this offer.`
      : "Your cart total does not meet this offer's requirements.";
  }
  const itemCount = value.match(/Cart item count not eligible\. Required: (?:GTE|GT) ([\d.]+), Current: ([\d.]+)/i);
  if (itemCount) {
    const itemsNeeded = Math.max(Math.ceil(Number(itemCount[1]) - Number(itemCount[2])), 0);
    return itemsNeeded > 0
      ? `Add ${itemsNeeded} more ${itemsNeeded === 1 ? "item" : "items"} to use this offer.`
      : "Your cart does not meet this offer's item requirement.";
  }
  if (normalized.includes("category not eligible")) {
    return "This offer applies only to selected product categories.";
  }
  if (normalized.includes("no discount applicable")) {
    return "This offer does not apply to the products currently in your cart.";
  }
  return "Your cart does not meet this offer's requirements yet.";
};

const quantityFor = (quantity: unknown) => {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? parsed : 0;
};

const unitPrice = (product?: Product) =>
  product ? Math.max(Number(product.price || 0) - Number(product.discount || 0), 0) : 0;

const toDateTimestamp = (value?: number | string | null) => {
  if (!value) return "";

  if (typeof value === "number") {
    return value > 0 && value < 1_000_000_000_000 ? value * 1000 : value;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  const numericValue = Number(trimmedValue);
  if (Number.isFinite(numericValue)) {
    return numericValue > 0 && numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
  }

  const timestamp = Date.parse(trimmedValue);
  return Number.isFinite(timestamp) ? timestamp : "";
};

const formatDate = (value?: number | string | null, timeZone?: string | null) => {
  const timestamp = toDateTimestamp(value);
  if (!timestamp) return "";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(timeZone ? { timeZone } : {}),
    }).format(timestamp);
  } catch {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(timestamp);
  }
};

const promotionKey = (promotion: ApplicablePromotion, group: string, index: number) =>
  `${group}-${promotion.promotion_id || promotion.code || promotion.name}-${index}`;

const publicPromotionKey = (promotion: Promotion) => `${promotion.id}-${promotion.code || promotion.name}`;

const Promotions: React.FC = () => {
  const session = sessionService.getSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyPromotionCode = async (code: string) => {
    const normalizedCode = code.trim();
    if (!normalizedCode) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedCode);
      } else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = normalizedCode;
        temporaryInput.style.position = "fixed";
        temporaryInput.style.opacity = "0";
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand("copy");
        temporaryInput.remove();
      }
      setCopiedCode(normalizedCode);
      toast.success(`Code ${normalizedCode} copied.`);
      window.setTimeout(
        () => setCopiedCode((current) => (current === normalizedCode ? null : current)),
        1800
      );
    } catch {
      toast.error("Could not copy the code. Please select and copy it manually.");
    }
  };

  const cartQuery = useQuery({
    queryKey: ["cart", userId],
    queryFn: () => cartService.getCart(userId!),
    enabled: Boolean(userId),
  });

  const productsQuery = useQuery({
    queryKey: ["promotion-products"],
    queryFn: () => platformProductService.getProducts(1, 100),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });

  const publicPromotionsQuery = useQuery({
    queryKey: ["my-promotions", userId],
    queryFn: () => promotionService.mine("web"),
    enabled: Boolean(userId),
  });

  const cartItems = useMemo(() => (cartQuery.data?.data ?? []).filter((item) => item.iscart), [cartQuery.data]);
  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);
  const promotionRows = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = products.find((row) => row.id === item.productid);
          if (!product) return null;
          return {
            cartRecordId: item.id ?? item.productid,
            productid: item.productid,
            product,
            quantity: quantityFor(item.quantity),
          };
        })
        .filter(
          (row): row is NonNullable<typeof row> =>
            Boolean(row && row.quantity > 0)
        ),
    [cartItems, products]
  );
  const promotionCartData = useMemo(
    () => buildPromotionCartData(promotionRows),
    [promotionRows]
  );
  const promotionEvaluationItems = useMemo(
    () => buildPromotionEvaluationCartItems(promotionRows),
    [promotionRows]
  );
  const recommendationItems = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = products.find((row) => row.id === item.productid);
          if (!product) return null;

          return {
            productId: String(item.productid),
            qty: quantityFor(item.quantity),
            category: product.category || product.subcategory || "general",
            price: unitPrice(product),
          };
        })
        .filter((item): item is { productId: string; qty: number; category: string; price: number } =>
          Boolean(item && item.qty > 0)
        ),
    [cartItems, products]
  );

  const offersQuery = useQuery({
    queryKey: ["promotion-offers", userId, recommendationItems],
    queryFn: () =>
      promotionService.getRecommendedOffers({
        userId: String(userId),
        cartItems: recommendationItems,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      }),
    enabled: Boolean(userId && recommendationItems.length > 0 && products.length > 0),
  });

  const applyPromotionMutation = useMutation({
    mutationFn: async (promotion: Promotion) => {
      if (!userId || promotionEvaluationItems.length === 0) {
        throw new Error("Add products to your cart before applying this promotion.");
      }
      if (!offersQuery.data?.data?.currentEvaluation?.evaluation_id) {
        await promotionService.evaluateAutomatic({
          userId: String(userId),
          cartItems: promotionEvaluationItems,
          currentTotal: promotionCartData.total,
          mode: "phonepe",
          channel: "web",
          geo: "IN",
        });
      }
      return promotionService.evaluate({
        cartId: `cart-${userId}`,
        userId: String(userId),
        promotionId: promotion.id,
        applicationType: promotion.stackable
          ? "stackable_promotion"
          : "manual_coupon",
        cartData: promotionCartData,
        cartItems: promotionEvaluationItems,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });
    },
    onSuccess: (_response, promotion) => {
      toast.success(`${promotion.name} applied to your cart.`);
      queryClient.invalidateQueries({ queryKey: ["promotion-offers", userId] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not apply this promotion."
      );
    },
  });

  if (!session) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-12">
        <section className="mx-auto max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <UserRound className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
          <h1 className="mt-5 text-2xl font-bold text-[var(--color-text)]">Login to view promotions</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Sign in so we can check your cart and show offers that apply to you.
          </p>
          <Link to="/login" className="mt-6 inline-flex">
            <Button>Login with OTP</Button>
          </Link>
        </section>
      </main>
    );
  }

  const publicPromotions = publicPromotionsQuery.data?.data ?? [];
  const offers = offersQuery.data?.data;
  const appliedPromotions = offers?.currentEvaluation?.applied_promotions ?? [];
  const ineligibleReasonById = new Map(
    (offers?.ineligibleCoupons ?? []).map((promotion) => [
      promotion.promotion_id,
      formatEligibilityReason(promotion.ineligibleReason),
    ])
  );
  const appliedPromotionIds = new Set(
    appliedPromotions
      .map((promotion) => promotion.promotion_id)
      .filter((id): id is number => typeof id === "number")
  );
  const isAlreadyApplied = (promotionId: number | undefined | null) =>
    typeof promotionId === "number" && appliedPromotionIds.has(promotionId);
  const personalPromotions = publicPromotions.filter(
    (promotion) =>
      !isAlreadyApplied(promotion.id) &&
      (Boolean(promotion.assignment_id) ||
        promotion.audience === "customer" ||
        promotion.audience === "customer_group")
  );
  const eligiblePromotions = (offers?.eligibleCoupons ?? []).filter(
    (promotion) => !isAlreadyApplied(promotion.promotion_id)
  );
  const stackablePromotions = (offers?.stackablePromotions ?? []).filter(
    (promotion) => !isAlreadyApplied(promotion.promotion_id)
  );
  const autoPromotions = (offers?.autoAppliedPromotions ?? []).filter(
    (promotion) => !isAlreadyApplied(promotion.promotion_id)
  );
  const rawBestCoupon = offers?.bestCoupon ?? null;
  const bestCoupon =
    rawBestCoupon && !isAlreadyApplied(rawBestCoupon.promotion_id)
      ? rawBestCoupon
      : null;
  const isLoadingCartContext = cartQuery.isLoading || productsQuery.isLoading;
  const isLoadingOffers = isLoadingCartContext || offersQuery.isLoading || publicPromotionsQuery.isLoading;
  const hasCartContext = recommendationItems.length > 0;
  const hasApplicableOffers =
    eligiblePromotions.length > 0 ||
    stackablePromotions.length > 0 ||
    autoPromotions.length > 0 ||
    appliedPromotions.length > 0 ||
    Boolean(bestCoupon);
  const bestPromotionId = bestCoupon?.promotion_id;
  const visibleEligiblePromotions = eligiblePromotions.filter(
    (promotion) => promotion.promotion_id !== bestPromotionId
  );
  const contextualPromotionIds = new Set(
    [
      bestCoupon?.promotion_id,
      ...eligiblePromotions.map((promotion) => promotion.promotion_id),
      ...stackablePromotions.map((promotion) => promotion.promotion_id),
      ...autoPromotions.map((promotion) => promotion.promotion_id),
      ...appliedPromotions.map((promotion) => promotion.promotion_id),
    ].filter((id): id is number => typeof id === "number")
  );
  const contextualPromotionCodes = new Set(
    [
      bestCoupon?.code,
      ...eligiblePromotions.map((promotion) => promotion.code),
      ...stackablePromotions.map((promotion) => promotion.code),
      ...autoPromotions.map((promotion) => promotion.code),
    ]
      .filter((code): code is string => Boolean(code))
      .map((code) => code.toUpperCase())
  );
  const browsePromotions = publicPromotions.filter(
    (promotion) =>
      !personalPromotions.some((personalPromotion) => personalPromotion.id === promotion.id) &&
      !contextualPromotionIds.has(promotion.id) &&
      !(promotion.code && contextualPromotionCodes.has(promotion.code.toUpperCase()))
  );

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#26344f] via-[#3f4e6c] to-[#56627e] px-6 py-8 text-white shadow-[0_22px_60px_rgba(38,52,79,0.22)] sm:px-9 lg:px-12 lg:py-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[42px] border-[#fbbc05]/15" />
          <div className="pointer-events-none absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-[#fbbc05]/10 blur-2xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#ffd84d]">
                <Sparkles className="h-3.5 w-3.5" />
                Deals selected for you
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Make every cart more rewarding
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                Explore active offers, copy voucher codes in one click, and see exactly
                what each promotion saves before checkout.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Cart value</p>
                <p className="mt-1 text-lg font-extrabold">{formatCurrency(promotionCartData.total)}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Items</p>
                <p className="mt-1 text-lg font-extrabold">{recommendationItems.length}</p>
              </div>
              <Link
                to="/cart"
                className="inline-flex min-h-[58px] items-center gap-2 rounded-2xl bg-[#fbbc05] px-5 text-sm font-extrabold text-[#172033] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#ffd042]"
              >
                <ShoppingBag className="h-4 w-4" />
                View cart
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {isLoadingOffers ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-[#e2e5ec] bg-white p-5 text-sm font-semibold text-[#485470] shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#f0ae00]" />
            Finding the best promotions for your cart...
          </div>
        ) : (
          <div className="mt-9 space-y-10">
            {offersQuery.isError && hasCartContext && (
              <Notice
                tone="error"
                title="We could not check cart-specific promotions"
                text="Your other active promotions are still available below."
              />
            )}

            {!hasCartContext && (
              <Notice
                tone="info"
                title="Add products to unlock cart recommendations"
                text="You can browse active offers now. Add an item to see exact savings and eligibility."
              />
            )}

            {hasCartContext && !hasApplicableOffers && (
              <Notice
                tone="info"
                title="No promotion matches this cart yet"
                text="You can still browse the other active offers below."
              />
            )}

            {personalPromotions.length > 0 && (
              <section>
                <SectionHeading
                  icon={<Gift className="h-5 w-5" />}
                  title="Special for you"
                  subtitle="Personal and group offers selected for your account."
                  count={personalPromotions.length}
                />
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {personalPromotions.map((promotion) => (
                    <PublicPromotionCard
                      key={`personal-${publicPromotionKey(promotion)}`}
                      promotion={promotion}
                      canApply={hasCartContext}
                      copied={copiedCode === promotion.code}
                      onCopy={copyPromotionCode}
                      isApplying={
                        applyPromotionMutation.isPending &&
                        applyPromotionMutation.variables?.id === promotion.id
                      }
                      onApply={() => applyPromotionMutation.mutate(promotion)}
                      personal
                      disabledReason={ineligibleReasonById.get(promotion.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {(bestCoupon || appliedPromotions.length > 0) && (
              <div
                className={`grid items-start gap-9 ${
                  bestCoupon && appliedPromotions.length > 0
                    ? "lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]"
                    : ""
                }`}
              >
                {bestCoupon && (
                  <section>
                    <SectionHeading
                      icon={<Sparkles className="h-5 w-5" />}
                      title="Your best match"
                      subtitle="The strongest eligible saving for your current cart."
                      count={1}
                    />
                    <div className="mt-5 max-w-2xl">
                      <PromotionCard
                        promotion={bestCoupon}
                        badge="Recommended"
                        featured
                        copied={copiedCode === bestCoupon.code}
                        onCopy={copyPromotionCode}
                      />
                    </div>
                  </section>
                )}

                {appliedPromotions.length > 0 && (
                  <section>
                    <SectionHeading
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      title="Applied to your cart"
                      subtitle="Already included in your checkout total."
                      count={appliedPromotions.length}
                    />
                    <div className="mt-5 grid gap-5">
                      {appliedPromotions.map((promotion, index) => (
                        <AppliedPromotionCard
                          key={`${promotion.promotion_id || promotion.promotion_name}-${index}`}
                          promotion={promotion}
                          shippingSavings={promotionCartData.shipping_cost}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {visibleEligiblePromotions.length > 0 && (
              <section>
                <SectionHeading
                  icon={<TicketPercent className="h-5 w-5" />}
                  title="Ready to use"
                  subtitle="Eligible offers you can use with this cart."
                  count={visibleEligiblePromotions.length}
                />
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {visibleEligiblePromotions.map((promotion, index) => (
                    <PromotionCard
                      key={promotionKey(promotion, "eligible", index)}
                      promotion={promotion}
                      badge="Eligible"
                      copied={copiedCode === promotion.code}
                      onCopy={copyPromotionCode}
                    />
                  ))}
                </div>
              </section>
            )}

            {stackablePromotions.length > 0 && (
              <section>
                <SectionHeading
                  icon={<BadgePercent className="h-5 w-5" />}
                  title="More offers"
                  subtitle="Other offers available for your cart."
                  count={stackablePromotions.length}
                />
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {stackablePromotions.map((promotion, index) => (
                    <PromotionCard
                      key={promotionKey(promotion, "stackable", index)}
                      promotion={promotion}
                      badge="Offer"
                      copied={copiedCode === promotion.code}
                      onCopy={copyPromotionCode}
                    />
                  ))}
                </div>
              </section>
            )}

            {browsePromotions.length > 0 && (
              <section>
                <SectionHeading
                  icon={<Tag className="h-5 w-5" />}
                  title="More offers to explore"
                  subtitle="Browse active promotions and build a cart that qualifies."
                  count={browsePromotions.length}
                />
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {browsePromotions.map((promotion) => (
                    <PublicPromotionCard
                      key={publicPromotionKey(promotion)}
                      promotion={promotion}
                      canApply={hasCartContext}
                      copied={copiedCode === promotion.code}
                      onCopy={copyPromotionCode}
                      isApplying={
                        applyPromotionMutation.isPending &&
                        applyPromotionMutation.variables?.id === promotion.id
                      }
                      onApply={() => applyPromotionMutation.mutate(promotion)}
                      disabledReason={ineligibleReasonById.get(promotion.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {publicPromotions.length === 0 && !hasApplicableOffers && (
              <div className="rounded-3xl border border-[#e2e5ec] bg-white p-10 text-center shadow-sm">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff5cc] text-[#9a6b00]">
                  <TicketPercent className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-xl font-bold text-[#172033]">No promotions available</h2>
                <p className="mt-2 text-sm text-[#68748a]">Check back later for new rewards and seasonal offers.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

function Notice({ tone, title, text }: { tone: "info" | "error"; title: string; text: string }) {
  return (
    <div
      className={`flex gap-4 rounded-2xl border bg-white p-5 shadow-sm ${
        tone === "error" ? "border-red-200" : "border-[#dfe4ee]"
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          tone === "error" ? "bg-red-50 text-red-600" : "bg-[#fff5cc] text-[#9a6b00]"
        }`}
      >
        {tone === "error" ? <TicketPercent className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
      </span>
      <div>
        <h2 className={`text-base font-bold ${tone === "error" ? "text-red-600" : "text-[#172033]"}`}>
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#68748a]">{text}</p>
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff0ad] text-[#7a5700]">
        {icon}
      </span>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-extrabold text-[#172033] sm:text-2xl">{title}</h2>
          <span className="rounded-full bg-[#e9edf5] px-2.5 py-1 text-xs font-bold text-[#485470]">
            {count}
          </span>
        </div>
        <p className="mt-1 text-sm text-[#68748a]">{subtitle}</p>
      </div>
    </div>
  );
}

function offerIcon(type?: string, isFreeShipping?: boolean) {
  const normalizedType = (type || "").toUpperCase();
  if (isFreeShipping || normalizedType.includes("SHIPPING")) return <Truck className="h-6 w-6" />;
  if (normalizedType.includes("PERCENT")) return <Percent className="h-6 w-6" />;
  if (normalizedType.includes("FIXED") || normalizedType.includes("AMOUNT")) return <WalletCards className="h-6 w-6" />;
  return <Gift className="h-6 w-6" />;
}

function applicableBenefit(promotion: ApplicablePromotion) {
  if (promotion.is_free_shipping || promotion.type?.toUpperCase().includes("SHIPPING")) {
    return "FREE SHIPPING";
  }

  const type = `${promotion.type || ""} ${promotion.discount_type || ""} ${promotion.action?.type || ""}`.toLowerCase();
  const percentageDiscount = type.includes("percent");
  const configuredValue =
    promotion.discount_value ??
    (typeof promotion.action?.value === "number" ? promotion.action.value : undefined);
  const value = Number(
    percentageDiscount
      ? promotion.discountInfo?.discountPercentage ?? configuredValue ?? 0
      : promotion.discountInfo?.discountAmount ?? promotion.applied_discount ?? configuredValue ?? 0
  );
  if (value <= 0) return "SPECIAL OFFER";
  return percentageDiscount ? `${value}% OFF` : `${formatCurrency(value)} OFF`;
}

function publicBenefit(promotion: Promotion, discountValue: number, discountType: string) {
  if (promotion.type?.toUpperCase().includes("SHIPPING")) return "FREE SHIPPING";
  if (discountValue <= 0) return "SPECIAL OFFER";
  const type = `${promotion.type || ""} ${discountType}`.toLowerCase();
  return type.includes("percent")
    ? `${discountValue}% OFF`
    : `${formatCurrency(discountValue)} OFF`;
}

function CodePanel({
  code,
  copied,
  onCopy,
  disabled = false,
}: {
  code: string;
  copied: boolean;
  onCopy: (code: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-dashed border-[#cbd2df] bg-[#f7f8fb] p-2">
      <span className="min-w-0 flex-1 break-all px-2 font-mono text-xs font-extrabold tracking-[0.04em] text-[#26344f]">
        {code}
      </span>
      <button
        type="button"
        onClick={() => onCopy(code)}
        disabled={disabled}
        aria-label={`Copy voucher code ${code}`}
        className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-extrabold transition ${
          disabled
            ? "cursor-not-allowed bg-[#d9dde6] text-[#7b8496]"
            : copied
            ? "bg-emerald-100 text-emerald-700"
            : "bg-[#26344f] text-white hover:bg-[#364765]"
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function PromotionCard({
  promotion,
  badge,
  featured = false,
  copied,
  onCopy,
}: {
  promotion: ApplicablePromotion;
  badge: string;
  featured?: boolean;
  copied: boolean;
  onCopy: (code: string) => void;
}) {
  const discountAmount = promotion.discountInfo?.discountAmount ?? promotion.applied_discount;
  const validity = formatDate(promotion.end_date, promotion.timezone);
  const isFreeShipping =
    promotion.is_free_shipping || promotion.type?.toUpperCase().includes("SHIPPING");

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-3xl border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(38,52,79,0.16)] ${
        featured ? "border-[#fbbc05]/70 shadow-[0_18px_45px_rgba(251,188,5,0.16)]" : "border-[#e0e4ec] shadow-sm"
      }`}
    >
      <div
        className={`relative overflow-hidden text-white ${
          featured ? "px-5 py-4" : "px-5 py-5"
        } ${
          featured
            ? "bg-gradient-to-br from-[#7b4bb3] via-[#8f4da6] to-[#d46287]"
            : isFreeShipping
              ? "bg-gradient-to-br from-[#177a71] to-[#26a497]"
              : "bg-gradient-to-br from-[#344461] to-[#53617e]"
        }`}
      >
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/10" />
        <div className="relative flex items-start justify-between gap-3">
          <span
            className={`grid place-items-center rounded-2xl bg-white/15 ${
              featured ? "h-10 w-10" : "h-11 w-11"
            }`}
          >
            {offerIcon(promotion.type, isFreeShipping)}
          </span>
          <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em]">
            {badge}
          </span>
        </div>
        <p
          className={`relative font-black tracking-tight ${
            featured ? "mt-3 text-xl" : "mt-5 text-2xl"
          }`}
        >
          {applicableBenefit(promotion)}
        </p>
      </div>

      <div className={`flex flex-1 flex-col ${featured ? "p-4" : "p-5"}`}>
        <h3 className={`${featured ? "text-base" : "text-lg"} font-extrabold leading-6 text-[#172033]`}>
          {promotion.name}
        </h3>
        {promotion.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#68748a]">{promotion.description}</p>
        )}

        {promotion.code && (
          <div className={featured ? "mt-3" : "mt-4"}>
            <CodePanel code={promotion.code} copied={copied} onCopy={onCopy} />
          </div>
        )}

        <div
          className={`mt-auto grid gap-2 border-t border-[#edf0f5] text-sm ${
            featured ? "pt-3" : "pt-4"
          }`}
        >
          {Number(discountAmount || 0) > 0 && (
            <PromotionMeta label="You save" value={formatCurrency(discountAmount)} highlight />
          )}
        {promotion.discountInfo?.discountedTotal !== undefined && (
          <PromotionMeta label="Cart total after offer" value={formatCurrency(promotion.discountInfo.discountedTotal)} />
        )}
          {validity && <PromotionMeta label="Valid until" value={validity} icon={<CalendarDays className="h-3.5 w-3.5" />} />}
        </div>

        {promotion.code && (
          <Link
            to="/cart"
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#fbbc05] px-4 text-sm font-extrabold text-[#172033] transition hover:bg-[#ffd042] ${
              featured ? "mt-3" : "mt-4"
            }`}
          >
            Use in cart
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}

function AppliedPromotionCard({
  promotion,
  shippingSavings,
}: {
  promotion: AppliedPromotion;
  shippingSavings: number;
}) {
  const title = promotion.promotion_name || "Applied promotion";
  const type = promotion.promotion_type || (promotion.is_free_shipping ? "FREE_SHIPPING" : "");
  const isFreeShipping = promotion.is_free_shipping || type.toUpperCase().includes("SHIPPING");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-4 text-white">
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em]">
          <BadgeCheck className="h-5 w-5" />
          Applied
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
          {offerIcon(type, isFreeShipping)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold text-[#172033]">{title}</h3>
        <p className="mt-2 text-sm text-[#68748a]">
          {isFreeShipping
            ? shippingSavings > 0
              ? `${formatCurrency(shippingSavings)} delivery charge removed from this order.`
              : "Delivery is free for this order."
            : "Discount included in your checkout total."}
        </p>
        <div className="mt-auto border-t border-emerald-100 pt-4">
          {isFreeShipping ? (
            <PromotionMeta
              label={shippingSavings > 0 ? "Shipping saved" : "Benefit"}
              value={shippingSavings > 0 ? formatCurrency(shippingSavings) : "Free shipping"}
              highlight
            />
          ) : (
            <PromotionMeta label="You saved" value={formatCurrency(promotion.discount_amount)} highlight />
          )}
        </div>
      </div>
    </article>
  );
}

function PublicPromotionCard({
  promotion,
  canApply,
  copied,
  onCopy,
  isApplying,
  onApply,
  personal = false,
  disabledReason,
}: {
  promotion: Promotion;
  canApply: boolean;
  copied: boolean;
  onCopy: (code: string) => void;
  isApplying: boolean;
  onApply: () => void;
  personal?: boolean;
  disabledReason?: string;
}) {
  const validity = formatDate(promotion.end_date, promotion.timezone);
  const discountValue = Number(
    typeof promotion.action?.value === "number"
      ? promotion.action.value
      : promotion.discount_value || 0
  );
  const discountType = promotion.action?.type || promotion.discount_type || "";
  const minimumCartCondition = promotion.conditions?.find(
    (condition) =>
      (condition.attribute || condition.field) === "cart.total_value" &&
      condition.operator === "GTE"
  );
  const minimumCart = Number(
    minimumCartCondition?.value ||
      promotion.action?.min_order_value ||
      promotion.action?.minimum_order_value ||
      0
  );
  const isAutomatic = promotion.application_mode === "automatic";
  const isCodeEntry = promotion.application_mode === "code_entry";
  const isClickToApply = promotion.application_mode === "click_to_apply";
  const isFreeShipping = promotion.type?.toUpperCase().includes("SHIPPING");
  const modeLabel = isAutomatic ? "Auto apply" : isCodeEntry ? "Voucher code" : "Tap to apply";
  const usageLimit = promotion.customer_usage?.limit ?? null;
  const remainingUses = promotion.customer_usage?.remaining ?? null;
  const audienceLabel =
    promotion.audience === "customer_group"
      ? `${promotion.customer_group?.name || "Customer group"} member offer`
      : "Personal offer";

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-[#e0e4ec] bg-white shadow-sm transition duration-300 ${disabledReason ? "opacity-65" : "hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(38,52,79,0.14)]"}`}>
      <div
        className={`relative overflow-hidden px-5 py-5 text-white ${
          isFreeShipping
            ? "bg-gradient-to-br from-[#177a71] to-[#26a497]"
            : isCodeEntry
              ? "bg-gradient-to-br from-[#b16a00] to-[#df9a13]"
              : isAutomatic
                ? "bg-gradient-to-br from-[#365985] to-[#4d79a8]"
                : "bg-gradient-to-br from-[#76459a] to-[#a45d9c]"
        }`}
      >
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/10" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
            {isAutomatic ? <Zap className="h-6 w-6" /> : offerIcon(promotion.type, isFreeShipping)}
          </span>
          <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em]">
            {modeLabel}
          </span>
        </div>
        <p className="relative mt-5 text-2xl font-black tracking-tight">
          {publicBenefit(promotion, discountValue, discountType)}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {personal && (
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#7b4bb3]">
            {audienceLabel}
          </p>
        )}
        <h3 className="text-lg font-extrabold leading-6 text-[#172033]">{promotion.name}</h3>
        {promotion.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#68748a]">{promotion.description}</p>
        )}

        {isCodeEntry && promotion.code && (
          <div className="mt-4">
            <CodePanel
              code={promotion.code}
              copied={copied}
              onCopy={onCopy}
              disabled={Boolean(disabledReason)}
            />
          </div>
        )}

        {disabledReason && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold leading-5 text-amber-800">
            {disabledReason}
          </div>
        )}

        <div className="mt-auto grid gap-2 border-t border-[#edf0f5] pt-4 text-sm">
          {personal && usageLimit !== null && (
            <PromotionMeta
              label="Order benefit"
              value={`Next ${usageLimit} eligible ${usageLimit === 1 ? "order" : "orders"}`}
            />
          )}
          {personal && remainingUses !== null && (
            <PromotionMeta
              label="Remaining"
              value={`${remainingUses} ${remainingUses === 1 ? "use" : "uses"}`}
              highlight={remainingUses > 0}
            />
          )}
          {minimumCart > 0 && <PromotionMeta label="Minimum cart" value={formatCurrency(minimumCart)} />}
          {validity && <PromotionMeta label="Valid until" value={validity} icon={<CalendarDays className="h-3.5 w-3.5" />} />}
        </div>

        {disabledReason && (
          <button
            type="button"
            disabled
            className="mt-4 min-h-10 w-full cursor-not-allowed rounded-xl bg-[#e1e4ea] px-4 text-sm font-extrabold text-[#7b8496]"
          >
            Not eligible
          </button>
        )}
        {!disabledReason && isClickToApply && canApply && (
          <Button
            className="mt-4 w-full rounded-xl"
            disabled={isApplying}
            onClick={onApply}
          >
            {isApplying ? "Applying..." : "Apply to cart"}
          </Button>
        )}
        {!disabledReason && isClickToApply && !canApply && (
          <Link
            to="/"
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#fbbc05] px-4 text-sm font-extrabold text-[#172033] transition hover:bg-[#ffd042]"
          >
            <ShoppingBag className="h-4 w-4" />
            Add items to apply
          </Link>
        )}
        {!disabledReason && isCodeEntry && canApply && (
          <Link
            to="/cart"
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#fbbc05] px-4 text-sm font-extrabold text-[#172033] transition hover:bg-[#ffd042]"
          >
            Continue to cart
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        {!disabledReason && isCodeEntry && !canApply && (
          <Link
            to="/"
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#fbbc05] px-4 text-sm font-extrabold text-[#172033] transition hover:bg-[#ffd042]"
          >
            <ShoppingBag className="h-4 w-4" />
            Add items to redeem
          </Link>
        )}
        {!disabledReason && isAutomatic && canApply && (
          <div className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#edf4ff] px-4 text-sm font-bold text-[#365985]">
            <Zap className="h-4 w-4" />
            Checked automatically
          </div>
        )}
        {!disabledReason && isAutomatic && !canApply && (
          <Link
            to="/"
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#edf4ff] px-4 text-sm font-bold text-[#365985] transition hover:bg-[#e2ecfb]"
          >
            <ShoppingBag className="h-4 w-4" />
            Add items to qualify
          </Link>
        )}
      </div>
    </article>
  );
}

function PromotionMeta({
  label,
  value,
  highlight = false,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-1.5 text-[#68748a]">
        {icon}
        {label}
      </span>
      <span className={`text-right font-extrabold ${highlight ? "text-emerald-600" : "text-[#172033]"}`}>
        {value}
      </span>
    </div>
  );
}

export default Promotions;

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, CheckCircle2, Loader2, ShoppingBag, Sparkles, Tag, TicketPercent, UserRound } from "lucide-react";
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

const formatCurrency = (value?: number | null) => `Rs. ${Math.max(Number(value || 0), 0).toLocaleString("en-IN")}`;

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
  const products = productsQuery.data?.data ?? [];
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
      await promotionService.evaluateAutomatic({
        userId: String(userId),
        cartItems: promotionEvaluationItems,
        currentTotal: promotionCartData.total,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });
      return promotionService.evaluate({
        cartId: `cart-${userId}`,
        userId: String(userId),
        promotionId: promotion.id,
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
  const eligiblePromotions = offers?.eligibleCoupons ?? [];
  const stackablePromotions = offers?.stackablePromotions ?? [];
  const autoPromotions = offers?.autoAppliedPromotions ?? [];
  const appliedPromotions = offers?.currentEvaluation?.applied_promotions ?? [];
  const bestCoupon = offers?.bestCoupon ?? null;
  const isLoadingCartContext = cartQuery.isLoading || productsQuery.isLoading;
  const isLoadingOffers = isLoadingCartContext || offersQuery.isLoading || publicPromotionsQuery.isLoading;
  const hasCartContext = recommendationItems.length > 0;
  const hasApplicableOffers =
    eligiblePromotions.length > 0 ||
    stackablePromotions.length > 0 ||
    autoPromotions.length > 0 ||
    appliedPromotions.length > 0 ||
    Boolean(bestCoupon);

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Account</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">Promotions</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
              Applicable offers are checked against the products currently in your cart.
            </p>
          </div>
          <Link to="/cart" className="inline-flex">
            <Button variant="secondary" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              View Cart
            </Button>
          </Link>
        </div>

        {isLoadingOffers ? (
          <div className="mt-8 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 text-sm font-semibold text-[var(--color-secondary)] shadow-[var(--shadow-card)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking available promotions
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {offersQuery.isError && hasCartContext && (
              <Notice
                tone="error"
                title="Could not check cart-specific promotions"
                text="Your active logged-in promotions are still shown below."
              />
            )}

            {!hasCartContext && (
              <Notice
                tone="info"
                title="Add products to see applicable promotions"
                text="Your cart is empty, so we cannot evaluate eligibility yet."
              />
            )}

            {hasCartContext && !hasApplicableOffers && (
              <Notice
                tone="info"
                title="No applicable promotions for this cart"
                text="You can still browse public active promotions below."
              />
            )}

            {bestCoupon && (
              <section>
                <SectionHeading icon={<Sparkles className="h-5 w-5" />} title="Best Match" />
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <PromotionCard promotion={bestCoupon} badge="Recommended" />
                </div>
              </section>
            )}

            {appliedPromotions.length > 0 && (
              <section>
                <SectionHeading icon={<CheckCircle2 className="h-5 w-5" />} title="Already Applied" />
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {appliedPromotions.map((promotion, index) => (
                    <AppliedPromotionCard key={`${promotion.promotion_id || promotion.promotion_name}-${index}`} promotion={promotion} />
                  ))}
                </div>
              </section>
            )}

            {eligiblePromotions.length > 0 && (
              <section>
                <SectionHeading icon={<TicketPercent className="h-5 w-5" />} title="Applicable Coupons" />
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {eligiblePromotions.map((promotion, index) => (
                    <PromotionCard key={promotionKey(promotion, "eligible", index)} promotion={promotion} badge="Applicable" />
                  ))}
                </div>
              </section>
            )}

            {stackablePromotions.length > 0 && (
              <section>
                <SectionHeading icon={<BadgePercent className="h-5 w-5" />} title="Extra Benefits" />
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {stackablePromotions.map((promotion, index) => (
                    <PromotionCard key={promotionKey(promotion, "stackable", index)} promotion={promotion} badge="Stackable" />
                  ))}
                </div>
              </section>
            )}

            {autoPromotions.length > 0 && (
              <section>
                <SectionHeading icon={<Sparkles className="h-5 w-5" />} title="Automatic Offers" />
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {autoPromotions.map((promotion, index) => (
                    <PromotionCard key={promotionKey(promotion, "auto", index)} promotion={promotion} badge="Auto Apply" />
                  ))}
                </div>
              </section>
            )}

            {publicPromotions.length > 0 && (
              <section>
                <SectionHeading icon={<Tag className="h-5 w-5" />} title="Available Promotions" />
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {publicPromotions.map((promotion) => (
                    <PublicPromotionCard
                      key={publicPromotionKey(promotion)}
                      promotion={promotion}
                      canApply={hasCartContext}
                      isApplying={
                        applyPromotionMutation.isPending &&
                        applyPromotionMutation.variables?.id === promotion.id
                      }
                      onApply={() => applyPromotionMutation.mutate(promotion)}
                    />
                  ))}
                </div>
              </section>
            )}

            {publicPromotions.length === 0 && !hasApplicableOffers && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
                <TicketPercent className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
                <h2 className="mt-4 text-xl font-bold text-[var(--color-text)]">No promotions available</h2>
                <p className="mt-2 text-sm text-[var(--color-muted)]">Check back later for new offers.</p>
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
      className={`rounded-[var(--radius-md)] border bg-white p-5 shadow-[var(--shadow-card)] ${
        tone === "error" ? "border-red-200" : "border-[var(--color-border)]"
      }`}
    >
      <h2 className={`text-base font-bold ${tone === "error" ? "text-red-600" : "text-[var(--color-text)]"}`}>
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{text}</p>
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-primary)]/30 text-[var(--color-secondary)]">
        {icon}
      </span>
      <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
    </div>
  );
}

function PromotionCard({ promotion, badge }: { promotion: ApplicablePromotion; badge: string }) {
  const discountAmount = promotion.discountInfo?.discountAmount ?? promotion.applied_discount;
  const validity = formatDate(promotion.end_date, promotion.timezone);

  return (
    <article className="flex min-h-60 flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-primary)]/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-secondary)]">
          {badge}
        </span>
        {promotion.code && (
          <span className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-xs font-bold text-[var(--color-text)]">
            {promotion.code}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-bold text-[var(--color-text)]">{promotion.name}</h3>
      {promotion.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-muted)]">{promotion.description}</p>}
      <div className="mt-auto space-y-2 pt-5 text-sm">
        {Number(discountAmount || 0) > 0 && <PromotionMeta label="Savings" value={formatCurrency(discountAmount)} />}
        {promotion.discountInfo?.discountedTotal !== undefined && (
          <PromotionMeta label="Cart total after offer" value={formatCurrency(promotion.discountInfo.discountedTotal)} />
        )}
        {validity && <PromotionMeta label="Valid until" value={validity} />}
      </div>
    </article>
  );
}

function AppliedPromotionCard({ promotion }: { promotion: AppliedPromotion }) {
  const title = promotion.promotion_name || "Applied promotion";
  const type = promotion.promotion_type || (promotion.is_free_shipping ? "FREE_SHIPPING" : "");

  return (
    <article className="flex min-h-48 flex-col rounded-[var(--radius-md)] border border-green-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <span className="inline-flex w-fit items-center gap-2 rounded-[var(--radius-sm)] bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Applied
      </span>
      <h3 className="mt-4 text-lg font-bold text-[var(--color-text)]">{title}</h3>
      {type && <p className="mt-2 text-sm text-[var(--color-muted)]">{type.replaceAll("_", " ")}</p>}
      <div className="mt-auto pt-5">
        {promotion.is_free_shipping ? (
          <PromotionMeta label="Benefit" value="Free shipping" />
        ) : (
          <PromotionMeta label="Savings" value={formatCurrency(promotion.discount_amount)} />
        )}
      </div>
    </article>
  );
}

function PublicPromotionCard({
  promotion,
  canApply,
  isApplying,
  onApply,
}: {
  promotion: Promotion;
  canApply: boolean;
  isApplying: boolean;
  onApply: () => void;
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

  return (
    <article className="flex min-h-56 flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-secondary)]">
          {promotion.application_mode === "automatic"
            ? "Auto Apply"
            : promotion.application_mode === "code_entry"
              ? "Voucher Code"
              : "Tap to Apply"}
        </span>
        {promotion.code && (
          <span className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-xs font-bold text-[var(--color-text)]">
            {promotion.code}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-bold text-[var(--color-text)]">{promotion.name}</h3>
      {promotion.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-muted)]">{promotion.description}</p>}
      <div className="mt-auto space-y-2 pt-5 text-sm">
        {discountValue > 0 && (
          <PromotionMeta
            label="Value"
            value={discountType.toLowerCase().includes("percent") ? `${discountValue}%` : formatCurrency(discountValue)}
          />
        )}
        {minimumCart > 0 && (
          <PromotionMeta label="Minimum cart" value={formatCurrency(minimumCart)} />
        )}
        {validity && <PromotionMeta label="Valid until" value={validity} />}
        {promotion.application_mode === "click_to_apply" && (
          <Button
            className="mt-3 w-full"
            disabled={!canApply || isApplying}
            onClick={onApply}
          >
            {isApplying ? "Applying..." : canApply ? "Apply to cart" : "Add items to apply"}
          </Button>
        )}
        {promotion.application_mode === "code_entry" && (
          <Link to="/cart" className="mt-3 block">
            <Button variant="secondary" className="w-full">
              Use code in cart
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}

function PromotionMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="text-right font-bold text-[var(--color-text)]">{value}</span>
    </div>
  );
}

export default Promotions;

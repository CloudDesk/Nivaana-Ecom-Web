import type { AppliedPromotion, ApplicablePromotion, PromotionV2Quote } from "../services/promotionService";
import type { Product } from "../types";

const SELECTED_PROMOTION_KEY = "nivaana_selected_cart_promotion";
const STANDARD_SHIPPING_FEE = 150;

export interface PromotionCartRow {
  cartRecordId?: number | string;
  productid: number;
  quantity: number;
  product?: Product;
}

export interface PromotionCartData {
  items: Array<{
    product_id: string;
    quantity: number;
    base_price: number;
    product_discount: number;
    price: number;
    category: string;
    subcategory?: string;
    name: string;
  }>;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total: number;
}

export interface CartPromotionTotals {
  mrpTotal: number;
  subtotal: number;
  productDiscount: number;
  shipping: number;
  total: number;
}

export interface SelectedCartPromotion {
  userId: number;
  /** Manual selections retained for V2 stacking. `promotionId` remains for legacy saved carts. */
  promotionIds?: number[];
  promotionId: number;
  promotionName: string;
  evaluationId: string;
  cartSignature: string;
  totalDiscount: number;
  discountedTotal: number;
  appliedPromotions: AppliedPromotion[];
  expiresAt?: string;
  savedAt: number;
  engine?: "legacy" | "v2";
}

export interface PromotionDiscountSummary {
  normalPromotions: AppliedPromotion[];
  freeShippingPromotions: AppliedPromotion[];
  normalDiscount: number;
  freeShippingApplied: boolean;
  effectiveShipping: number;
  shippingSavings: number;
  payableTotal: number;
}

export type PromotionEvaluationCartItem = PromotionCartData["items"][number] & {
  cart_record_id: string;
};

type FreeShippingPromotionLike = {
  promotion_id?: number | null;
  type?: string | null;
  name?: string | null;
  description?: string | null;
  promotion_name?: string | null;
  promotion_type?: string | null;
  is_free_shipping?: boolean;
  is_shipping_discount?: boolean;
  action?: Record<string, unknown> | null;
  actions?: Array<Record<string, unknown>> | null;
  conditions?: Array<Record<string, unknown>> | null;
  shipping_info?: Record<string, unknown> | null;
  min_order_value?: unknown;
  minimum_order_value?: unknown;
};

export const productUnitPrice = (product?: Product) =>
  product ? Math.max(Number(product.price || 0) - Number(product.discount || 0), 0) : 0;

export const getPromotionCartTotals = (rows: PromotionCartRow[]): CartPromotionTotals => {
  const mrpTotal = rows.reduce((sum, row) => sum + Number(row.product?.price || 0) * row.quantity, 0);
  const subtotal = rows.reduce((sum, row) => sum + productUnitPrice(row.product) * row.quantity, 0);
  const productDiscount = rows.reduce((sum, row) => sum + Number(row.product?.discount || 0) * row.quantity, 0);
  // Shipping is waived by an eligible free-shipping promotion. Keeping the
  // baseline charge here lets the UI and order total show the real saving.
  const shipping = subtotal > 0 ? STANDARD_SHIPPING_FEE : 0;

  return {
    mrpTotal,
    subtotal,
    productDiscount,
    shipping,
    total: subtotal + shipping,
  };
};

export const buildPromotionCartData = (rows: PromotionCartRow[]): PromotionCartData => {
  const totals = getPromotionCartTotals(rows);

  return {
    items: rows.map((row) => ({
      product_id: String(row.productid),
      quantity: row.quantity,
      base_price: Number(row.product?.price || 0),
      product_discount: Number(row.product?.discount || 0),
      price: productUnitPrice(row.product),
      category: row.product?.category || row.product?.subcategory || "General",
      subcategory: row.product?.subcategory || undefined,
      name: row.product?.name || `Product ${row.productid}`,
    })),
    subtotal: totals.subtotal,
    shipping_cost: totals.shipping,
    tax_amount: 0,
    total: totals.total,
  };
};

export const buildPromotionEvaluationCartItems = (rows: PromotionCartRow[]): PromotionEvaluationCartItem[] =>
  rows.map((row) => ({
    cart_record_id: String(row.cartRecordId ?? row.productid),
    product_id: String(row.productid),
    quantity: row.quantity,
    base_price: Number(row.product?.price || 0),
    product_discount: Number(row.product?.discount || 0),
    price: productUnitPrice(row.product),
    category: row.product?.category || row.product?.subcategory || "General",
    subcategory: row.product?.subcategory || "",
    name: row.product?.name || `Product ${row.productid}`,
  }));

export const cartPromotionSignature = (rows: PromotionCartRow[]) =>
  rows
    .map((row) => ({
      productid: row.productid,
      quantity: row.quantity,
      price: Number(row.product?.price || 0),
      discount: Number(row.product?.discount || 0),
    }))
    .sort((left, right) => left.productid - right.productid)
    .map((row) => `${row.productid}:${row.quantity}:${row.price}:${row.discount}`)
    .join("|");

export const isFreeShippingAppliedPromotion = (promotion?: AppliedPromotion | null) =>
  isFreeShippingPromotion(promotion);

export const isFreeShippingPromotion = (promotion?: FreeShippingPromotionLike | null) => {
  if (!promotion) return false;

  const normalizedType = String(promotion.type ?? promotion.promotion_type ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const actionTypes = [
    promotion.action?.type,
    ...(promotion.actions ?? []).map((action) => action?.type),
  ]
    .filter(Boolean)
    .map((type) => String(type).trim().toUpperCase().replace(/[\s-]+/g, "_"));

  return Boolean(
    promotion.is_free_shipping ||
      promotion.is_shipping_discount ||
      promotion.shipping_info ||
      normalizedType === "FREE_SHIPPING" ||
      actionTypes.includes("FREE_SHIPPING")
  );
};

const numericPromotionValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const freeShippingMinimumOrderValue = (
  promotion?: FreeShippingPromotionLike | null
) => {
  const action = promotion?.action;
  const actions = promotion?.actions ?? [];
  const shippingInfo = promotion?.shipping_info;
  const conditionMinimums =
    promotion?.conditions
      ?.filter((condition) => {
        const attribute = String(condition.attribute ?? condition.field ?? "").toLowerCase();
        const operator = String(condition.operator ?? "").toUpperCase();
        return (
          /cart|order|subtotal|total/.test(attribute) &&
          /total|value|amount|subtotal/.test(attribute) &&
          ["GTE", "GT", ">=", ">"].includes(operator)
        );
      })
      .map((condition) => numericPromotionValue(condition.value))
      .filter((value) => value > 0) ?? [];
  const textMinimums = [promotion?.name, promotion?.promotion_name, promotion?.description]
    .map((value) => {
      const match = String(value ?? "").match(/(?:₹|rs\.?\s*)\s*([0-9][0-9,]*)|([0-9][0-9,]*)\s*(?:₹|rs\.?)/i);
      return numericPromotionValue(match?.[1] ?? match?.[2]);
    })
    .filter((value) => value > 0);

  return Math.max(
    numericPromotionValue(action?.min_order_value),
    numericPromotionValue(action?.minimum_order_value),
    ...actions.flatMap((item) => [
      numericPromotionValue(item?.min_order_value),
      numericPromotionValue(item?.minimum_order_value),
    ]),
    numericPromotionValue(promotion?.min_order_value),
    numericPromotionValue(promotion?.minimum_order_value),
    ...conditionMinimums,
    numericPromotionValue(shippingInfo?.min_order_value),
    numericPromotionValue(shippingInfo?.minimum_order_value),
    ...textMinimums
  );
};

export const isFreeShippingPromotionEligible = (
  promotion: FreeShippingPromotionLike | null | undefined,
  qualifyingCartValue: number
) => {
  const minimumOrderValue = freeShippingMinimumOrderValue(promotion);
  return minimumOrderValue <= 0 || qualifyingCartValue >= minimumOrderValue;
};

export const getAppliedPromotionSummary = (
  totals: CartPromotionTotals,
  appliedPromotions: AppliedPromotion[],
  fallbackDiscount = 0
): PromotionDiscountSummary => {
  const freeShippingPromotions = appliedPromotions.filter(
    // Shipping is never part of promotion qualification. Otherwise the
    // delivery fee could unlock the same promotion that removes that fee.
    (promotion) => isFreeShippingAppliedPromotion(promotion) && isFreeShippingPromotionEligible(promotion, totals.subtotal)
  );
  const normalPromotions = appliedPromotions.filter((promotion) => !isFreeShippingAppliedPromotion(promotion));
  const normalDiscountFromPromotions = normalPromotions.reduce(
    (sum, promotion) => sum + Number(promotion.discount_amount || 0),
    0
  );
  const normalDiscount = Math.min(
    Math.max(normalDiscountFromPromotions || fallbackDiscount || 0, 0),
    totals.subtotal
  );
  const freeShippingApplied = freeShippingPromotions.length > 0;
  const effectiveShipping = freeShippingApplied ? 0 : totals.shipping;
  const shippingSavings = Math.max(totals.shipping - effectiveShipping, 0);

  return {
    normalPromotions,
    freeShippingPromotions,
    normalDiscount,
    freeShippingApplied,
    effectiveShipping,
    shippingSavings,
    payableTotal: Math.max(totals.subtotal + effectiveShipping - normalDiscount, 0),
  };
};

export const readSelectedCartPromotion = (userId?: number | null): SelectedCartPromotion | null => {
  if (!userId) return null;

  try {
    const rawValue = localStorage.getItem(`${SELECTED_PROMOTION_KEY}:${userId}`);
    if (!rawValue) return null;

    const promotion = JSON.parse(rawValue) as SelectedCartPromotion;
    if (promotion.userId !== userId || !promotion.promotionId) return null;
    return {
      ...promotion,
      promotionIds: selectedCartPromotionIds(promotion),
    };
  } catch {
    return null;
  }
};

export const selectedCartPromotionIds = (
  promotion?: Pick<SelectedCartPromotion, "promotionId" | "promotionIds"> | null,
) => [...new Set([
  ...(promotion?.promotionIds ?? []),
  promotion?.promotionId,
].map(Number).filter((id) => Number.isFinite(id) && id > 0))];

export const promotionSelectionKey = (promotionIds: number[]) =>
  [...new Set(promotionIds)]
    .filter((id) => Number.isFinite(id) && id > 0)
    .sort((left, right) => left - right)
    .join(",") || "automatic";

export const isRecoverablePromotionEvaluationError = (error: unknown) => {
  const candidate = error as {
    message?: string;
    statusCode?: number;
    data?: { message?: string; details?: string; code?: string; error_code?: string };
  };
  const code = String(candidate?.data?.code ?? candidate?.data?.error_code ?? "").toUpperCase();
  const message = [candidate?.message, candidate?.data?.message, candidate?.data?.details]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    code === "PROMOTION_EVALUATION_EXPIRED" ||
    code === "PROMOTION_EVALUATION_INACTIVE" ||
    message.includes("promotion evaluation has expired") ||
    message.includes("promotion evaluation is no longer active") ||
    message.includes("evaluation not found") ||
    message.includes("requested record does not exist")
  );
};

export const saveSelectedCartPromotion = (promotion: SelectedCartPromotion) => {
  localStorage.setItem(`${SELECTED_PROMOTION_KEY}:${promotion.userId}`, JSON.stringify(promotion));
};

export const clearSelectedCartPromotion = (userId?: number | null) => {
  if (!userId) return;
  localStorage.removeItem(`${SELECTED_PROMOTION_KEY}:${userId}`);
};

// ---------------------------------------------------------------------------
// Shared offer rules for Cart and Checkout. Both pages must use these helpers
// so the offer buttons and messages behave identically.
// ---------------------------------------------------------------------------

type OfferModeLike = Pick<ApplicablePromotion, "application_mode" | "auto_apply">;
type StackingLike = { stackable?: boolean | null; is_stacked?: boolean | null };

export const isAutomaticOffer = (promotion?: OfferModeLike | null) =>
  promotion?.application_mode === "automatic" || promotion?.auto_apply === true;

export const isCodeEntryOffer = (promotion?: OfferModeLike | null) =>
  promotion?.application_mode === "code_entry";

/**
 * Whether an applied promotion is stackable. Live offer details win; the saved
 * selection is only a fallback because older saved copies can miss the flag.
 */
export const resolveAppliedStackable = (details?: StackingLike | null, saved?: StackingLike | null) =>
  details?.stackable === true || saved?.stackable === true || saved?.is_stacked === true;

/** Keeps stackable/is_stacked when an applied list is rebuilt (for example after Remove). */
export const preserveAppliedStacking = (
  appliedPromotions: AppliedPromotion[],
  previousPromotions: AppliedPromotion[],
  detailsById?: Map<number, StackingLike>,
): AppliedPromotion[] =>
  appliedPromotions.map((promotion) => {
    const id = Number(promotion.promotion_id || 0);
    const previous = previousPromotions.find((item) => Number(item.promotion_id || 0) === id);
    const stackable = resolveAppliedStackable(detailsById?.get(id), previous);
    return { ...promotion, stackable, is_stacked: stackable };
  });

export type OfferActionKind = "already-used" | "remove" | "applied" | "automatic" | "use-code" | "apply";
export type OfferActionState = { kind: OfferActionKind; disabled: boolean; busy: boolean };

/**
 * Button for one offer card. Combination is never decided here: the V2 engine
 * keeps whichever set saves the customer more, and the result is explained in
 * a message.
 * - disabled: a real blocker; the button is greyed out.
 * - busy: another offer action or a price re-check is running; the button keeps
 *   its look but ignores clicks, so the list does not flash grey.
 */
export const getOfferActionState = ({
  promotion,
  isApplied,
  canRemove,
  isAlreadyUsed,
  isLoggedIn,
  freeShippingEligible,
  anyOfferActionPending,
  pricingResolving = false,
}: {
  promotion: ApplicablePromotion;
  isApplied: boolean;
  canRemove: boolean;
  isAlreadyUsed: boolean;
  isLoggedIn: boolean;
  freeShippingEligible: boolean;
  anyOfferActionPending: boolean;
  pricingResolving?: boolean;
}): OfferActionState => {
  const busy = anyOfferActionPending || pricingResolving;
  if (isAlreadyUsed) return { kind: "already-used", disabled: true, busy: false };
  if (isApplied) {
    return canRemove
      ? { kind: "remove", disabled: false, busy }
      : { kind: "applied", disabled: true, busy: false };
  }
  if (isAutomaticOffer(promotion)) return { kind: "automatic", disabled: true, busy: false };
  if (isCodeEntryOffer(promotion)) return { kind: "use-code", disabled: true, busy: false };
  return { kind: "apply", disabled: !isLoggedIn || !freeShippingEligible, busy };
};

/** Label while this card's own action runs; follows the action, not the card state. */
export const offerPendingLabel = (action: "apply" | "remove") =>
  action === "apply" ? "Applying..." : "Removing...";

/**
 * Apply/Remove already return the new quote. Seeding it under the new
 * selection key and marking it fresh for a short time avoids an immediate
 * second request (which made the offer buttons flash grey).
 */
export const SEEDED_QUOTE_FRESH_MS = 15_000;
export const createSeededQuoteTracker = () => {
  const seededAt = new Map<string, number>();
  return {
    mark: (queryHash: string) => {
      seededAt.set(queryHash, Date.now());
    },
    staleTime: (queryHash: string) => {
      const at = seededAt.get(queryHash);
      return at !== undefined && Date.now() - at < SEEDED_QUOTE_FRESH_MS ? SEEDED_QUOTE_FRESH_MS : 0;
    },
  };
};

/** Note shown on offers that cannot be combined with other offers. */
export const offerCombinationNote = (promotion: ApplicablePromotion) =>
  !isAutomaticOffer(promotion) && !isFreeShippingPromotion(promotion) && promotion.stackable !== true
    ? "Can't be combined with other offers. We'll keep whichever saves you more."
    : null;

/** Error whose message is already customer-ready and must be shown as is. */
export class PromotionOfferMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromotionOfferMessageError";
  }
}

const formatPaise = (paise: number) =>
  `₹${(Math.max(paise, 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

export const promotionReasonCopy = (reason: string, details?: Record<string, unknown>) => {
  const messages: Record<string, string> = {
    MINIMUM_QUANTITY_NOT_MET: `Add ${Number(details?.remaining ?? 1)} more eligible item(s) to unlock this offer.`,
    MINIMUM_VALUE_NOT_MET: `Add ₹${(Number(details?.remaining ?? 0) / 100).toFixed(2)} more from eligible products.`,
    GIFT_OUT_OF_STOCK: "This promotional gift is currently unavailable.",
    CONFLICTED_WITH_BETTER_OFFER: "Your current offers save more. This offer was not applied.",
    CUSTOMER_NOT_ELIGIBLE: "This offer is not available for this account.",
    CHANNEL_NOT_ELIGIBLE: "This offer is not available on this shopping channel.",
    USAGE_LIMIT_REACHED: "This offer has already been used.",
    BUDGET_EXHAUSTED: "This offer is no longer available.",
  };
  return messages[reason] ?? reason.replaceAll("_", " ").toLowerCase();
};

const quoteSaving = (promotions: Array<{ saving: number }>) =>
  promotions.reduce((sum, promotion) => sum + Number(promotion.saving || 0), 0);

/** Message when V2 did not apply the requested offer. */
export const describeOfferNotApplied = (
  promotionName: string,
  promotionIdToApply: number,
  quote: PromotionV2Quote,
  fallbackOfferSavingPaise = 0,
) => {
  const rejection = quote.rejected_candidates.find((item) => item.promotion_id === promotionIdToApply);
  if (rejection && rejection.reason_code !== "CONFLICTED_WITH_BETTER_OFFER") {
    return promotionReasonCopy(rejection.reason_code, rejection.details);
  }

  const offerSaving =
    quote.eligible_alternatives.find((item) => item.promotion_id === promotionIdToApply)?.saving ??
    fallbackOfferSavingPaise;
  const currentSaving = quoteSaving(quote.applied_promotions);
  if (offerSaving > 0 && currentSaving > 0) {
    return `${promotionName} saves ${formatPaise(offerSaving)}, but your current offers save ${formatPaise(currentSaving)}. Remove them to use this offer instead.`;
  }
  return "Your current offers save more. Remove them to use this offer instead.";
};

/** Success message; names the offers that were replaced because the new set saves more. */
export const describeOfferApplied = (
  promotionName: string,
  promotionIdApplied: number,
  quote: PromotionV2Quote,
  previousApplied: Array<{ promotion_id: number; name: string; saving: number }>,
  scope: "cart" | "order",
) => {
  const appliedIds = new Set(quote.applied_promotions.map((item) => item.promotion_id));
  const replaced = previousApplied.filter(
    (item) => item.promotion_id !== promotionIdApplied && !appliedIds.has(item.promotion_id),
  );
  if (replaced.length === 0) return `${promotionName} applied to your ${scope}.`;

  const extraSaving = quoteSaving(quote.applied_promotions) - quoteSaving(previousApplied);
  return `${promotionName} applied. It replaces ${joinNames(replaced.map((item) => item.name))}${
    extraSaving > 0 ? ` because it saves you ${formatPaise(extraSaving)} more` : ""
  }.`;
};

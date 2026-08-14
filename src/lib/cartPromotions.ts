import type { AppliedPromotion } from "../services/promotionService";
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
  promotionId: number;
  promotionName: string;
  evaluationId: string;
  cartSignature: string;
  totalDiscount: number;
  discountedTotal: number;
  appliedPromotions: AppliedPromotion[];
  expiresAt?: string;
  savedAt: number;
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
  subtotal: number
) => {
  const minimumOrderValue = freeShippingMinimumOrderValue(promotion);
  return minimumOrderValue <= 0 || subtotal >= minimumOrderValue;
};

export const getAppliedPromotionSummary = (
  totals: CartPromotionTotals,
  appliedPromotions: AppliedPromotion[],
  fallbackDiscount = 0
): PromotionDiscountSummary => {
  const freeShippingPromotions = appliedPromotions.filter(
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
    return promotion.userId === userId && promotion.promotionId ? promotion : null;
  } catch {
    return null;
  }
};

export const saveSelectedCartPromotion = (promotion: SelectedCartPromotion) => {
  localStorage.setItem(`${SELECTED_PROMOTION_KEY}:${promotion.userId}`, JSON.stringify(promotion));
};

export const clearSelectedCartPromotion = (userId?: number | null) => {
  if (!userId) return;
  localStorage.removeItem(`${SELECTED_PROMOTION_KEY}:${userId}`);
};

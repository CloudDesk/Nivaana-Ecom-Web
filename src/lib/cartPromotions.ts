import type { AppliedPromotion } from "../services/promotionService";
import type { Product } from "../types";

const SELECTED_PROMOTION_KEY = "nivaana_selected_cart_promotion";

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
  payableTotal: number;
}

export type PromotionEvaluationCartItem = PromotionCartData["items"][number] & {
  cart_record_id: string;
};

export const productUnitPrice = (product?: Product) =>
  product ? Math.max(Number(product.price || 0) - Number(product.discount || 0), 0) : 0;

export const getPromotionCartTotals = (rows: PromotionCartRow[]): CartPromotionTotals => {
  const mrpTotal = rows.reduce((sum, row) => sum + Number(row.product?.price || 0) * row.quantity, 0);
  const subtotal = rows.reduce((sum, row) => sum + productUnitPrice(row.product) * row.quantity, 0);
  const productDiscount = rows.reduce((sum, row) => sum + Number(row.product?.discount || 0) * row.quantity, 0);
  const shipping = subtotal > 0 && subtotal < 999 ? 40 : 0;

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
  Boolean(
    promotion &&
      (promotion.is_free_shipping ||
        promotion.promotion_type === "FREE_SHIPPING" ||
        promotion.is_shipping_discount ||
        promotion.shipping_info)
  );

export const getAppliedPromotionSummary = (
  totals: CartPromotionTotals,
  appliedPromotions: AppliedPromotion[],
  fallbackDiscount = 0
): PromotionDiscountSummary => {
  const freeShippingPromotions = appliedPromotions.filter(isFreeShippingAppliedPromotion);
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

  return {
    normalPromotions,
    freeShippingPromotions,
    normalDiscount,
    freeShippingApplied,
    effectiveShipping,
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

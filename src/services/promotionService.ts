import { apiService } from "./apiService";
import type { ApiResponse } from "../types";
import type { PromotionCartData, PromotionEvaluationCartItem } from "../lib/cartPromotions";

export interface Promotion {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  code?: string | null;
  auto_apply?: boolean;
  start_date?: number | string | null;
  end_date?: number | string | null;
  timezone?: string | null;
  status?: string;
  priority?: number;
  visibility?: string;
  stackable?: boolean;
  discount_type?: string | null;
  discount_value?: number | null;
  action?: PromotionAction | null;
  actions?: PromotionAction[] | null;
  conditions?: PromotionCondition[] | null;
}

export interface PromotionAction {
  type?: string;
  value?: number | boolean;
  max_discount?: number;
  min_order_value?: number;
  minimum_order_value?: number;
  buy_quantity?: number;
  get_quantity?: number;
  free_product_id?: string;
  max_free_items?: number;
  [key: string]: unknown;
}

export interface PromotionCondition {
  attribute?: string;
  field?: string;
  operator?: string;
  value?: string | number | boolean | string[] | number[];
  [key: string]: unknown;
}

export interface PromotionListParams {
  page?: number;
  limit?: number;
  userid?: number | string;
  channel?: string;
  geo?: string;
  status?: string;
  visibility?: string;
}

export interface RecommendationCartItem {
  productId: string;
  qty: number;
  category: string;
  price: number;
}

export interface RecommendationRequest {
  userId: string;
  cartItems: RecommendationCartItem[];
  mode: "phonepe" | "cod";
  channel?: string;
  geo?: string;
  cartData?: PromotionCartData;
}

export interface DiscountInfo {
  originalTotal?: number;
  discountAmount?: number;
  discountedTotal?: number;
  discountPercentage?: number;
  savingsAmount?: number;
}

export interface ApplicablePromotion {
  promotion_id: number;
  name: string;
  description?: string | null;
  type: string;
  code?: string | null;
  discount_value?: number;
  discount_type?: string;
  priority?: number;
  start_date?: number | string | null;
  end_date?: number | string | null;
  timezone?: string | null;
  action?: PromotionAction | null;
  actions?: PromotionAction[] | null;
  conditions?: PromotionCondition[] | null;
  min_order_value?: number | null;
  minimum_order_value?: number | null;
  is_free_shipping?: boolean;
  is_shipping_discount?: boolean;
  shipping_info?: Record<string, unknown> | null;
  discountInfo?: DiscountInfo;
  mode?: string;
  expiresAt?: string;
  promotionState?: string;
  evaluation_id?: string;
  applied_discount?: number;
}

export interface AppliedPromotion {
  promotion_id?: number | null;
  promotion_name?: string | null;
  promotion_type?: string | null;
  discount_amount?: number | null;
  is_auto?: boolean;
  is_free_shipping?: boolean;
  is_stacked?: boolean | null;
  bogo_details?: {
    buy_quantity?: number;
    get_quantity?: number;
    free_items_count?: number;
  } | null;
  free_product_details?: {
    free_product_id?: string;
    granted_items_count?: number;
  } | null;
  [key: string]: unknown;
}

export interface CurrentEvaluation {
  evaluation_id: string;
  original_total: number;
  discounted_total: number;
  total_discount?: number;
  applied_promotions: AppliedPromotion[];
}

export interface OffersSummary {
  totalPromotions?: number;
  eligibleCount?: number;
  ineligibleCount?: number;
  stackableCount?: number;
  autoAppliedCount?: number;
  appliedCount?: number;
  hasActiveEvaluation?: boolean;
  cartTotal?: number;
  cartItems?: number;
  categories?: string[];
}

export interface RecommendationData {
  bestCoupon: ApplicablePromotion | null;
  eligibleCoupons: ApplicablePromotion[];
  ineligibleCoupons: Array<ApplicablePromotion & { ineligibleReason?: string }>;
  stackablePromotions: ApplicablePromotion[];
  autoAppliedPromotions: ApplicablePromotion[];
  currentEvaluation: CurrentEvaluation | null;
  summary: OffersSummary;
}

export interface ActiveEvaluationsData {
  evaluations: Array<{
    evaluation_id: string;
    user_id: string;
    cart_data?: unknown;
    applied_promotions: AppliedPromotion[];
    original_total?: number;
    discounted_total?: number;
    total_discount?: number;
    status: "active" | "expired" | "used";
    created_at?: string;
    expires_at?: string;
  }>;
}

export interface PromotionEvaluationRequest {
  cartId: string;
  userId: string;
  promotionId: number;
  cartData: PromotionCartData;
  cartItems: PromotionEvaluationCartItem[];
  mode: "phonepe" | "cod";
  applicationType?: "manual_coupon" | "stackable_promotion" | "preview_only";
  channel?: string;
  geo?: string;
}

export interface PromotionEvaluationData {
  evaluation_id: string;
  original_total: number;
  discounted_total: number;
  total_discount: number;
  applied_promotions: AppliedPromotion[];
  ineligible_reasons?: string[];
  expires_at?: string;
}

export interface PromotionRemoveEvaluationData {
  evaluation_id: string;
  applied_promotions: AppliedPromotion[];
  expires_at?: string;
}

export interface AutomaticPromotionEvaluationRequest {
  userId: string;
  cartItems: PromotionEvaluationCartItem[];
  mode: "phonepe" | "cod";
  channel?: string;
  geo?: string;
  currentTotal?: number;
}

const normalizeResponse = <T>(response: ApiResponse<T>): ApiResponse<T> => {
  const rawResponse = response as ApiResponse<T> & Record<string, unknown>;
  if (rawResponse.data !== undefined) return response;

  const { success, pagination, meta, ...data } = rawResponse;
  return {
    success: success !== false,
    data: data as T,
    pagination,
    meta,
  };
};

class PromotionService {
  list(params: PromotionListParams = {}): Promise<ApiResponse<Promotion[]>> {
    const queryParams = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      channel: params.channel ?? "web",
      geo: params.geo ?? "IN",
    });

    if (params.userid) queryParams.set("userid", String(params.userid));
    if (params.status) queryParams.set("status", params.status);
    if (params.visibility) queryParams.set("visibility", params.visibility);

    return apiService.get<Promotion[]>(`/promotions?${queryParams.toString()}`);
  }

  getRecommendedOffers(payload: RecommendationRequest): Promise<ApiResponse<RecommendationData>> {
    return apiService.post<RecommendationData>("/promotions/offers", {
      user_id: payload.userId,
      userId: payload.userId,
      cartItems: payload.cartItems,
      cart_data: payload.cartData,
      mode: payload.mode,
      context: {
        channel: payload.channel ?? "web",
        geo: payload.geo ?? "IN",
        payment_method: payload.mode,
      },
      channel: payload.channel ?? "web",
      geo: payload.geo ?? "IN",
    }).then(normalizeResponse);
  }

  evaluate(payload: PromotionEvaluationRequest): Promise<ApiResponse<PromotionEvaluationData>> {
    return apiService.post<PromotionEvaluationData>("/promotions/evaluate", {
      user_id: payload.userId,
      application_type: payload.applicationType ?? "manual_coupon",
      promotion_id: payload.promotionId,
      cart_items: payload.cartItems,
      context: {
        channel: payload.channel ?? "web",
        geo: payload.geo ?? "IN",
        payment_method: payload.mode,
      },
    }).then(normalizeResponse);
  }

  evaluateAutomatic(payload: AutomaticPromotionEvaluationRequest): Promise<ApiResponse<PromotionEvaluationData>> {
    return apiService.post<PromotionEvaluationData>("/promotions/evaluate/automatic", {
      user_id: payload.userId,
      cart_items: payload.cartItems,
      current_total: payload.currentTotal,
      context: {
        channel: payload.channel ?? "web",
        geo: payload.geo ?? "IN",
        payment_method: payload.mode,
      },
    }).then(normalizeResponse);
  }

  removeEvaluation(evaluationId: string, promotionId: number): Promise<ApiResponse<PromotionRemoveEvaluationData>> {
    return apiService.post<PromotionRemoveEvaluationData>("/promotions/evaluate/remove", {
      evaluation_id: evaluationId,
      promotion_id: promotionId,
    }).then(normalizeResponse);
  }

  getActiveEvaluations(userId: string | number): Promise<ApiResponse<ActiveEvaluationsData>> {
    return apiService.get<ActiveEvaluationsData>(`/promotions/evaluations?user_id=${userId}`);
  }
}

export const promotionService = new PromotionService();
export default PromotionService;

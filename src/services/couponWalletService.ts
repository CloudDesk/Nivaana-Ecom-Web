import { apiService } from "./apiService";

export interface WalletCoupon {
  id: number;
  code: string;
  status: "available" | "scheduled" | "claimed" | "expired" | "inactive" | "revoked" | string;
  start_date?: string | number | null;
  end_date?: string | number | null;
  claimed_at?: string | number | null;
  promotion: {
    name?: string | null;
    action?: { type?: string; value?: number } | null;
    conditions?: Array<{ attribute?: string; value?: number }> | null;
  };
  wallet_credit?: {
    id: number;
    original_amount: number;
    remaining_amount: number;
    available_amount?: number;
    minimum_cart_amount: number;
    status: string;
    expires_at?: string | number | null;
    source_type?: "coupon" | "cancellation_refund" | "return_refund" | string;
  } | null;
}

export interface CustomerWallet {
  balance: number;
  available_coupons: WalletCoupon[];
  credits: WalletCoupon[];
}

export interface CouponPreview {
  id: number;
  code: string;
  name: string;
  amount: number;
  minimum_cart_amount: number;
  valid_from?: string | number | null;
  valid_until?: string | number | null;
  delivery_channel: "all" | "web" | "mobile" | "print";
  status: "available";
  personalized_for_current_customer: true;
}

export interface WalletDiscountQuote {
  eligible_balance: number;
  discount_amount: number;
}

export interface WalletActivityItem {
  id: string;
  type: "order_redemption" | "cancellation_reversal" | "refund_credit";
  amount: number;
  wallet_credit_id: number;
  coupon_code: string;
  coupon_name: string;
  order_id?: number | null;
  merchant_transaction_id?: string | null;
  occurred_at: string | number;
  credit_balance_after: number;
}

export interface WalletActivityResponse {
  activity: WalletActivityItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const couponWalletService = {
  getWallet: () => apiService.get<CustomerWallet>("/coupon-wallet/me?channel=web"),
  getActivity: (page = 1, limit = 10, creditId?: number) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (creditId) query.set("credit_id", String(creditId));
    return apiService.get<WalletActivityResponse>(`/coupon-wallet/me/activity?${query}`);
  },
  preview: (code: string) => apiService.post<CouponPreview>("/coupon-wallet/preview", { code, channel: "web" }),
  claim: (code: string) => apiService.post<WalletCoupon>("/coupon-wallet/claim", { code, channel: "web" }),
  quoteDiscount: (eligibilityBase: number, payableAmount: number) =>
    apiService.post<WalletDiscountQuote>("/coupon-wallet/discount/quote", {
      eligibility_base: eligibilityBase,
      payable_amount: payableAmount,
    }),
};

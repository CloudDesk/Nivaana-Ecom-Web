import { apiService } from "./apiService";
import type { ApiResponse } from "../types";

export interface PaymentOrderItem {
  addressid: number;
  cartId: number;
  discountamount: number;
  orderamount: number;
  productamount: number;
  productcategory: string;
  productid: number;
  productname: string;
  quantity: number;
  userid: number;
}

export interface PaymentRequest {
  mode: "phonepe";
  payment_channel: "ecom";
  order: PaymentOrderItem[];
  returnUrl?: string;
  transaction: {
    amount: number;
    mobilenumber: string;
    name: string;
    productid: number[];
    transactionfor: "product";
    userId: number;
  };
  shippingCost?: number;
  taxAmount?: number;
  evaluation_ids?: string[];
  direct_coupon?: {
    code: string;
  };
  wallet?: {
    apply: boolean;
    eligibility_base: number;
  };
}

export interface PaymentResponseData {
  merchantTransactionId?: string;
  redirectUrl?: string;
  amount?: number;
  status?: string;
  success?: boolean;
  orderId?: string;
  paymentMode?: string;
  mode?: "phonepe" | "wallet" | "promotion" | string;
  wallet_discount_amount?: number;
  pricing?: {
    merchandise_subtotal: number;
    merchandise_discount: number;
    direct_coupon_discount?: number;
    merchandise_payable: number;
    shipping_amount: number;
    shipping_discount: number;
    shipping_payable: number;
    payable_before_wallet: number;
  };
  message?: string;
  orderCreation?: {
    status?: "success" | "already_exists" | "failed" | string;
    orderId?: number | null;
    error?: string | null;
  };
  paymentData?: {
    merchantTransactionId?: string;
    transactionId?: string;
    amount?: number;
    state?: string;
    responseCode?: string;
    paymentInstrument?: {
      type?: string;
    };
  };
  orderData?: {
    orderId?: number;
    orderid?: string;
    status?: string;
    order_created?: boolean;
  } | null;
  next_steps?: {
    phonepe?: {
      redirectUrl?: string;
    } | null;
    wallet?: {
      action?: "order_complete" | string;
      instructions?: string;
    } | null;
    internal?: {
      action?: "order_complete" | string;
      instructions?: string;
    } | null;
  };
}

export interface TransactionRecord {
  id?: number;
  transactionid?: string;
  transactiondata?: {
    originalPayload?: {
      transaction?: {
        amount?: number | string;
      };
      order?: unknown[];
      shippingCost?: number | string;
      taxAmount?: number | string;
    };
    [key: string]: unknown;
  } | null;
  userid?: number;
  productid?: number[];
  merchanttransactionid?: string;
  name?: string;
  amount?: number | string;
  mobilenumber?: number | string;
  transactionfor?: string;
  createddate?: number | string;
  modifieddate?: number | string;
  [key: string]: unknown;
}

class PaymentService {
  initiate(payload: PaymentRequest): Promise<ApiResponse<PaymentResponseData>> {
    // Payment initiate performs stock locking, order creation, orderlines insertion,
    // and promotion redemptions. Give it a resilient 120-second timeout.
    return apiService.post<PaymentResponseData>("/phonepe/initiate", payload, { timeout: 120000 });
  }

  getStatus(merchantTransactionId: string): Promise<ApiResponse<PaymentResponseData>> {
    // Status verification can synchronously reconcile and create the order.
    // Keep the confirmation loader active instead of failing at the global
    // 20-second timeout while that server-side work is still completing.
    return apiService.get<PaymentResponseData>(`/phonepe/status/${merchantTransactionId}`, { timeout: 120000 });
  }

  getTransaction(transactionId: string): Promise<ApiResponse<TransactionRecord>> {
    return apiService.get<TransactionRecord>(`/transactions/${transactionId}`);
  }

  listUserTransactions(userId: number, page = 1, limit = 10): Promise<ApiResponse<TransactionRecord[]>> {
    return apiService.get<TransactionRecord[]>(`/transactions/user/${userId}?page=${page}&limit=${limit}`);
  }
}

export const paymentService = new PaymentService();
export default PaymentService;

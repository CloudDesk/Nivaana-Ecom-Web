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
  order: PaymentOrderItem[];
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
}

export interface PaymentResponseData {
  merchantTransactionId?: string;
  redirectUrl?: string;
  amount?: number;
  status?: string;
  success?: boolean;
  orderId?: string;
  paymentMode?: string;
  mode?: string;
  message?: string;
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
    return apiService.post<PaymentResponseData>("/phonepe/initiate", payload);
  }

  getStatus(merchantTransactionId: string): Promise<ApiResponse<PaymentResponseData>> {
    return apiService.get<PaymentResponseData>(`/phonepe/status/${merchantTransactionId}`);
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

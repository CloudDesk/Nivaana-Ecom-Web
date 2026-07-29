import { apiService } from "./apiService";
import type { ApiResponse } from "../types";

export interface OrderSummary {
  id?: number;
  orderid?: string;
  orderamount?: number;
  productamount?: number;
  discountamount?: number;
  promotion_discount_total?: number;
  original_total?: number;
  shipping_cost?: number;
  orderstatus?: string;
  createddate?: number;
  modifieddate?: number;
  invoiceurl?: string | null;
  invoice_url?: string | null;
  order_invoice_url?: string | null;
  invoiceUrl?: string | null;
  tracking_id?: string | null;
  public_tracking_link?: string | null;
  [key: string]: unknown;
}

export interface OrderLine {
  id?: number;
  productid?: number;
  productname?: string;
  quantity?: number;
  orderamount?: number;
  orderstatus?: string;
  orderlinenumber?: string;
  image?: string | null;
  small?: string[] | null;
  medium?: string[] | null;
  large?: string[] | null;
  [key: string]: unknown;
}

export interface OrderAddress {
  name?: string;
  mobilenumber?: number | string;
  doornumber?: string;
  address?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: number | string;
  [key: string]: unknown;
}

export interface OrderDetails {
  order: OrderSummary;
  orderlines?: OrderLine[];
  address?: OrderAddress | null;
  status_history?: unknown[];
  statusHistory?: unknown[];
  [key: string]: unknown;
}

export interface TrackingDetails {
  order_id?: number;
  order_number?: string;
  order_status?: string;
  tracking_id?: string | null;
  vendor?: string | null;
  public_tracking_link?: string | null;
  tracking_available?: boolean;
  ekart_tracking?: {
    status?: string | null;
    current_location?: string | null;
    description?: string | null;
    estimated_delivery?: string | number | null;
    status_history?: unknown[];
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

class OrderService {
  list(userId: number): Promise<ApiResponse<OrderSummary[]>> {
    return apiService.get<OrderSummary[]>(`/orders?userid=${userId}`);
  }

  details(orderId: number | string): Promise<ApiResponse<OrderDetails>> {
    return apiService.get<OrderDetails>(`/orders/${orderId}/details`);
  }

  listUserDetails(userId: number): Promise<ApiResponse<OrderDetails[]>> {
    return apiService.get<OrderDetails[]>(`/orders/user/${userId}/details`);
  }

  track(orderId: number | string): Promise<ApiResponse<TrackingDetails>> {
    return apiService.get<TrackingDetails>(`/orders/${orderId}/track`);
  }

  cancel(
    orderId: number | string,
    userId: number,
    cancellationReason = "Customer cancellation"
  ): Promise<ApiResponse<OrderDetails | OrderSummary>> {
    return apiService.post<OrderDetails | OrderSummary>(`/orders/${orderId}/cancel`, {
      userid: userId,
      cancellation_reason: cancellationReason,
    });
  }
}

export const orderService = new OrderService();
export default OrderService;

import { apiService } from "./apiService";
import type { ApiResponse, CartItem } from "../types";

export interface UpsertCartPayload {
  id?: number;
  productid: number;
  userid: number;
  quantity: number;
  iscart: boolean;
  iswishlist: boolean;
}

class CartService {
  getCart(userId: number): Promise<ApiResponse<CartItem[]>> {
    return apiService.get<CartItem[]>(`/carts?userid=${userId}&iscart=true&limit=100`);
  }

  getWishlist(userId: number): Promise<ApiResponse<CartItem[]>> {
    return apiService.get<CartItem[]>(`/carts?userid=${userId}&iswishlist=true&limit=100`);
  }

  upsert(payload: UpsertCartPayload): Promise<ApiResponse<CartItem>> {
    return apiService.post<CartItem>("/carts/upsert", payload);
  }

  update(id: number, payload: Partial<UpsertCartPayload>): Promise<ApiResponse<CartItem>> {
    return apiService.put<CartItem>(`/carts/${id}`, payload);
  }

  remove(id: number): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/carts/${id}`);
  }

  clear(userId: number): Promise<ApiResponse<{ deletedCount: number }>> {
    return apiService.delete<{ deletedCount: number }>(`/carts/user/${userId}/clear`);
  }
}

export const cartService = new CartService();
export default CartService;

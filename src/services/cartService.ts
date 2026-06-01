import { apiService } from './apiService';
import { platformProductService } from './productPlatformService';
import type {
  ApiResponse,
  CartItem,
  CartRecord,
  CartRequest,
  Product,
} from '../types';

class CartService {
  private baseUrl = '/carts';

  async getUserCartItems(userId: number): Promise<ApiResponse<CartRecord[]>> {
    return apiService.get<CartRecord[]>(`${this.baseUrl}/user/${userId}`);
  }

  async upsertCartItem(item: CartRequest): Promise<ApiResponse<CartRecord>> {
    return apiService.post<CartRecord>(`${this.baseUrl}/upsert`, item);
  }

  async updateCartItem(
    cartItemId: number,
    item: CartRequest,
  ): Promise<ApiResponse<CartRecord>> {
    return apiService.put<CartRecord>(`${this.baseUrl}/${cartItemId}`, item);
  }

  async deleteCartItem(cartItemId: number): Promise<ApiResponse<unknown>> {
    return apiService.delete(`${this.baseUrl}/${cartItemId}`);
  }

  async clearUserCart(userId: number): Promise<ApiResponse<unknown>> {
    return apiService.delete(`${this.baseUrl}/user/${userId}/clear`);
  }

  async addToCart(productId: number, userId: number, quantity = 1) {
    const cartResponse = await this.getUserCartItems(userId);
    const existingItem = cartResponse.data.find(
      (item) => item.productid === productId,
    );

    return this.upsertCartItem({
      productid: productId,
      userid: userId,
      quantity,
      iscart: true,
      iswishlist: existingItem?.iswishlist ?? false,
    });
  }

  async getUserWishlistItems(userId: number): Promise<ApiResponse<CartRecord[]>> {
    return apiService.get<CartRecord[]>(`${this.baseUrl}/wishlist/${userId}`);
  }

  async addToWishlist(productId: number, userId: number) {
    const cartResponse = await this.getUserCartItems(userId);
    const existingItem = cartResponse.data.find(
      (item) => item.productid === productId,
    );

    return this.upsertCartItem({
      productid: productId,
      userid: userId,
      quantity: existingItem?.quantity || 1,
      iscart: existingItem?.iscart ?? false,
      iswishlist: true,
    });
  }

  async updateCartQuantity(
    userId: number,
    productId: number,
    quantity: number,
  ) {
    const cartResponse = await this.getUserCartItems(userId);
    const cartItem = cartResponse.data.find(
      (item) => item.productid === productId && item.iscart,
    );

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    return this.updateCartItem(cartItem.id, {
      productid: productId,
      userid: userId,
      quantity,
      iscart: true,
      iswishlist: cartItem.iswishlist,
    });
  }

  async removeFromCart(userId: number, productId: number) {
    const cartResponse = await this.getUserCartItems(userId);
    const cartItem = cartResponse.data.find(
      (item) => item.productid === productId && item.iscart,
    );

    if (cartItem) {
      if (cartItem.iswishlist) {
        await this.updateCartItem(cartItem.id, {
          productid: productId,
          userid: userId,
          quantity: 1,
          iscart: false,
          iswishlist: true,
        });
        return;
      }

      await this.deleteCartItem(cartItem.id);
    }
  }

  async removeFromWishlist(userId: number, productId: number) {
    const wishlistResponse = await this.getUserWishlistItems(userId);
    const wishlistItem = wishlistResponse.data.find(
      (item) => item.productid === productId && item.iswishlist,
    );

    if (wishlistItem) {
      if (wishlistItem.iscart) {
        await this.updateCartItem(wishlistItem.id, {
          productid: productId,
          userid: userId,
          quantity: wishlistItem.quantity,
          iscart: true,
          iswishlist: false,
        });
        return;
      }

      await this.deleteCartItem(wishlistItem.id);
    }
  }

  async getUserCartItemsWithProducts(userId: number): Promise<CartItem[]> {
    const cartResponse = await this.getUserCartItems(userId);
    const cartRecords = cartResponse.data.filter((item) => item.iscart);

    return Promise.all(
      cartRecords.map(async (cartRecord) => {
        const productResponse = await platformProductService.getProductForPlatform(
          cartRecord.productid,
        );

        return {
          ...productResponse.data,
          quantity: cartRecord.quantity,
          cartItemId: cartRecord.id,
        };
      }),
    );
  }

  async getUserWishlistItemsWithProducts(userId: number): Promise<Product[]> {
    const wishlistResponse = await this.getUserWishlistItems(userId);
    const wishlistRecords = wishlistResponse.data.filter((item) => item.iswishlist);

    return Promise.all(
      wishlistRecords.map(async (wishlistRecord) => {
        const productResponse = await platformProductService.getProductForPlatform(
          wishlistRecord.productid,
        );

        return productResponse.data;
      }),
    );
  }
}

export const cartService = new CartService();
export default CartService;

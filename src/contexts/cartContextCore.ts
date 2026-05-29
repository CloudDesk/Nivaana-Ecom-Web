import { createContext, useContext } from 'react';
import type { CartItem, Product } from '../types';

export interface CartContextType {
  cartItems: CartItem[];
  isLoading: boolean;
  error: string | null;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  isInCart: (productId: number) => boolean;
  getCartCount: () => number;
  getCartTotal: () => number;
}

export const CartContext = createContext<CartContextType | undefined>(
  undefined,
);

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
};

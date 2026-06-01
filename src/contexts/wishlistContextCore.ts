import { createContext, useContext } from 'react';
import type { Product } from '../types';

export interface WishlistContextType {
  wishlistItems: Product[];
  isLoading: boolean;
  error: string | null;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  clearWishlist: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  getWishlistCount: () => number;
}

export const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

export const useWishlist = () => {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error('useWishlist must be used inside WishlistProvider');
  }

  return context;
};

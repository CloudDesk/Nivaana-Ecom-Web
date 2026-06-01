import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './authContextCore';
import {
  WishlistContext,
  type WishlistContextType,
} from './wishlistContextCore';
import { cartService } from '../services/cartService';
import { wishlistStorage } from '../services/wishlistStorage';
import type { Product } from '../types';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);

  const userId = user?.id ? Number(user.id) : null;

  const loadGuestWishlist = useCallback(() => {
    setWishlistItems(wishlistStorage.loadWishlist());
  }, []);

  const loadServerWishlist = useCallback(async (currentUserId: number) => {
    const serverWishlist = await cartService.getUserWishlistItemsWithProducts(
      currentUserId,
    );
    setWishlistItems(serverWishlist);
  }, []);

  const syncGuestWishlistToServer = useCallback(
    async (currentUserId: number) => {
      const guestItems = wishlistStorage.loadWishlist();
      if (guestItems.length === 0) {
        return;
      }

      const serverWishlist = await cartService.getUserWishlistItemsWithProducts(
        currentUserId,
      );
      const serverProductIds = new Set(serverWishlist.map((item) => item.id));
      const newGuestItems = guestItems.filter(
        (item) => !serverProductIds.has(item.id),
      );

      await Promise.all(
        newGuestItems.map((item) =>
          cartService.addToWishlist(item.id, currentUserId),
        ),
      );
      wishlistStorage.clearWishlist();
    },
    [],
  );

  const refreshWishlist = useCallback(async () => {
    if (authLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticated && userId) {
        if (syncedUserIdRef.current !== user?.id) {
          await syncGuestWishlistToServer(userId);
          syncedUserIdRef.current = user?.id || null;
        }

        await loadServerWishlist(userId);
      } else {
        syncedUserIdRef.current = null;
        loadGuestWishlist();
      }
    } catch (wishlistError) {
      console.error('Error loading wishlist:', wishlistError);
      setError('Failed to load wishlist. Please try again.');

      if (!isAuthenticated) {
        loadGuestWishlist();
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    authLoading,
    isAuthenticated,
    loadGuestWishlist,
    loadServerWishlist,
    syncGuestWishlistToServer,
    user?.id,
    userId,
  ]);

  useEffect(() => {
    void refreshWishlist();
  }, [refreshWishlist]);

  const addToWishlist = useCallback(
    async (product: Product) => {
      if (wishlistItems.some((item) => item.id === product.id)) {
        return;
      }

      setError(null);

      if (isAuthenticated && userId) {
        await cartService.addToWishlist(product.id, userId);
        await loadServerWishlist(userId);
        return;
      }

      wishlistStorage.addToWishlist(product);
      loadGuestWishlist();
    },
    [isAuthenticated, loadGuestWishlist, loadServerWishlist, userId, wishlistItems],
  );

  const removeFromWishlist = useCallback(
    async (productId: number) => {
      setError(null);

      if (isAuthenticated && userId) {
        await cartService.removeFromWishlist(userId, productId);
        await loadServerWishlist(userId);
        return;
      }

      wishlistStorage.removeFromWishlist(productId);
      loadGuestWishlist();
    },
    [isAuthenticated, loadGuestWishlist, loadServerWishlist, userId],
  );

  const clearWishlist = useCallback(async () => {
    setError(null);

    if (isAuthenticated && userId) {
      await Promise.all(
        wishlistItems.map((item) =>
          cartService.removeFromWishlist(userId, item.id),
        ),
      );
      await loadServerWishlist(userId);
      return;
    }

    wishlistStorage.clearWishlist();
    loadGuestWishlist();
  }, [
    isAuthenticated,
    loadGuestWishlist,
    loadServerWishlist,
    userId,
    wishlistItems,
  ]);

  const isInWishlist = useCallback(
    (productId: number) => wishlistItems.some((item) => item.id === productId),
    [wishlistItems],
  );

  const getWishlistCount = useCallback(
    () => wishlistItems.length,
    [wishlistItems],
  );

  const value = useMemo<WishlistContextType>(
    () => ({
      wishlistItems,
      isLoading,
      error,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      refreshWishlist,
      isInWishlist,
      getWishlistCount,
    }),
    [
      addToWishlist,
      clearWishlist,
      error,
      getWishlistCount,
      isInWishlist,
      isLoading,
      refreshWishlist,
      removeFromWishlist,
      wishlistItems,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './authContextCore';
import { CartContext, type CartContextType } from './cartContextCore';
import { cartService } from '../services/cartService';
import { cartStorage } from '../services/cartStorage';
import type { CartItem, Product } from '../types';

const getDiscountedPrice = (product: Product) =>
  Math.max(product.price - (product.discount || 0), 0);

const getAvailableQuantity = (product: Product) =>
  product.availablequantity || product.ecompublishedquantity || 0;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);

  const userId = user?.id ? Number(user.id) : null;

  const loadGuestCart = useCallback(() => {
    setCartItems(cartStorage.loadCart());
  }, []);

  const loadServerCart = useCallback(async (currentUserId: number) => {
    const serverCart = await cartService.getUserCartItemsWithProducts(
      currentUserId,
    );
    setCartItems(serverCart);
  }, []);

  const syncGuestCartToServer = useCallback(
    async (currentUserId: number) => {
      const guestItems = cartStorage.loadCart();
      if (guestItems.length === 0) {
        return;
      }

      await Promise.all(
        guestItems.map((item) =>
          cartService.addToCart(item.id, currentUserId, item.quantity),
        ),
      );
      cartStorage.clearCart();
    },
    [],
  );

  const refreshCart = useCallback(async () => {
    if (authLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticated && userId) {
        if (syncedUserIdRef.current !== user?.id) {
          await syncGuestCartToServer(userId);
          syncedUserIdRef.current = user?.id || null;
        }

        await loadServerCart(userId);
      } else {
        syncedUserIdRef.current = null;
        loadGuestCart();
      }
    } catch (cartError) {
      console.error('Error loading cart:', cartError);
      setError('Failed to load cart. Please try again.');

      if (!isAuthenticated) {
        loadGuestCart();
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    authLoading,
    isAuthenticated,
    loadGuestCart,
    loadServerCart,
    syncGuestCartToServer,
    user?.id,
    userId,
  ]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(
    async (product: Product, quantity = 1) => {
      if (product.productstatus === 'out_of_stock') {
        throw new Error('This product is currently out of stock.');
      }

      const existingQuantity =
        cartItems.find((item) => item.id === product.id)?.quantity || 0;
      const nextQuantity = existingQuantity + quantity;
      const availableQuantity = getAvailableQuantity(product);

      if (availableQuantity > 0 && nextQuantity > availableQuantity) {
        throw new Error(`Only ${availableQuantity} item(s) available in stock.`);
      }

      setError(null);

      if (isAuthenticated && userId) {
        await cartService.addToCart(product.id, userId, nextQuantity);
        await loadServerCart(userId);
        return;
      }

      cartStorage.addToCart(product, quantity);
      loadGuestCart();
    },
    [cartItems, isAuthenticated, loadGuestCart, loadServerCart, userId],
  );

  const updateQuantity = useCallback(
    async (productId: number, quantity: number) => {
      const item = cartItems.find((cartItem) => cartItem.id === productId);
      if (!item) {
        return;
      }

      const nextQuantity = Math.max(quantity, 0);
      const availableQuantity = getAvailableQuantity(item);

      if (availableQuantity > 0 && nextQuantity > availableQuantity) {
        throw new Error(`Only ${availableQuantity} item(s) available in stock.`);
      }

      setError(null);

      if (isAuthenticated && userId) {
        if (nextQuantity <= 0) {
          await cartService.removeFromCart(userId, productId);
        } else {
          await cartService.updateCartQuantity(userId, productId, nextQuantity);
        }

        await loadServerCart(userId);
        return;
      }

      cartStorage.updateQuantity(productId, nextQuantity);
      loadGuestCart();
    },
    [cartItems, isAuthenticated, loadGuestCart, loadServerCart, userId],
  );

  const removeFromCart = useCallback(
    async (productId: number) => {
      setError(null);

      if (isAuthenticated && userId) {
        await cartService.removeFromCart(userId, productId);
        await loadServerCart(userId);
        return;
      }

      cartStorage.removeFromCart(productId);
      loadGuestCart();
    },
    [isAuthenticated, loadGuestCart, loadServerCart, userId],
  );

  const clearCart = useCallback(async () => {
    setError(null);

    if (isAuthenticated && userId) {
      await cartService.clearUserCart(userId);
      await loadServerCart(userId);
      return;
    }

    cartStorage.clearCart();
    loadGuestCart();
  }, [isAuthenticated, loadGuestCart, loadServerCart, userId]);

  const isInCart = useCallback(
    (productId: number) => cartItems.some((item) => item.id === productId),
    [cartItems],
  );

  const getCartCount = useCallback(
    () =>
      cartItems.reduce((total, item) => {
        return total + item.quantity;
      }, 0),
    [cartItems],
  );

  const getCartTotal = useCallback(
    () =>
      cartItems.reduce((total, item) => {
        return total + getDiscountedPrice(item) * item.quantity;
      }, 0),
    [cartItems],
  );

  const value = useMemo<CartContextType>(
    () => ({
      cartItems,
      isLoading,
      error,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
      isInCart,
      getCartCount,
      getCartTotal,
    }),
    [
      addToCart,
      cartItems,
      clearCart,
      error,
      getCartCount,
      getCartTotal,
      isInCart,
      isLoading,
      refreshCart,
      removeFromCart,
      updateQuantity,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

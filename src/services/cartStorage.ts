import type { CartItem, Product } from '../types';

const CART_STORAGE_KEY = 'NIVAANA_GUEST_CART';
const CART_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface LocalCartItem {
  productId: number;
  productData: Product;
  quantity: number;
  addedAt: number;
}

interface LocalCartData {
  items: LocalCartItem[];
  lastUpdated: number;
}

const isValidCartItem = (item: LocalCartItem) => {
  if (!item.productData?.id || !item.productData.name) {
    return false;
  }

  if (item.productId !== item.productData.id) {
    return false;
  }

  if (!item.quantity || item.quantity <= 0) {
    return false;
  }

  if (!item.addedAt || item.addedAt < Date.now() - CART_MAX_AGE_MS) {
    return false;
  }

  if (!item.productData.price || item.productData.price <= 0) {
    return false;
  }

  return true;
};

const readCartData = (): LocalCartData => {
  const storedCart = localStorage.getItem(CART_STORAGE_KEY);
  if (!storedCart) {
    return { items: [], lastUpdated: Date.now() };
  }

  try {
    const parsedCart = JSON.parse(storedCart) as LocalCartData;
    const items = Array.isArray(parsedCart.items)
      ? parsedCart.items.filter(isValidCartItem)
      : [];

    return {
      items,
      lastUpdated: parsedCart.lastUpdated || Date.now(),
    };
  } catch {
    return { items: [], lastUpdated: Date.now() };
  }
};

const writeCartData = (cartData: LocalCartData) => {
  const cleanCartData = {
    items: cartData.items.filter(isValidCartItem),
    lastUpdated: Date.now(),
  };

  if (cleanCartData.items.length === 0) {
    localStorage.removeItem(CART_STORAGE_KEY);
    return;
  }

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cleanCartData));
};

export const cartStorage = {
  loadCart(): CartItem[] {
    return readCartData().items.map((item) => ({
      ...item.productData,
      quantity: item.quantity,
    }));
  },

  addToCart(product: Product, quantity = 1) {
    const cartData = readCartData();
    const existingItem = cartData.items.find(
      (item) => item.productId === product.id,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.productData = product;
    } else {
      cartData.items.push({
        productId: product.id,
        productData: product,
        quantity,
        addedAt: Date.now(),
      });
    }

    writeCartData(cartData);
  },

  updateQuantity(productId: number, quantity: number) {
    const cartData = readCartData();
    const existingItem = cartData.items.find(
      (item) => item.productId === productId,
    );

    if (!existingItem) {
      return;
    }

    if (quantity <= 0) {
      writeCartData({
        ...cartData,
        items: cartData.items.filter((item) => item.productId !== productId),
      });
      return;
    }

    existingItem.quantity = quantity;
    writeCartData(cartData);
  },

  removeFromCart(productId: number) {
    const cartData = readCartData();
    writeCartData({
      ...cartData,
      items: cartData.items.filter((item) => item.productId !== productId),
    });
  },

  clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
  },
};

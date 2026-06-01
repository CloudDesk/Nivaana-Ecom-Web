import type { Product } from '../types';

const WISHLIST_STORAGE_KEY = 'NIVAANA_GUEST_WISHLIST';
const WISHLIST_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface LocalWishlistItem {
  productId: number;
  productData: Product;
  addedAt: number;
}

interface LocalWishlistData {
  items: LocalWishlistItem[];
  lastUpdated: number;
}

const isValidWishlistItem = (item: LocalWishlistItem) => {
  if (!item.productData?.id || !item.productData.name) {
    return false;
  }

  if (item.productId !== item.productData.id) {
    return false;
  }

  if (!item.addedAt || item.addedAt < Date.now() - WISHLIST_MAX_AGE_MS) {
    return false;
  }

  if (!item.productData.price || item.productData.price <= 0) {
    return false;
  }

  return true;
};

const readWishlistData = (): LocalWishlistData => {
  const storedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
  if (!storedWishlist) {
    return { items: [], lastUpdated: Date.now() };
  }

  try {
    const parsedWishlist = JSON.parse(storedWishlist) as LocalWishlistData;
    const items = Array.isArray(parsedWishlist.items)
      ? parsedWishlist.items.filter(isValidWishlistItem)
      : [];

    return {
      items,
      lastUpdated: parsedWishlist.lastUpdated || Date.now(),
    };
  } catch {
    return { items: [], lastUpdated: Date.now() };
  }
};

const writeWishlistData = (wishlistData: LocalWishlistData) => {
  const cleanWishlistData = {
    items: wishlistData.items.filter(isValidWishlistItem),
    lastUpdated: Date.now(),
  };

  if (cleanWishlistData.items.length === 0) {
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
    return;
  }

  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(cleanWishlistData));
};

export const wishlistStorage = {
  loadWishlist(): Product[] {
    return readWishlistData().items.map((item) => item.productData);
  },

  addToWishlist(product: Product) {
    const wishlistData = readWishlistData();
    const existingItem = wishlistData.items.find(
      (item) => item.productId === product.id,
    );

    if (existingItem) {
      existingItem.productData = product;
      existingItem.addedAt = Date.now();
    } else {
      wishlistData.items.push({
        productId: product.id,
        productData: product,
        addedAt: Date.now(),
      });
    }

    writeWishlistData(wishlistData);
  },

  removeFromWishlist(productId: number) {
    const wishlistData = readWishlistData();
    writeWishlistData({
      ...wishlistData,
      items: wishlistData.items.filter((item) => item.productId !== productId),
    });
  },

  clearWishlist() {
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
  },
};

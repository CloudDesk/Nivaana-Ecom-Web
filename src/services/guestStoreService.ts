import { cartService } from "./cartService";

export interface GuestItem {
  productid: number;
  quantity: number;
  iscart: boolean;
  iswishlist: boolean;
}

const GUEST_ITEMS_KEY = "nivaana_guest_items";

const notify = () => window.dispatchEvent(new Event("nivaana-guest-store-change"));

const readItems = (): GuestItem[] => {
  const raw = localStorage.getItem(GUEST_ITEMS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as GuestItem[];
  } catch {
    return [];
  }
};

const saveItems = (items: GuestItem[]) => {
  localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(items));
  notify();
};

const upsertGuestItem = (productid: number, patch: Partial<GuestItem>) => {
  const items = readItems();
  const existing = items.find((item) => item.productid === productid);

  if (existing) {
    Object.assign(existing, patch);
    if (patch.quantity !== undefined) {
      existing.quantity = Math.max(patch.quantity, 1);
    }
  } else {
    items.push({
      productid,
      quantity: patch.quantity || 1,
      iscart: Boolean(patch.iscart),
      iswishlist: Boolean(patch.iswishlist),
    });
  }

  saveItems(items.filter((item) => item.iscart || item.iswishlist));
};

export const guestStoreService = {
  getItems: readItems,

  getCart() {
    return readItems().filter((item) => item.iscart);
  },

  getWishlist() {
    return readItems().filter((item) => item.iswishlist);
  },

  addToCart(productid: number, quantity = 1) {
    const existing = readItems().find((item) => item.productid === productid);
    upsertGuestItem(productid, {
      quantity: existing?.iscart ? existing.quantity + quantity : quantity,
      iscart: true,
      iswishlist: existing?.iswishlist || false,
    });
  },

  addToWishlist(productid: number) {
    const existing = readItems().find((item) => item.productid === productid);
    upsertGuestItem(productid, {
      quantity: existing?.quantity || 1,
      iscart: existing?.iscart || false,
      iswishlist: true,
    });
  },

  updateCartQuantity(productid: number, quantity: number) {
    const items = readItems();
    const existing = items.find((item) => item.productid === productid);
    if (!existing) return;

    if (quantity <= 0) {
      existing.iscart = false;
    } else {
      existing.quantity = quantity;
      existing.iscart = true;
    }

    saveItems(items.filter((item) => item.iscart || item.iswishlist));
  },

  removeFromWishlist(productid: number) {
    const items = readItems();
    const existing = items.find((item) => item.productid === productid);
    if (!existing) return;

    existing.iswishlist = false;
    saveItems(items.filter((item) => item.iscart || item.iswishlist));
  },

  removeFromCart(productid: number) {
    this.updateCartQuantity(productid, 0);
  },

  clear() {
    localStorage.removeItem(GUEST_ITEMS_KEY);
    notify();
  },

  async mergeToUser(userId: number) {
    const items = readItems();
    if (!items.length) return;

    await Promise.all(
      items.map((item) =>
        cartService.upsert({
          productid: item.productid,
          userid: userId,
          quantity: Math.max(item.quantity, 1),
          iscart: item.iscart,
          iswishlist: item.iswishlist,
        })
      )
    );

    this.clear();
  },
};

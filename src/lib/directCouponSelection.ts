// Coupon code applied on Checkout, kept for the browser tab so it survives a
// trip to Cart or a refresh. It is re-validated by the backend whenever
// Checkout opens, so a stored code never bypasses any coupon rule.
const key = (userId: number) => `nivaana-direct-coupon-${userId}`;

export const readDirectCoupon = (userId?: number): string | null => {
  if (!userId) return null;
  try {
    return window.sessionStorage.getItem(key(userId)) || null;
  } catch {
    return null;
  }
};

export const saveDirectCoupon = (userId: number | undefined, code: string | null) => {
  if (!userId) return;
  try {
    if (code) window.sessionStorage.setItem(key(userId), code);
    else window.sessionStorage.removeItem(key(userId));
  } catch {
    // Storage can be unavailable (private mode, some in-app browsers); the
    // coupon then simply lasts for the current page only, as before.
  }
};

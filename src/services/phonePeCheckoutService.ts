const DEFAULT_PHONEPE_CHECKOUT_SCRIPT = "https://mercury.phonepe.com/web/bundle/checkout.js";
const SCRIPT_LOAD_TIMEOUT_MS = 15_000;

export type PhonePeCheckoutResult = "CONCLUDED" | "USER_CANCEL";

interface PhonePeCheckoutOptions {
  tokenUrl: string;
  type: "IFRAME";
  callback: (result: PhonePeCheckoutResult) => void;
}

interface PhonePeCheckoutApi {
  transact: (options: PhonePeCheckoutOptions) => void;
  closePage?: () => void;
}

declare global {
  interface Window {
    PhonePeCheckout?: PhonePeCheckoutApi;
  }
}

let checkoutScriptPromise: Promise<PhonePeCheckoutApi> | null = null;

const checkoutScriptUrl =
  import.meta.env.VITE_PHONEPE_CHECKOUT_SCRIPT_URL || DEFAULT_PHONEPE_CHECKOUT_SCRIPT;

export const isPhonePeIframeCheckoutEnabled =
  import.meta.env.VITE_PHONEPE_IFRAME_CHECKOUT === "true";

const getCheckoutApi = () => {
  const checkout = window.PhonePeCheckout;
  return checkout && typeof checkout.transact === "function" ? checkout : null;
};

export const loadPhonePeCheckout = (): Promise<PhonePeCheckoutApi> => {
  const existingApi = getCheckoutApi();
  if (existingApi) return Promise.resolve(existingApi);
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise<PhonePeCheckoutApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-phonepe-checkout="true"]',
    );
    const script = existingScript || document.createElement("script");
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      checkoutScriptPromise = null;
      // A failed tag never fires load/error again; remove it so a retry
      // requests the script afresh instead of waiting for the timeout.
      script.remove();
      reject(new Error(message));
    };

    const handleLoad = () => {
      const checkout = getCheckoutApi();
      if (!checkout) {
        fail("PhonePe Checkout loaded without exposing its payment API.");
        return;
      }
      if (settled) return;
      settled = true;
      cleanup();
      resolve(checkout);
    };

    const handleError = () => fail("Could not load PhonePe Checkout.");
    const timeoutId = window.setTimeout(
      () => fail("PhonePe Checkout took too long to load."),
      SCRIPT_LOAD_TIMEOUT_MS,
    );

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    if (!existingScript) {
      script.src = checkoutScriptUrl;
      script.async = true;
      script.dataset.phonepeCheckout = "true";
      document.head.appendChild(script);
    } else if (getCheckoutApi()) {
      handleLoad();
    }
  });

  return checkoutScriptPromise;
};

export const openPhonePeIframe = async (
  tokenUrl: string,
  callback: (result: PhonePeCheckoutResult) => void,
) => {
  const checkout = await loadPhonePeCheckout();
  checkout.transact({ tokenUrl, type: "IFRAME", callback });
};

// A PhonePe payment that was still pending when the customer closed the
// iframe (USER_CANCEL). Only that case is stored - never a payment that
// concluded normally - so the duplicate-payment check on Checkout can only
// point to a genuinely unfinished payment, not to a previous completed order.
// Kept per customer in sessionStorage so a refresh in the same tab still
// checks it. Order creation never depends on this: the webhook, status
// endpoint and Cloud Task reconcile the payment server-side.
const PENDING_PAYMENT_MAX_AGE_MS = 30 * 60 * 1000;
// "v2": entries written by the earlier version (saved for every payment,
// including completed ones) are ignored.
const pendingPaymentKey = (userId: number) => `nivaana-phonepe-pending-v2-${userId}`;

export const savePendingPhonePePayment = (userId: number | undefined, merchantTransactionId: string) => {
  if (!userId) return;
  try {
    window.sessionStorage.setItem(
      pendingPaymentKey(userId),
      JSON.stringify({ merchantTransactionId, savedAt: Date.now() }),
    );
  } catch {
    // Storage can be unavailable in some in-app browsers; the in-memory
    // state on Checkout still covers the current page.
  }
};

export const readPendingPhonePePayment = (userId: number | undefined): string | null => {
  if (!userId) return null;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(pendingPaymentKey(userId)) || "null") as
      | { merchantTransactionId?: string; savedAt?: number }
      | null;
    if (!stored?.merchantTransactionId || !stored.savedAt) return null;
    if (Date.now() - stored.savedAt > PENDING_PAYMENT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(pendingPaymentKey(userId));
      return null;
    }
    return stored.merchantTransactionId;
  } catch {
    return null;
  }
};

export const clearPendingPhonePePayment = (userId: number | undefined) => {
  if (!userId) return;
  try {
    window.sessionStorage.removeItem(pendingPaymentKey(userId));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};

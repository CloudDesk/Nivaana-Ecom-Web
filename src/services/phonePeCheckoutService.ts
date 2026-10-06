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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { hashKey, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  Home,
  Loader2,
  MapPin,
  PackageCheck,
  Pencil,
  Plus,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { addressService, type Address, type AddressPayload } from "../services/addressService";
import { cartService } from "../services/cartService";
import { couponWalletService, isUsableUnclaimedCoupon } from "../services/couponWalletService";
import { paymentService, type PaymentOrderItem } from "../services/paymentService";
import {
  clearPendingPhonePePayment,
  isPhonePeIframeCheckoutEnabled,
  openPhonePeIframe,
  readPendingPhonePePayment,
  savePendingPhonePePayment,
  type PhonePeCheckoutResult,
} from "../services/phonePeCheckoutService";
import { platformProductService } from "../services/productPlatformService";
import {
  promotionService,
  type ApplicablePromotion,
  type AppliedPromotion,
} from "../services/promotionService";
import { sessionService } from "../services/sessionService";
import { userService } from "../services/userService";
import { Button } from "../components/ui/button";
import { PageSkeleton } from "../components/PageSkeleton";
import { AddressFormModal } from "../components/AddressFormModal";
import { AddressForm } from "../components/AddressForm";
import { productFallback as fallbackProduct } from "../assets/config.js";
import type { Product } from "../types";
import { getProductDisplayName } from "../lib/productDisplay";
import { getAvailableStock, isOutOfStock, stockLimitMessage } from "../lib/stock";
import {
  buildPromotionCartData,
  buildPromotionEvaluationCartItems,
  cartPromotionSignature,
  clearSelectedCartPromotion,
  createSeededQuoteTracker,
  describeOfferApplied,
  describeOfferNotApplied,
  getAppliedPromotionSummary,
  getOfferActionState,
  getPromotionCartTotals,
  isRecoverablePromotionEvaluationError,
  isFreeShippingAppliedPromotion,
  isFreeShippingPromotion,
  isFreeShippingPromotionEligible,
  offerCombinationNote,
  offerNoticeClassName,
  offerPendingLabel,
  preserveAppliedStacking,
  promotionDiscountLabel,
  productUnitPrice,
  PromotionOfferMessageError,
  promotionSelectionKey,
  readSelectedCartPromotion,
  resolveAppliedStackable,
  saveSelectedCartPromotion,
  selectedCartPromotionIds,
  type OfferNotice,
  type SelectedCartPromotion,
} from "../lib/cartPromotions";
import { readWalletApplied, saveWalletApplied } from "../lib/walletSelection";
import { readDirectCoupon, saveDirectCoupon } from "../lib/directCouponSelection";
import { isOfferAlreadyUsedError } from "../lib/notificationMessages";
import { canonicalIndianMobile, INVALID_MOBILE_MESSAGE, isValidIndianMobile } from "../lib/phone";

const emptyAddressForm = (userId: number, mobileNumber: number, customerName = ""): AddressPayload => ({
  userid: userId,
  name: customerName,
  mobilenumber: mobileNumber || 0,
  pincode: 0,
  doornumber: "",
  address: "",
  landmark: "",
  state: "",
  city: "",
  isdefaultaddress: true,
});

const addressToPayload = (address: Address): AddressPayload => ({
  userid: address.userid,
  name: address.name || "",
  mobilenumber: Number(address.mobilenumber || 0),
  pincode: Number(address.pincode || 0),
  doornumber: address.doornumber || "",
  address: address.address || "",
  landmark: address.landmark || "",
  state: address.state || "",
  city: address.city || "",
  isdefaultaddress: Boolean(address.isdefaultaddress),
});

const formatCurrency = (value: number) => `Rs. ${Math.max(value, 0).toLocaleString("en-IN")}`;

const productImage = (product?: Product) =>
  product?.medium?.[0] || product?.small?.[0] || product?.large?.[0] || fallbackProduct;

const notificationDisplayMs = 4200;
const notificationFadeMs = 350;

const paymentStatusText = (status?: string) => String(status || "").toLowerCase();

const paymentWasSuccessful = (status?: string) => {
  const normalized = paymentStatusText(status);
  return normalized === "success" || normalized.includes("payment_success") || normalized.includes("completed");
};

const paymentIsUncertain = (status?: string) => {
  const normalized = paymentStatusText(status);
  return !normalized || normalized.includes("pending") || normalized.includes("initiated") || normalized.includes("processing");
};

// Backend status for one PhonePe transaction. A failed request is "pending":
// only the backend may decide that a payment failed.
const fetchPaymentOutcome = async (merchantTransactionId: string): Promise<"success" | "pending" | "failed"> => {
  try {
    const response = await paymentService.getStatus(merchantTransactionId);
    const status = response.data?.status || response.data?.paymentData?.state;
    if (paymentWasSuccessful(status)) return "success";
    return paymentIsUncertain(status) ? "pending" : "failed";
  } catch {
    return "pending";
  }
};

const PENDING_PAYMENT_POLL_MS = 5000;
// Matches the 120s Cloud Task that reconciles or releases the payment.
const PENDING_PAYMENT_POLL_ATTEMPTS = 24;

const quantityFor = (quantity: unknown) => {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? parsed : 0;
};

const checkoutErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as { message?: string; data?: { message?: string; details?: string } };
  const message = apiError.data?.message || apiError.message || "";
  const details = apiError.data?.details || "";

  if (/referenced table|foreign key|field reference/i.test(`${message} ${details}`)) {
    return "This address is linked to an order and cannot be deleted.";
  }

  return message || fallback;
};

const appliedPromotionId = (promotion: AppliedPromotion) => Number(promotion.promotion_id || 0);

const promotionId = (promotion: ApplicablePromotion) =>
  Number(promotion.promotion_id || (promotion as ApplicablePromotion & { id?: number }).id || 0);

const uniquePromotions = (promotions: ApplicablePromotion[]) => {
  const seen = new Set<number | string>();

  return promotions.filter((promotion) => {
    const key = promotionId(promotion) || promotion.code || promotion.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const checkoutVoucherErrorMessage = (message?: string) => {
  const normalized = String(message || "").toUpperCase();

  if (normalized.includes("PROMOTION_NOT_FOUND") || normalized.includes("PROMOTION NOT FOUND")) {
    return "This voucher code is not valid.";
  }
  if (normalized.includes("PROMOTION_NOT_ASSIGNED_TO_CUSTOMER")) return "This voucher was issued to a different customer.";
  if (normalized.includes("CUSTOMER_GROUP_NOT_ELIGIBLE")) return "This voucher is not available for your customer group.";
  if (normalized.includes("VOUCHER_NOT_ACTIVE")) return "This voucher is currently inactive.";
  if (normalized.includes("VOUCHER_NOT_STARTED")) return "This voucher is not active yet.";
  if (normalized.includes("VOUCHER_EXPIRED")) return "This voucher has expired.";
  if (normalized.includes("VOUCHER_USAGE_LIMIT_REACHED")) return "This voucher has already reached its usage limit.";
  if (normalized.includes("PROMOTION_MAX_REDEMPTIONS_REACHED")) return "This promotion has reached its redemption limit.";
  if (normalized.includes("PROMOTION_PER_USER_LIMIT_REACHED")) return "You have already used this promotion.";
  if (normalized.includes("CHANNEL_NOT_ELIGIBLE")) return "This voucher cannot be used on the website.";
  if (normalized.includes("NOT ELIGIBLE FOR THIS CART")) return "This order does not currently meet this voucher's requirements.";
  if (normalized.includes("CONFLICTED WITH BETTER OFFER") || normalized.includes("CONFLICTED_WITH_BETTER_OFFER")) {
    return "Your current offers save more. This offer was not applied.";
  }
  if (normalized.includes("ALREADY APPLIED")) return "This voucher is already applied to your order.";
  if (normalized.includes("ANOTHER_PROMOTION_ALREADY_APPLIED")) return "Remove the current offer before applying another.";

  return message || "The voucher could not be redeemed.";
};

const directCouponErrorMessage = (error: unknown) => {
  const apiError = error as { message?: string; data?: { message?: string; details?: string } };
  const message = apiError.data?.details || apiError.data?.message || apiError.message || "";
  const normalized = message.toUpperCase();

  if (normalized.includes("COUPON_NOT_FOUND") || normalized.includes("COUPON_NOT_STANDALONE")) {
    return "This coupon code is not valid.";
  }
  if (normalized.includes("COUPON_ASSIGNED_TO_ANOTHER_CUSTOMER")) {
    return "This coupon was issued to a different customer.";
  }
  if (normalized.includes("COUPON_ALREADY_CLAIMED")) {
    return "This coupon has already been added to your wallet.";
  }
  if (normalized.includes("COUPON_ALREADY_REDEEMED")) {
    return "This coupon has already been used.";
  }
  if (normalized.includes("COUPON_RESERVED") || normalized.includes("COUPON_NO_LONGER_AVAILABLE")) {
    return "This coupon is currently reserved for another checkout. Please try again shortly.";
  }
  if (normalized.includes("COUPON_SCHEDULED")) return "This coupon is not active yet.";
  if (normalized.includes("COUPON_EXPIRED")) return "This coupon has expired.";
  if (normalized.includes("COUPON_REVOKED") || normalized.includes("COUPON_INACTIVE")) {
    return "This coupon is currently inactive.";
  }
  if (normalized.includes("COUPON_MINIMUM_CART_NOT_MET")) {
    return "Your item total does not meet this coupon's minimum purchase requirement.";
  }
  if (normalized.includes("COUPON_NOT_AVAILABLE_ON_THIS_CHANNEL")) {
    return "This coupon cannot be used on the website.";
  }
  if (normalized.includes("COUPON_NO_REMAINING_MERCHANDISE")) {
    return "Your current offers already cover the eligible item total, so this coupon cannot be added.";
  }
  if (normalized.includes("COUPON_MAX_REDEMPTIONS_REACHED") || normalized.includes("COUPON_PER_USER_LIMIT_REACHED")) {
    return "This coupon has reached its redemption limit.";
  }
  if (normalized.includes("COUPON_BUDGET_EXHAUSTED")) {
    return "This coupon is no longer available.";
  }
  if (normalized.includes("DIRECT_COUPON_QUOTE_CHANGED")) {
    return "This coupon changed while checkout was being prepared. Please apply it again.";
  }

  return message || "The coupon could not be applied. Please try again.";
};


const Checkout: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const buyNowProductId = Number(searchParams.get("buyNow"));
  const isBuyNowCheckout = Number.isFinite(buyNowProductId) && buyNowProductId > 0;
  const [session] = useState(() => sessionService.getSession());
  const user = session?.user;
  const userId = user?.id;
  const userMobile = Number(user?.usermobilenumber ?? 0);
  const storedCustomerName = [user?.firstname?.trim(), user?.lastname?.trim()].filter(Boolean).join(" ");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressPayload>(() =>
    emptyAddressForm(user?.id ?? 0, Number(user?.usermobilenumber ?? 0), storedCustomerName)
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [phonePeCheckoutActive, setPhonePeCheckoutActive] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(() => readPendingPhonePePayment(userId));
  const [pendingPaymentPromptOpen, setPendingPaymentPromptOpen] = useState(false);
  const [pendingPaymentChecking, setPendingPaymentChecking] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [backendStockErrors, setBackendStockErrors] = useState<Record<number, string>>({});
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedDirectCouponCode, setAppliedDirectCouponCode] = useState<string | null>(() => readDirectCoupon(userId));
  const [offerActionError, setOfferActionError] = useState("");
  // Offer apply/remove feedback lives on the offer's own card inside the pop-up;
  // offerActionError is kept for the coupon-code box only.
  const [offerNotice, setOfferNotice] = useState<OfferNotice | null>(null);
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [alreadyUsedPromotionIds, setAlreadyUsedPromotionIds] = useState<Set<number>>(
    () => new Set()
  );
  const [walletApplied, setWalletApplied] = useState(() => readWalletApplied(userId));
  const paymentSubmissionRef = useRef(false);
  const seededQuotes = useRef(createSeededQuoteTracker()).current;
  const announcedDirectCouponCodeRef = useRef<string | null>(readDirectCoupon(userId));
  const [selectedPromotion, setSelectedPromotion] = useState<SelectedCartPromotion | null>(() =>
    readSelectedCartPromotion(user?.id)
  );

  useEffect(() => {
    // Closing the offers pop-up (X, Escape or backdrop) resets its feedback.
    if (!offersModalOpen) setOfferNotice(null);
  }, [offersModalOpen]);

  useEffect(() => {
    if (!offersModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOffersModalOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [offersModalOpen]);

  useEffect(() => {
    if (userId) {
      setAddressForm(emptyAddressForm(userId, userMobile, storedCustomerName));
      setSelectedPromotion(readSelectedCartPromotion(userId));
      setWalletApplied(readWalletApplied(userId));
      const storedCoupon = readDirectCoupon(userId);
      announcedDirectCouponCodeRef.current = storedCoupon;
      setAppliedDirectCouponCode(storedCoupon);
    }
  }, [storedCustomerName, userId, userMobile]);

  useEffect(() => {
    if (!statusMessage && !errorMessage) {
      setNotificationVisible(false);
      return;
    }

    setNotificationVisible(true);
    const fadeTimer = window.setTimeout(() => setNotificationVisible(false), notificationDisplayMs);
    const clearTimer = window.setTimeout(() => {
      setStatusMessage("");
      setErrorMessage("");
    }, notificationDisplayMs + notificationFadeMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [statusMessage, errorMessage]);

  useEffect(() => {
    setPendingPaymentId(readPendingPhonePePayment(userId));
  }, [userId]);

  useEffect(() => {
    // Quietly follow a payment left pending when the PhonePe window closed.
    // If the customer finished it in their UPI app, show the confirmation.
    if (!pendingPaymentId || phonePeCheckoutActive) return;
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const check = async () => {
      attempts += 1;
      const outcome = await fetchPaymentOutcome(pendingPaymentId);
      if (cancelled) return;
      if (outcome === "success") {
        clearPendingPhonePePayment(userId);
        navigate(`/checkout/confirmation?${new URLSearchParams({ merchantTransactionId: pendingPaymentId }).toString()}`, { replace: true });
        return;
      }
      if (outcome === "failed") {
        clearPendingPhonePePayment(userId);
        setPendingPaymentId(null);
        return;
      }
      if (attempts < PENDING_PAYMENT_POLL_ATTEMPTS) {
        timer = window.setTimeout(() => void check(), PENDING_PAYMENT_POLL_MS);
      }
    };

    timer = window.setTimeout(() => void check(), PENDING_PAYMENT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [navigate, pendingPaymentId, phonePeCheckoutActive, userId]);

  const cartQuery = useQuery({
    queryKey: ["cart", userId],
    queryFn: () => cartService.getCart(userId!),
    enabled: Boolean(userId && !isBuyNowCheckout),
  });

  const productsQuery = useQuery({
    queryKey: ["checkout-products"],
    queryFn: () => platformProductService.getProducts(1, 100),
    staleTime: 1000 * 60 * 5,
  });

  const buyNowProductQuery = useQuery({
    queryKey: ["checkout-buy-now-product", buyNowProductId],
    queryFn: () => platformProductService.getProduct(buyNowProductId),
    enabled: isBuyNowCheckout,
    staleTime: 1000 * 60 * 5,
  });

  const addressesQuery = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => addressService.list(userId!),
    enabled: Boolean(userId),
  });

  const addresses = useMemo(() => addressesQuery.data?.data ?? [], [addressesQuery.data?.data]);
  const allCartItems = useMemo(
    () => (cartQuery.data?.data ?? []).filter((item) => item.iscart),
    [cartQuery.data?.data]
  );
  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data?.data]);
  const buyNowProduct = useMemo(
    () => buyNowProductQuery.data?.data ?? products.find((product) => product.id === buyNowProductId),
    [buyNowProductId, buyNowProductQuery.data?.data, products]
  );
  const cartItems = useMemo(
    () =>
      isBuyNowCheckout
        ? buyNowProduct
          ? [{
            id: buyNowProduct.id,
            productid: buyNowProduct.id,
            userid: userId ?? 0,
            quantity: 1,
            iscart: true,
            iswishlist: false,
          }]
          : []
        : allCartItems,
    [allCartItems, buyNowProduct, isBuyNowCheckout, userId]
  );

  const enrichedItems = useMemo(
    () =>
      cartItems.map((item) => ({
        item,
        quantity: quantityFor(item.quantity),
        product: item.productid === buyNowProductId && buyNowProduct
          ? buyNowProduct
          : products.find((product) => product.id === item.productid),
      })),
    [buyNowProduct, buyNowProductId, cartItems, products]
  );

  const promotionRows = useMemo(
    () =>
      enrichedItems
        .filter(({ product, quantity }) => product && quantity > 0)
        .map(({ item, product, quantity }) => ({
          cartRecordId: item.id,
          productid: item.productid,
          product,
          quantity,
        })),
    [enrichedItems]
  );
  const promotionCartData = useMemo(() => buildPromotionCartData(promotionRows), [promotionRows]);
  const promotionEvaluationItems = useMemo(() => buildPromotionEvaluationCartItems(promotionRows), [promotionRows]);
  const cartSignature = useMemo(() => cartPromotionSignature(promotionRows), [promotionRows]);
  const cartTotals = useMemo(() => getPromotionCartTotals(promotionRows), [promotionRows]);
  const selectedPromotionId = selectedPromotion?.promotionId ?? null;
  const selectedPromotionIds = useMemo(
    () => selectedCartPromotionIds(selectedPromotion),
    [selectedPromotion],
  );
  const selectedPromotionUsesV2 = Boolean(
    selectedPromotion?.engine === "v2" && selectedPromotion.cartSignature === cartSignature
  );
  // Share the cart quote cache across the route transition. Checkout still
  // refetches immediately (staleTime: 0), but the last cart quote remains a
  // display-only snapshot while the authoritative checkout quote is verified.
  const checkoutPromotionsV2QueryRoot = ["cart-promotions-v2", userId, cartSignature] as const;
  const checkoutPromotionsV2QueryKey = [
    ...checkoutPromotionsV2QueryRoot,
    promotionSelectionKey(selectedPromotionUsesV2 ? selectedPromotionIds : []),
  ] as const;
  const promotionsV2Query = useQuery({
    queryKey: checkoutPromotionsV2QueryKey,
    queryFn: () => promotionService.calculatePromotions({
      cartItems: promotionRows.map((row) => ({ cart_record_id: String(row.cartRecordId ?? row.productid), product_id: String(row.productid), quantity: row.quantity })),
      shippingAmount: cartTotals.shipping,
      channel: "web",
      ...(selectedPromotionUsesV2 && selectedPromotionIds.length
        ? { selectedPromotionIds }
        : {}),
    }),
    enabled: Boolean(userId && promotionRows.length > 0),
    // Fresh on entry; a quote just returned by Apply/Remove is not fetched again.
    staleTime: (query) => seededQuotes.staleTime(query.queryHash),
    retry: false,
  });
  const promotionsV2Quote = promotionsV2Query.data?.data;
  const hasV2AppliedBenefit = Boolean(
    promotionsV2Quote &&
    (promotionsV2Quote.applied_promotions.length > 0 || promotionsV2Quote.adjustments.length > 0)
  );
  const mrpTotal = cartTotals.mrpTotal;
  const productDiscount = cartTotals.productDiscount;

  const activeEvaluationsQuery = useQuery({
    queryKey: ["checkout-active-promotion-evaluations", userId, cartSignature],
    queryFn: () =>
      promotionService.evaluateAutomatic({
        userId: String(userId),
        cartItems: promotionEvaluationItems,
        currentTotal: cartTotals.subtotal,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      }),
    // V2 is the canonical quote and already includes legacy automatic offers.
    // Only fall back to the legacy evaluator when V2 itself is unavailable.
    enabled: Boolean(userId && promotionRows.length > 0 && promotionsV2Query.isError),
    staleTime: 1000 * 15,
  });

  const promotionOffersQuery = useQuery({
    queryKey: ["checkout-promotion-offers", userId, cartSignature],
    queryFn: () =>
      promotionService.getRecommendedOffers({
        userId: String(userId),
        cartItems: promotionRows.map((row) => ({
          productId: String(row.productid),
          qty: row.quantity,
          category: row.product?.category || row.product?.subcategory || "General",
          price: productUnitPrice(row.product),
        })),
        cartData: promotionCartData,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      }),
    enabled: Boolean(userId && promotionRows.length > 0),
    staleTime: 1000 * 30,
  });
  const eligibilityPromotionIds = useMemo(() => {
    const offers = promotionOffersQuery.data?.data;
    if (!offers) return [];
    return uniquePromotions([
      offers.bestCoupon,
      ...offers.eligibleCoupons,
      ...offers.ineligibleCoupons,
      ...offers.autoAppliedPromotions,
      ...offers.stackablePromotions,
    ].filter((promotion): promotion is ApplicablePromotion => Boolean(promotion && promotionId(promotion) > 0)))
      .map(promotionId)
      .sort((left, right) => left - right);
  }, [promotionOffersQuery.data]);
  const promotionEligibilityQuery = useQuery({
    queryKey: ["checkout-promotion-eligibility", userId, cartSignature, eligibilityPromotionIds.join(",")],
    queryFn: () => promotionService.checkEligibility({
      promotionIds: eligibilityPromotionIds,
      cartItems: promotionRows.map((row) => ({
        cart_record_id: String(row.cartRecordId ?? row.productid),
        product_id: String(row.productid),
        quantity: row.quantity,
      })),
      shippingAmount: cartTotals.shipping,
      channel: "web",
    }),
    enabled: Boolean(userId && eligibilityPromotionIds.length > 0 && promotionRows.length > 0),
    staleTime: 0,
    retry: false,
  });

  // evaluateAutomatic is scoped to the current cart signature. Using the first
  // user-level active evaluation can attach prices/promotions from an older cart.
  const backendEvaluation = activeEvaluationsQuery.data?.data ?? null;
  const backendAppliedPromotions = useMemo(
    () => (backendEvaluation?.applied_promotions ?? []).filter((promotion) => {
      const id = appliedPromotionId(promotion);
      const eligibility = promotionEligibilityQuery.data?.data;
      const versionedIds = new Set(eligibility?.versioned_promotion_ids ?? []);
      const eligibleIds = new Set((eligibility?.eligible_promotions ?? []).map((item) => item.promotion_id));
      if (versionedIds.has(id) && !eligibleIds.has(id)) return false;
      const discount = Number(promotion.discount_amount ?? 0);
      const freeItems = Number(
        promotion.bogo_details?.free_items_count ??
        promotion.free_product_details?.granted_items_count ??
        0,
      );
      return discount > 0 || isFreeShippingAppliedPromotion(promotion) || freeItems > 0;
    }),
    [backendEvaluation?.applied_promotions, promotionEligibilityQuery.data],
  );
  const manualAppliedPromotion = backendAppliedPromotions.find(
    (promotion) => !promotion.is_auto && !isFreeShippingAppliedPromotion(promotion) && appliedPromotionId(promotion) > 0
  );
  const selectedPromotionMatchesOrder = Boolean(
    selectedPromotion && selectedPromotion.cartSignature === cartSignature
  );

  const promotionEvaluationQuery = useQuery({
    queryKey: ["checkout-promotion-evaluation", userId, selectedPromotionId, cartSignature],
    queryFn: async () => {
      await promotionService.evaluateAutomatic({
        userId: String(userId),
        cartItems: promotionEvaluationItems,
        currentTotal: cartTotals.subtotal,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });

      return promotionService.evaluate({
        cartId: `cart-${userId}`,
        userId: String(userId),
        promotionId: selectedPromotionId!,
        cartData: promotionCartData,
        cartItems: promotionEvaluationItems,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });
    },
    enabled: Boolean(
      userId &&
      selectedPromotionId &&
      !selectedPromotionUsesV2 &&
      selectedPromotionMatchesOrder &&
      promotionRows.length > 0 &&
      !activeEvaluationsQuery.isLoading &&
      !manualAppliedPromotion
    ),
    retry: false,
  });

  const rawPromotionCandidates = useMemo(() => {
    const offers = promotionOffersQuery.data?.data;
    if (!offers) return [];

    const stackablePromotionIds = new Set(
      offers.stackablePromotions.map((promotion) => promotionId(promotion))
    );
    const withStackability = (promotion: ApplicablePromotion) => ({
      ...promotion,
      stackable:
        promotion.stackable === true ||
        stackablePromotionIds.has(promotionId(promotion)),
    });

    return uniquePromotions(
      [
        offers.bestCoupon,
        ...offers.eligibleCoupons,
        ...offers.ineligibleCoupons,
        ...offers.autoAppliedPromotions,
        ...offers.stackablePromotions,
      ]
        .filter((promotion): promotion is ApplicablePromotion => Boolean(promotion && promotionId(promotion) > 0))
        .map(withStackability)
    );
  }, [promotionOffersQuery.data]);
  const legacyEligiblePromotionIds = useMemo(() => {
    const offers = promotionOffersQuery.data?.data;
    if (!offers) return new Set<number>();
    return new Set(
      [offers.bestCoupon, ...offers.eligibleCoupons, ...offers.autoAppliedPromotions, ...offers.stackablePromotions]
        .filter((promotion): promotion is ApplicablePromotion => Boolean(promotion && promotionId(promotion) > 0))
        .filter((promotion) => {
          if (promotion.application_mode !== "automatic" && promotion.auto_apply !== true) return true;
          const saving = Number(promotion.applied_discount || promotion.discountInfo?.discountAmount || 0);
          return saving > 0 || isFreeShippingPromotion(promotion) || promotion.type === "FREE_PRODUCT";
        })
        .map(promotionId),
    );
  }, [promotionOffersQuery.data]);
  const promotionCandidates = useMemo(() => {
    if (eligibilityPromotionIds.length > 0 && !promotionEligibilityQuery.data?.data) return [];
    const eligibility = promotionEligibilityQuery.data?.data;
    const versionedIds = new Set(eligibility?.versioned_promotion_ids ?? []);
    const v2Savings = new Map(
      (eligibility?.eligible_promotions ?? []).map((promotion) => [promotion.promotion_id, promotion.saving / 100]),
    );
    return rawPromotionCandidates
      .filter((promotion) => {
        const id = promotionId(promotion);
        return versionedIds.has(id) ? v2Savings.has(id) : legacyEligiblePromotionIds.has(id);
      })
      .map((promotion) => {
        const saving = v2Savings.get(promotionId(promotion));
        return saving === undefined
          ? promotion
          : {
            ...promotion,
            applied_discount: saving,
            discountInfo: { ...promotion.discountInfo, discountAmount: saving, savingsAmount: saving },
          };
      });
  }, [eligibilityPromotionIds, legacyEligiblePromotionIds, promotionEligibilityQuery.data, rawPromotionCandidates]);
  const promotionDetailsById = useMemo(
    // Preserve conditions/minimums even when an offer is currently
    // ineligible; compact applied-evaluation records do not include them.
    () => new Map(rawPromotionCandidates.map((promotion) => [promotionId(promotion), promotion])),
    [rawPromotionCandidates],
  );
  const promotionEvaluation = promotionEvaluationQuery.data?.data;
  const selectedPromotionApplies = selectedPromotionMatchesOrder;
  const selectedV2AppliedPromotions = selectedPromotion?.appliedPromotions ?? [];
  const liveV2AppliedPromotions: AppliedPromotion[] = (promotionsV2Quote?.applied_promotions ?? []).map(
    (promotion) => {
      const savedPromotion = selectedV2AppliedPromotions.find(
        (item) => appliedPromotionId(item) === promotion.promotion_id,
      );
      const adjustmentType = promotionsV2Quote?.adjustments.find(
        (adjustment) => adjustment.promotion_id === promotion.promotion_id,
      )?.type;
      const stackable = resolveAppliedStackable(promotionDetailsById.get(promotion.promotion_id), savedPromotion);
      return {
        promotion_id: promotion.promotion_id,
        promotion_name: promotion.name,
        promotion_type: adjustmentType ?? "V2",
        discount_amount: promotion.saving / 100,
        is_auto: !selectedPromotionIds.includes(promotion.promotion_id),
        is_free_shipping: adjustmentType === "FREE_SHIPPING",
        stackable,
        is_stacked: stackable,
      };
    },
  );
  const appliedPromotionsForTotals =
    promotionsV2Quote
      // Current-cart V2 results override saved and legacy evaluations. A
      // promotion absent from this quote is not applied to this checkout.
      ? liveV2AppliedPromotions
      : backendAppliedPromotions.length > 0
        ? backendAppliedPromotions
        : promotionEvaluation?.applied_promotions?.length
          ? promotionEvaluation.applied_promotions
          : selectedPromotionApplies
            ? selectedPromotion?.appliedPromotions ?? []
            : [];
  const fallbackPromotionDiscount =
    appliedPromotionsForTotals.length === 0
      ? Number(
        backendEvaluation?.total_discount ??
        promotionEvaluation?.total_discount ??
        (selectedPromotionApplies ? selectedPromotion?.totalDiscount : 0) ??
        0
      )
      : 0;
  const promotionSummary = getAppliedPromotionSummary(
    cartTotals,
    appliedPromotionsForTotals,
    fallbackPromotionDiscount
  );
  const v2MerchandiseDiscount = (promotionsV2Quote?.adjustments ?? []).filter((adjustment) => adjustment.type !== 'FREE_SHIPPING' && (adjustment.type !== 'FREE_ITEM' || adjustment.metadata.fulfilment === 'DISCOUNT_EXISTING')).reduce((sum, adjustment) => sum + adjustment.amount, 0) / 100;
  const v2ShippingDiscount = (promotionsV2Quote?.adjustments ?? []).filter((adjustment) => adjustment.type === 'FREE_SHIPPING').reduce((sum, adjustment) => sum + adjustment.amount, 0) / 100;
  const v2GiftAdjustments = (promotionsV2Quote?.adjustments ?? []).filter((adjustment) => adjustment.type === 'FREE_ITEM' && adjustment.metadata.fulfilment === 'AUTO_ADD');
  const useV2PromotionResult = Boolean(promotionsV2Quote);
  const promotionDiscount = useV2PromotionResult ? v2MerchandiseDiscount : promotionSummary.normalDiscount;
  const shippingSavings = useV2PromotionResult
    ? v2ShippingDiscount
    : promotionSummary.shippingSavings;
  const shipping = Math.max(0, cartTotals.shipping - shippingSavings);
  const checkoutTotal = useV2PromotionResult
    ? Math.max(0, promotionsV2Quote!.payable_total / 100)
    : promotionSummary.payableTotal;
  const isPromotionResolving = Boolean(
    promotionsV2Query.isLoading ||
    promotionsV2Query.isFetching ||
    promotionEligibilityQuery.isLoading ||
    promotionEligibilityQuery.isFetching ||
    activeEvaluationsQuery.isLoading ||
    activeEvaluationsQuery.isFetching ||
    (selectedPromotion && (promotionEvaluationQuery.isLoading || promotionEvaluationQuery.isFetching))
  );
  const merchandiseRemainingAfterPromotions = Math.max(0, cartTotals.subtotal - promotionDiscount);
  const directCouponQuery = useQuery({
    queryKey: [
      "direct-coupon-checkout-quote",
      userId,
      appliedDirectCouponCode,
      cartTotals.subtotal,
      merchandiseRemainingAfterPromotions,
    ],
    queryFn: () => couponWalletService.quoteDirectCoupon(
      appliedDirectCouponCode!,
      Number(cartTotals.subtotal.toFixed(2)),
      Number(merchandiseRemainingAfterPromotions.toFixed(2)),
    ),
    enabled: Boolean(
      userId &&
      appliedDirectCouponCode &&
      promotionRows.length > 0 &&
      !isPromotionResolving
    ),
    retry: false,
    staleTime: 0,
    placeholderData: (previous) =>
      previous?.data.code === appliedDirectCouponCode ? previous : undefined,
  });
  const directCouponQuote = appliedDirectCouponCode ? directCouponQuery.data?.data : undefined;
  const directCouponDiscount = Number(directCouponQuote?.discount_amount || 0);
  const merchandiseRemainingAfterCoupon = Math.max(
    0,
    merchandiseRemainingAfterPromotions - directCouponDiscount,
  );
  const payableBeforeWallet = Math.max(0, checkoutTotal - directCouponDiscount);
  // Coupons issued to this customer that are not in the wallet yet. They are
  // not promotion offers, so list them here and apply them by code. Coupons
  // already added to the wallet are used through the wallet instead.
  const walletCouponsQuery = useQuery({
    queryKey: ["wallet", userId],
    queryFn: () => couponWalletService.getWallet(),
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });
  const unclaimedCoupons = (walletCouponsQuery.data?.data?.available_coupons ?? []).filter(isUsableUnclaimedCoupon);
  const walletQuoteQuery = useQuery({
    queryKey: ["wallet-discount-quote", userId, cartTotals.subtotal, merchandiseRemainingAfterCoupon, shipping],
    queryFn: () => couponWalletService.quoteDiscount(
      cartTotals.subtotal,
      payableBeforeWallet,
      {
        merchandisePayable: merchandiseRemainingAfterCoupon,
        shippingPayable: shipping,
      },
    ),
    enabled: Boolean(
      userId &&
      promotionRows.length > 0 &&
      payableBeforeWallet > 0 &&
      !isPromotionResolving &&
      !directCouponQuery.isFetching
    ),
    staleTime: 1000 * 15,
    placeholderData: (previous) => previous,
  });
  const eligibleWalletBalance = Number(walletQuoteQuery.data?.data.eligible_balance || 0);
  const walletApplicableDiscount = Number(walletQuoteQuery.data?.data.discount_amount || 0);
  const walletDiscount = walletApplied ? walletApplicableDiscount : 0;
  const finalCheckoutTotal = Math.max(payableBeforeWallet - walletDiscount, 0);
  const walletCoversOrder = walletApplied && walletDiscount > 0 && finalCheckoutTotal < 0.01;
  const projectedWalletBalance = Math.max(eligibleWalletBalance - walletDiscount, 0);
  const isCheckoutPricingResolving = Boolean(
    isPromotionResolving ||
    (appliedDirectCouponCode && (directCouponQuery.isLoading || directCouponQuery.isFetching)) ||
    (walletApplied && (walletQuoteQuery.isLoading || walletQuoteQuery.isFetching))
  );
  const toggleWallet = () => {
    const next = !walletApplied;
    setWalletApplied(next);
    saveWalletApplied(userId, next);
  };
  const activeEvaluationId = useV2PromotionResult && promotionsV2Quote
    ? (hasV2AppliedBenefit ? promotionsV2Quote.evaluation_id : undefined)
    : backendEvaluation?.evaluation_id || (promotionEvaluationQuery.isError ? undefined : promotionEvaluation?.evaluation_id || selectedPromotion?.evaluationId);
  // Generic label: several offers can make up this discount.
  const promotionLabel = promotionDiscountLabel(appliedPromotionsForTotals);
  const hasPromotionDiscount = promotionDiscount > 0 || v2GiftAdjustments.length > 0 || promotionSummary.normalPromotions.length > 0 || Boolean(manualAppliedPromotion);
  const appliedPromotionIds = new Set(
    appliedPromotionsForTotals.map(appliedPromotionId).filter((id) => id > 0)
  );
  // Recommended-offer responses can omit promotions that V2 has already
  // applied (notably automatic stackable offers). Merge the authoritative
  // applied set into the display collection so totals and offer cards cannot
  // contradict each other.
  const visiblePromotionCandidates = useMemo(() => {
    const detailsById = new Map(
      promotionCandidates.map((promotion) => [promotionId(promotion), promotion]),
    );
    const appliedCandidates = appliedPromotionsForTotals
      .map((promotion): ApplicablePromotion | null => {
        const id = appliedPromotionId(promotion);
        if (id <= 0) return null;

        const details = detailsById.get(id);
        const discountAmount = Number(
          promotion.discount_amount ?? details?.discountInfo?.discountAmount ?? 0,
        );

        return {
          ...details,
          promotion_id: id,
          name: promotion.promotion_name || details?.name || `Promotion ${id}`,
          type: promotion.promotion_type || details?.type || "UNKNOWN",
          code: String(promotion.voucher_code || details?.code || "") || null,
          is_free_shipping:
            promotion.is_free_shipping === true || details?.is_free_shipping === true,
          stackable:
            promotion.stackable ??
            (promotion.is_stacked === true ? true : details?.stackable ?? false),
          promotionState: "applied",
          applied_discount: discountAmount,
          discountInfo: {
            ...details?.discountInfo,
            discountAmount,
          },
        };
      })
      .filter((promotion): promotion is ApplicablePromotion => promotion !== null);

    return uniquePromotions([...appliedCandidates, ...promotionCandidates]);
  }, [appliedPromotionsForTotals, promotionCandidates]);
  const v2MinimumRejectedPromotionIds = new Set(
    (promotionsV2Quote?.rejected_candidates ?? [])
      .filter((candidate) => candidate.reason_code === "MINIMUM_VALUE_NOT_MET" || candidate.reason_code === "MINIMUM_QUANTITY_NOT_MET")
      .map((candidate) => candidate.promotion_id),
  );
  const eligiblePromotionCandidates = visiblePromotionCandidates.filter((promotion) =>
    !v2MinimumRejectedPromotionIds.has(promotionId(promotion)) &&
    (!isFreeShippingPromotion(promotion) ||
      isFreeShippingPromotionEligible(promotion, cartTotals.subtotal))
  );
  const appliedSummaryPromotions = eligiblePromotionCandidates.filter(
    (promotion) => appliedPromotionIds.has(promotionId(promotion)),
  );
  const applyPromotionMutation = useMutation({
    mutationFn: async (promotion: ApplicablePromotion) => {
      const previousApplied = promotionsV2Quote?.applied_promotions ?? [];
      await queryClient.cancelQueries({ queryKey: checkoutPromotionsV2QueryRoot });
      const selectedId = promotionId(promotion);
      const requestedPromotionIds = [...new Set([
        ...(selectedPromotionUsesV2 ? selectedPromotionIds : []),
        selectedId,
      ])];
      try {
        const v2Response = await promotionService.calculatePromotions({
          cartItems: promotionRows.map((row) => ({
            cart_record_id: String(row.cartRecordId ?? row.productid),
            product_id: String(row.productid),
            quantity: row.quantity,
          })),
          shippingAmount: cartTotals.shipping,
          channel: "web",
          selectedPromotionIds: requestedPromotionIds,
        });
        const applied = v2Response.data.applied_promotions.some(
          (item) => item.promotion_id === selectedId,
        );
        if (!applied) {
          throw new PromotionOfferMessageError(
            describeOfferNotApplied(
              selectedId,
              v2Response.data,
              Math.round(Number(promotion.applied_discount || promotion.discountInfo?.discountAmount || 0) * 100),
            ),
          );
        }
        return { engine: "v2" as const, response: v2Response, requestedPromotionIds, previousApplied };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("PROMOTION_V2_RULE_NOT_FOUND")) throw error;
      }

      let evaluationId = backendEvaluation?.evaluation_id;
      if (!evaluationId) {
        const automaticEvaluation = await promotionService.evaluateAutomatic({
          userId: String(userId),
          cartItems: promotionEvaluationItems,
          currentTotal: cartTotals.subtotal,
          mode: "phonepe",
          channel: "web",
          geo: "IN",
        });
        evaluationId = automaticEvaluation.data.evaluation_id;
      }

      const response = await promotionService.evaluate({
        cartId: `checkout-${isBuyNowCheckout ? "buy-now" : "cart"}-${userId}`,
        userId: String(userId),
        evaluationId,
        promotionId: promotionId(promotion),
        applicationType: promotion.stackable ? "stackable_promotion" : "manual_coupon",
        cartData: promotionCartData,
        cartItems: promotionEvaluationItems,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });
      return { engine: "legacy" as const, response };
    },
    onMutate: () => setOfferNotice(null),
    onSuccess: async (result, promotion) => {
      if (!userId) return;

      if (result.engine === "v2") {
        const quote = result.response.data;
        const appliedQuoteKey = [...checkoutPromotionsV2QueryRoot, promotionSelectionKey(result.requestedPromotionIds)];
        queryClient.setQueryData(appliedQuoteKey, result.response);
        seededQuotes.mark(hashKey(appliedQuoteKey));
        const appliedPromotions: AppliedPromotion[] = quote.applied_promotions.map(
          (item) => {
            const details = promotionCandidates.find(
              (candidate) => promotionId(candidate) === item.promotion_id,
            );
            const adjustmentType = quote.adjustments.find(
              (adjustment) => adjustment.promotion_id === item.promotion_id,
            )?.type;
            const isAutomatic =
              details?.application_mode === "automatic" || details?.auto_apply === true;
            return {
              promotion_id: item.promotion_id,
              promotion_name: item.name,
              promotion_type: adjustmentType ?? details?.type ?? "V2",
              discount_amount: item.saving / 100,
              is_auto: isAutomatic,
              is_free_shipping: adjustmentType === "FREE_SHIPPING",
              stackable: resolveAppliedStackable(details),
              is_stacked: resolveAppliedStackable(details),
            };
          },
        );
        const cartDiscount = quote.adjustments
          .filter(
            (adjustment) =>
              adjustment.type !== "FREE_SHIPPING" &&
              (adjustment.type !== "FREE_ITEM" ||
                adjustment.metadata.fulfilment === "DISCOUNT_EXISTING"),
          )
          .reduce((sum, adjustment) => sum + adjustment.amount, 0) / 100;
        const nextPromotion: SelectedCartPromotion = {
          userId,
          promotionId: promotionId(promotion),
          promotionIds: result.requestedPromotionIds.filter((id) =>
            quote.applied_promotions.some((applied) => applied.promotion_id === id)
          ),
          promotionName: promotion.name,
          evaluationId: quote.evaluation_id,
          cartSignature,
          totalDiscount: cartDiscount,
          discountedTotal: quote.payable_total / 100,
          appliedPromotions,
          expiresAt: quote.expires_at,
          savedAt: Date.now(),
          engine: "v2",
        };
        saveSelectedCartPromotion(nextPromotion);
        setSelectedPromotion(nextPromotion);
        void promotionOffersQuery.refetch();
        setStatusMessage(
          describeOfferApplied(promotion.name, promotionId(promotion), quote, result.previousApplied, "order"),
        );
        setErrorMessage("");
        return;
      }

      const response = result.response;
      const evaluation = response.data;
      queryClient.setQueryData(
        ["checkout-active-promotion-evaluations", userId, cartSignature],
        response
      );
      const summary = getAppliedPromotionSummary(
        cartTotals,
        evaluation.applied_promotions ?? [],
        Number(evaluation.total_discount || 0)
      );
      const nextPromotion: SelectedCartPromotion = {
        userId,
        promotionId: promotionId(promotion),
        promotionName: promotion.name,
        evaluationId: evaluation.evaluation_id,
        cartSignature,
        totalDiscount: summary.normalDiscount,
        discountedTotal: summary.payableTotal,
        appliedPromotions: evaluation.applied_promotions ?? [],
        expiresAt: evaluation.expires_at,
        savedAt: Date.now(),
        engine: "legacy",
      };

      saveSelectedCartPromotion(nextPromotion);
      setSelectedPromotion(nextPromotion);
      void promotionOffersQuery.refetch();
      setStatusMessage(`${promotion.name} applied to your order.`);
      setErrorMessage("");
    },
    onError: (error, promotion) => {
      const message = error instanceof Error ? error.message : "Could not apply this offer.";
      if (isOfferAlreadyUsedError(message)) {
        const id = promotionId(promotion);
        if (id > 0) {
          setAlreadyUsedPromotionIds((current) => new Set(current).add(id));
        }
        setOfferActionError("");
        void promotionOffersQuery.refetch();
        return;
      }

      if (error instanceof PromotionOfferMessageError) {
        setOfferNotice({ promotionId: promotionId(promotion), message, tone: "info" });
        return;
      }

      setOfferNotice({ promotionId: promotionId(promotion), message: checkoutVoucherErrorMessage(message), tone: "error" });
    },
  });

  useEffect(() => {
    if (!appliedDirectCouponCode || !directCouponQuery.error) return;
    setOfferActionError(directCouponErrorMessage(directCouponQuery.error));
    announcedDirectCouponCodeRef.current = null;
    saveDirectCoupon(userId, null);
    setAppliedDirectCouponCode(null);
  }, [appliedDirectCouponCode, directCouponQuery.error, userId]);

  useEffect(() => {
    if (!appliedDirectCouponCode || !directCouponQuote) return;
    if (announcedDirectCouponCodeRef.current === appliedDirectCouponCode) return;
    announcedDirectCouponCodeRef.current = appliedDirectCouponCode;
    setVoucherCode("");
    setOfferActionError("");
    setErrorMessage("");
    setStatusMessage(`${directCouponQuote.name} applied to your order.`);
  }, [appliedDirectCouponCode, directCouponQuote]);

  const applyDirectCoupon = (code: string = voucherCode) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setOfferActionError("Enter your coupon code.");
      return;
    }
    if (isPromotionResolving) {
      setOfferActionError("Please wait while we confirm your current offers.");
      return;
    }
    announcedDirectCouponCodeRef.current = null;
    setOfferActionError("");
    saveDirectCoupon(userId, normalizedCode);
    setAppliedDirectCouponCode(normalizedCode);
  };

  const removeDirectCoupon = () => {
    announcedDirectCouponCodeRef.current = null;
    saveDirectCoupon(userId, null);
    setAppliedDirectCouponCode(null);
    setVoucherCode("");
    setOfferActionError("");
    setStatusMessage("Coupon removed from this order.");
  };

  const removePromotionMutation = useMutation({
    mutationFn: async (promotionIdToRemove: number) => {
      await queryClient.cancelQueries({ queryKey: checkoutPromotionsV2QueryRoot });
      if (
        selectedPromotionUsesV2 &&
        selectedPromotion?.evaluationId &&
        selectedPromotionIds.includes(promotionIdToRemove)
      ) {
        try {
          const response = await promotionService.removePromotionFromEvaluation(
            selectedPromotion.evaluationId,
            promotionIdToRemove,
          );
          return { engine: "v2" as const, response };
        } catch (error) {
          if (!isRecoverablePromotionEvaluationError(error)) throw error;

          const refreshed = await promotionService.calculatePromotions({
            cartItems: promotionRows.map((row) => ({
              cart_record_id: String(row.cartRecordId ?? row.productid),
              product_id: String(row.productid),
              quantity: row.quantity,
            })),
            shippingAmount: cartTotals.shipping,
            channel: "web",
            selectedPromotionIds,
          });
          if (!refreshed.data.applied_promotions.some((item) => item.promotion_id === promotionIdToRemove)) {
            return { engine: "v2" as const, response: refreshed };
          }
          const response = await promotionService.removePromotionFromEvaluation(
            refreshed.data.evaluation_id,
            promotionIdToRemove,
          );
          return { engine: "v2" as const, response };
        }
      }
      if (!backendEvaluation?.evaluation_id) return;
      await promotionService.removeEvaluation(backendEvaluation.evaluation_id, promotionIdToRemove);
      return { engine: "legacy" as const };
    },
    onMutate: () => setOfferNotice(null),
    onSuccess: async (result, removedPromotionId) => {
      if (result?.engine === "v2" && selectedPromotion) {
        const quote = result.response.data;
        const remainingPromotionIds = selectedCartPromotionIds(selectedPromotion).filter(
          (id) => id !== removedPromotionId && quote.applied_promotions.some((item) => item.promotion_id === id)
        );
        const remainingQuoteKey = [...checkoutPromotionsV2QueryRoot, promotionSelectionKey(remainingPromotionIds)];
        queryClient.setQueryData(remainingQuoteKey, result.response);
        seededQuotes.mark(hashKey(remainingQuoteKey));
        if (remainingPromotionIds.length > 0) {
          const primaryId = remainingPromotionIds.at(-1)!;
          const appliedPromotions: AppliedPromotion[] = preserveAppliedStacking(
            quote.applied_promotions.map((item) => {
              const adjustmentType = quote.adjustments.find(
                (adjustment) => adjustment.promotion_id === item.promotion_id,
              )?.type;
              return {
                promotion_id: item.promotion_id,
                promotion_name: item.name,
                promotion_type: adjustmentType ?? "V2",
                discount_amount: item.saving / 100,
                is_auto: !remainingPromotionIds.includes(item.promotion_id),
                is_free_shipping: adjustmentType === "FREE_SHIPPING",
              };
            }),
            selectedPromotion.appliedPromotions ?? [],
            promotionDetailsById,
          );
          const nextPromotion: SelectedCartPromotion = {
            ...selectedPromotion,
            promotionId: primaryId,
            promotionIds: remainingPromotionIds,
            promotionName: quote.applied_promotions.find((item) => item.promotion_id === primaryId)?.name ?? selectedPromotion.promotionName,
            evaluationId: quote.evaluation_id,
            totalDiscount: quote.adjustments
              .filter((adjustment) => adjustment.type !== "FREE_SHIPPING" && (adjustment.type !== "FREE_ITEM" || adjustment.metadata.fulfilment === "DISCOUNT_EXISTING"))
              .reduce((sum, adjustment) => sum + adjustment.amount, 0) / 100,
            discountedTotal: quote.payable_total / 100,
            appliedPromotions,
            expiresAt: quote.expires_at,
            savedAt: Date.now(),
          };
          saveSelectedCartPromotion(nextPromotion);
          setSelectedPromotion(nextPromotion);
        } else {
          clearSelectedCartPromotion(userId);
          setSelectedPromotion(null);
        }
        // V2 already returned the new quote; the legacy evaluation call is not needed.
        void promotionOffersQuery.refetch();
        setStatusMessage("Offer removed from your order.");
        setErrorMessage("");
        return;
      }
      clearSelectedCartPromotion(userId);
      setSelectedPromotion(null);
      await activeEvaluationsQuery.refetch();
      await promotionOffersQuery.refetch();
      setStatusMessage("Offer removed from your order.");
      setErrorMessage("");
    },
    onError: (error, promotionIdToRemove) => {
      setOfferNotice({
        promotionId: promotionIdToRemove,
        message: checkoutVoucherErrorMessage(
          error instanceof Error ? error.message : "Could not remove this offer."
        ),
        tone: "error",
      });
    },
  });

  const renderCheckoutPromotionOffer = (promotion: ApplicablePromotion) => {
    const id = promotionId(promotion);
    const v2AppliedOffer = useV2PromotionResult
      ? promotionsV2Quote?.applied_promotions.find((offer) => offer.promotion_id === id)
      : undefined;
    const appliedPromotion = appliedPromotionsForTotals.find(
      (candidate) => appliedPromotionId(candidate) === id
    );
    const isApplied = appliedPromotionIds.has(id);
    const isAlreadyUsed = alreadyUsedPromotionIds.has(id);
    const canRemove = Boolean(isApplied && appliedPromotion && !appliedPromotion.is_auto);
    // Same rule as Cart (shared helper): the V2 engine decides combinations.
    const action = getOfferActionState({
      promotion,
      isApplied,
      canRemove,
      isAlreadyUsed,
      isLoggedIn: Boolean(userId),
      freeShippingEligible:
        !isFreeShippingPromotion(promotion) || isFreeShippingPromotionEligible(promotion, cartTotals.subtotal),
      anyOfferActionPending: applyPromotionMutation.isPending || removePromotionMutation.isPending,
      pricingResolving: isPromotionResolving,
    });
    const combinationNote = isApplied ? null : offerCombinationNote(promotion);
    const offerSavings = Number(
      (v2AppliedOffer ? v2AppliedOffer.saving / 100 : 0) ||
      promotion.applied_discount ||
      promotion.discountInfo?.discountAmount ||
      0
    );
    const applyingThis = Boolean(
      applyPromotionMutation.isPending &&
        applyPromotionMutation.variables &&
        promotionId(applyPromotionMutation.variables) === id,
    );
    const removingThis = removePromotionMutation.isPending && removePromotionMutation.variables === id;
    // The label follows the running action, not the card's current state.
    const pendingLabel = applyingThis ? offerPendingLabel("apply") : removingThis ? offerPendingLabel("remove") : null;
    const busyButtonClass = action.busy && !pendingLabel ? "cursor-wait" : "";

    return (
      <div
        key={id}
        className={`rounded-xl border p-3 ${isApplied
            ? "border-emerald-200 bg-emerald-50/60"
            : isAlreadyUsed
              ? "border-[#dce3ec] bg-[#f5f7fa]"
              : "border-[#dce3ec] bg-white"
          }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold leading-5 text-[#172033]">{promotion.name}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
              {isAlreadyUsed
                ? "Already Used"
                : isFreeShippingPromotion(promotion)
                  ? "Free shipping"
                  : offerSavings > 0
                    ? `Save ${formatCurrency(offerSavings)}`
                    : "Applicable to this order"}
            </p>
            {promotion.code && (
              <span className="mt-2 inline-block max-w-full truncate rounded-md bg-[#eef1f6] px-2 py-1 font-mono text-[10px] font-bold text-[#46536b]">
                {promotion.code}
              </span>
            )}
            {combinationNote && (
              <p className="mt-2 text-[10px] leading-4 text-[#68748a]">{combinationNote}</p>
            )}
          </div>

          {action.kind === "already-used" ? (
            <button
              type="button"
              disabled
              className="shrink-0 rounded-lg bg-[#e3e7ee] px-3 py-2 text-[11px] font-extrabold text-[#68748a] disabled:cursor-not-allowed"
            >
              Already Used
            </button>
          ) : action.kind === "remove" || action.kind === "applied" ? (
            // Applied offers read as applied; removing is a quiet secondary action.
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Applied
              </span>
              {action.kind === "remove" && (
                <button
                  type="button"
                  disabled={action.disabled}
                  aria-disabled={action.busy}
                  aria-busy={Boolean(pendingLabel)}
                  onClick={() => {
                    if (!action.busy) removePromotionMutation.mutate(id);
                  }}
                  className={`inline-flex items-center gap-1 bg-transparent px-1 py-0.5 text-[11px] font-semibold text-[#68748a] underline-offset-2 hover:text-[#172033] hover:underline disabled:opacity-50 ${busyButtonClass}`}
                >
                  {pendingLabel && <Loader2 className="h-3 w-3 animate-spin" />}
                  {pendingLabel ?? "Remove"}
                </button>
              )}
            </div>
          ) : action.kind === "automatic" ? (
            <span className="shrink-0 rounded-full bg-[#fff2bd] px-2.5 py-1.5 text-[10px] font-extrabold text-[#856000]">
              Automatic
            </span>
          ) : action.kind === "use-code" ? (
            <span className="shrink-0 rounded-full bg-[#eef1f6] px-2.5 py-1.5 text-[10px] font-extrabold text-[#58657a]">
              Use code
            </span>
          ) : (
            <button
              type="button"
              disabled={action.disabled}
              aria-disabled={action.busy}
              aria-busy={Boolean(pendingLabel)}
              onClick={() => {
                if (!action.busy) applyPromotionMutation.mutate(promotion);
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-[11px] font-extrabold text-[#172033] disabled:cursor-not-allowed disabled:opacity-50 ${busyButtonClass}`}
            >
              {pendingLabel && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pendingLabel ?? "Apply"}
            </button>
          )}
        </div>
        {offerNotice?.promotionId === id && (
          <p
            className={`mt-3 rounded-lg border px-3 py-2 text-[11px] font-semibold leading-4 ${offerNoticeClassName(offerNotice.tone)}`}
            role={offerNotice.tone === "error" ? "alert" : "status"}
          >
            {offerNotice.message}
          </p>
        )}
      </div>
    );
  };

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;
  const checkoutStockIssues = enrichedItems
    .map(({ item, product, quantity }) => {
      if (isOutOfStock(product)) {
        return {
          productid: item.productid,
          message: "This item is currently out of stock.",
        };
      }

      const availableStock = getAvailableStock(product);
      if (quantity > availableStock) {
        return {
          productid: item.productid,
          message: stockLimitMessage(availableStock),
        };
      }

      return null;
    })
    .filter((issue): issue is { productid: number; message: string } => Boolean(issue));
  const checkoutStockIssueMap = new Map(checkoutStockIssues.map((issue) => [issue.productid, issue.message]));
  const checkoutBackendIssueMap = new Map(
    Object.entries(backendStockErrors).map(([productid, message]) => [Number(productid), message])
  );

  useEffect(() => {
    if (!userId || selectedPromotionUsesV2 || !backendEvaluation || !manualAppliedPromotion || !cartSignature) return;

    const nextPromotion: SelectedCartPromotion = {
      userId,
      promotionId: appliedPromotionId(manualAppliedPromotion),
      promotionName: manualAppliedPromotion.promotion_name || "Applied promotion",
      evaluationId: backendEvaluation.evaluation_id,
      cartSignature,
      totalDiscount: promotionDiscount,
      discountedTotal: checkoutTotal,
      appliedPromotions: backendAppliedPromotions,
      expiresAt: backendEvaluation.expires_at,
      savedAt: Date.now(),
    };

    const alreadySynced =
      selectedPromotion?.evaluationId === nextPromotion.evaluationId &&
      selectedPromotion?.cartSignature === nextPromotion.cartSignature &&
      selectedPromotion?.totalDiscount === nextPromotion.totalDiscount &&
      selectedPromotion?.appliedPromotions.length === nextPromotion.appliedPromotions.length;

    if (alreadySynced) return;

    saveSelectedCartPromotion(nextPromotion);
    setSelectedPromotion(nextPromotion);
  }, [
    backendAppliedPromotions,
    backendEvaluation,
    cartSignature,
    checkoutTotal,
    manualAppliedPromotion,
    promotionDiscount,
    selectedPromotion,
    selectedPromotionUsesV2,
    userId,
  ]);

  useEffect(() => {
    if (
      !userId ||
      !selectedPromotionUsesV2 ||
      !selectedPromotion ||
      selectedPromotionIds.length === 0 ||
      !promotionsV2Quote
    ) return;

    const appliedIds = new Set(promotionsV2Quote.applied_promotions.map((promotion) => promotion.promotion_id));
    if (!selectedPromotionIds.every((id) => appliedIds.has(id))) return;
    if (
      selectedPromotion.evaluationId === promotionsV2Quote.evaluation_id &&
      selectedPromotion.expiresAt === promotionsV2Quote.expires_at
    ) return;

    const refreshedPromotion: SelectedCartPromotion = {
      ...selectedPromotion,
      evaluationId: promotionsV2Quote.evaluation_id,
      expiresAt: promotionsV2Quote.expires_at,
      savedAt: Date.now(),
    };
    saveSelectedCartPromotion(refreshedPromotion);
    setSelectedPromotion(refreshedPromotion);
  }, [
    promotionsV2Quote,
    selectedPromotion,
    selectedPromotionIds,
    selectedPromotionUsesV2,
    userId,
  ]);

  useEffect(() => {
    if (!userId || !selectedPromotion || !promotionEvaluation) return;

    const nextDiscount = promotionDiscount;
    const nextTotal = checkoutTotal;
    const hasChanged =
      selectedPromotion.evaluationId !== promotionEvaluation.evaluation_id ||
      selectedPromotion.cartSignature !== cartSignature ||
      selectedPromotion.totalDiscount !== nextDiscount ||
      selectedPromotion.discountedTotal !== nextTotal;

    if (!hasChanged) return;

    const nextPromotion: SelectedCartPromotion = {
      ...selectedPromotion,
      userId,
      evaluationId: promotionEvaluation.evaluation_id,
      cartSignature,
      totalDiscount: nextDiscount,
      discountedTotal: nextTotal,
      appliedPromotions: promotionEvaluation.applied_promotions ?? [],
      expiresAt: promotionEvaluation.expires_at,
      savedAt: Date.now(),
    };

    saveSelectedCartPromotion(nextPromotion);
    setSelectedPromotion(nextPromotion);
  }, [cartSignature, checkoutTotal, promotionDiscount, promotionEvaluation, selectedPromotion, userId]);

  useEffect(() => {
    if (!userId || selectedPromotionUsesV2 || !selectedPromotion || !promotionEvaluationQuery.isError || manualAppliedPromotion) return;

    clearSelectedCartPromotion(userId);
    setSelectedPromotion(null);
  }, [manualAppliedPromotion, promotionEvaluationQuery.isError, selectedPromotion, selectedPromotionUsesV2, userId]);

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const preferredAddress = addresses.find((address) => address.isdefaultaddress) ?? addresses[0];
      setSelectedAddressId(preferredAddress.id);
      setShowAddressForm(false);
    }

    if (addresses.length === 0 && !addressesQuery.isLoading) {
      setShowAddressForm(true);
    }
  }, [addresses, addressesQuery.isLoading, selectedAddressId]);

  const persistMissingCustomerName = async (name: string) => {
    const currentUser = session?.user;
    if (!session || !currentUser || currentUser.firstname?.trim()) return;

    const response = await userService.updateProfile(currentUser.id, {
      firstname: name.trim().replace(/\s+/g, " "),
    });
    sessionService.saveSession({
      ...session,
      user: response.data,
    });
  };

  const createAddressMutation = useMutation({
    mutationFn: async (payload: AddressPayload) => {
      await persistMissingCustomerName(payload.name);
      return addressService.create(payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      setSelectedAddressId(response.data.id);
      setShowAddressForm(false);
      setEditingAddressId(null);
      setStatusMessage("Address saved.");
      setErrorMessage("");
      if (userId) {
        setAddressForm(emptyAddressForm(userId, userMobile, storedCustomerName));
      }
    },
    onError: () => {
      setErrorMessage("Could not save this address. Please check the details and try again.");
      setStatusMessage("");
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ addressId, payload }: { addressId: number; payload: AddressPayload }) => {
      await persistMissingCustomerName(payload.name);
      return addressService.update(addressId, payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      setSelectedAddressId(response.data.id);
      setShowAddressForm(false);
      setEditingAddressId(null);
      setStatusMessage("Address updated.");
      setErrorMessage("");
      if (userId) {
        setAddressForm(emptyAddressForm(userId, userMobile, storedCustomerName));
      }
    },
    onError: () => {
      setErrorMessage("Could not update this address. Please try again.");
      setStatusMessage("");
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (address: Address) => {
      const addressId = Number(address.id);
      if (!Number.isFinite(addressId)) {
        throw new Error("Could not delete this address because its id is missing.");
      }

      return addressService.remove(addressId);
    },
    onSuccess: (_, address) => {
      const addressId = Number(address.id);
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      if (selectedAddressId === addressId) {
        const nextAddress = addresses.find((address) => address.id !== addressId);
        setSelectedAddressId(nextAddress?.id ?? null);
        setShowAddressForm(!nextAddress);
      }
      if (editingAddressId === addressId) {
        setEditingAddressId(null);
        if (userId) {
          setAddressForm(emptyAddressForm(userId, userMobile, storedCustomerName));
        }
      }
      setStatusMessage("Address deleted.");
      setErrorMessage("");
    },
    onError: (error) => {
      setErrorMessage(checkoutErrorMessage(error, "Could not delete this address. Please try again."));
      setStatusMessage("");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      setBackendStockErrors({});

      if (!user || !selectedAddress) {
        throw new Error("Select a delivery address before payment.");
      }

      const payerName = selectedAddress.name.trim().replace(/\s+/g, " ");
      if (payerName.length < 2) {
        throw new Error("Enter the customer name in the selected delivery address before payment.");
      }
      await persistMissingCustomerName(payerName);

      if (checkoutStockIssues.length > 0) {
        throw new Error(`Cannot process payment. ${checkoutStockIssues.length} product(s) have stock issues.`);
      }

      if (isCheckoutPricingResolving) {
        throw new Error("Please wait while we confirm your offers and final total.");
      }
      if (appliedDirectCouponCode && !directCouponQuote) {
        throw new Error("Please remove or reapply the coupon before payment.");
      }

      const unavailableItems = enrichedItems.filter(({ product }) => !product || Number(product.price || 0) <= 0);
      if (unavailableItems.length > 0) {
        throw new Error("Some cart items are missing product details. Please refresh the cart and try again.");
      }

      // Older saved addresses may hold "+91…"; strip the prefix but never truncate.
      const payerMobile = canonicalIndianMobile(String(selectedAddress.mobilenumber));
      const orderItems = buildOrderItems(enrichedItems, user.id, selectedAddress.id);

      if (!isValidIndianMobile(payerMobile)) {
        throw new Error("Please use a valid 10-digit mobile number for payment.");
      }

      return paymentService.initiate({
        mode: "phonepe",
        payment_channel: "ecom",
        returnUrl: `${window.location.origin}/checkout/confirmation`,
        order: orderItems,
        transaction: {
          amount: Number(payableBeforeWallet.toFixed(2)),
          mobilenumber: payerMobile,
          name: payerName.replace(/[^a-zA-Z ]/g, "").trim(),
          productid: orderItems.map((item) => item.productid),
          transactionfor: "product",
          userId: user.id,
        },
        shippingCost: shipping,
        taxAmount: 0,
        evaluation_ids: activeEvaluationId ? [activeEvaluationId] : undefined,
        ...(appliedDirectCouponCode && directCouponQuote
          ? { direct_coupon: { code: appliedDirectCouponCode } }
          : {}),
        ...(walletApplied && walletDiscount > 0 ? { wallet: { apply: true, eligibility_base: Number(cartTotals.subtotal.toFixed(2)) } } : {}),
      });
    },
    onSuccess: async (response) => {
      const data = response.data;
      const redirectUrl = data.redirectUrl || data.next_steps?.phonepe?.redirectUrl;
      // The coupon is now reserved/consumed by this payment; a later Checkout
      // visit must not restore it.
      saveDirectCoupon(userId, null);

      if (data.status === "SUCCESS" && data.orderData?.order_created) {
        clearSelectedCartPromotion(userId);
        setAppliedDirectCouponCode(null);
        announcedDirectCouponCodeRef.current = null;
        saveWalletApplied(userId, false);
        setWalletApplied(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["wallet"] }),
          queryClient.invalidateQueries({ queryKey: ["wallet-discount-quote"] }),
          queryClient.invalidateQueries({ queryKey: ["direct-coupon-checkout-quote"] }),
          queryClient.invalidateQueries({ queryKey: ["cart"] }),
          queryClient.invalidateQueries({ queryKey: ["orders"] }),
        ]);
        paymentSubmissionRef.current = false;
        const confirmationParams = new URLSearchParams();
        if (data.orderData.orderId) confirmationParams.set("orderId", String(data.orderData.orderId));
        if (data.merchantTransactionId) confirmationParams.set("merchantTransactionId", data.merchantTransactionId);
        navigate(`/checkout/confirmation?${confirmationParams.toString()}`, { replace: true });
        return;
      }

      if (redirectUrl) {
        if (isPhonePeIframeCheckoutEnabled && data.merchantTransactionId) {
          const merchantTransactionId = data.merchantTransactionId;
          let iframeResultHandled = false;
          const goToConfirmation = () => {
            const params = new URLSearchParams({ merchantTransactionId });
            navigate(`/checkout/confirmation?${params.toString()}`, { replace: true });
          };

          const handleIframeResult = async (result: PhonePeCheckoutResult) => {
            if (iframeResultHandled) return;
            iframeResultHandled = true;
            setPhonePeCheckoutActive(false);
            setErrorMessage("");

            if (result === "CONCLUDED") {
              // PhonePe only promises that CONCLUDED is terminal at the
              // checkout-UI level. The confirmation page verifies the actual
              // payment state and polls while order reconciliation finishes.
              goToConfirmation();
              return;
            }

            setStatusMessage("Payment window closed. Checking the latest payment status...");
            const outcome = await fetchPaymentOutcome(merchantTransactionId);
            if (outcome === "success") {
              clearPendingPhonePePayment(userId);
              goToConfirmation();
              return;
            }

            paymentSubmissionRef.current = false;
            setStatusMessage("");
            if (outcome === "pending") {
              // Stay on Checkout. A late UPI approval is still turned into an
              // order by the webhook/Cloud Task; the next Pay click checks this
              // transaction first so the customer is not charged twice.
              setPendingPaymentId(merchantTransactionId);
              return;
            }

            clearPendingPhonePePayment(userId);
            setPendingPaymentId(null);
            setErrorMessage("Payment was cancelled. You can try again when you are ready.");
          };

          try {
            setPhonePeCheckoutActive(true);
            setPendingPaymentId(null);
            savePendingPhonePePayment(userId, merchantTransactionId);
            setStatusMessage("Opening secure PhonePe checkout...");
            setErrorMessage("");
            await openPhonePeIframe(redirectUrl, (result) => {
              void handleIframeResult(result);
            });
            return;
          } catch (error) {
            setPhonePeCheckoutActive(false);
            // Keep checkout available on browsers that block or cannot load
            // PhonePe's iframe SDK. This uses the already-created transaction.
            console.warn("PhonePe iframe checkout unavailable; using redirect fallback.", error);
          }
        }

        window.location.replace(redirectUrl);
        return;
      }

      paymentSubmissionRef.current = false;
      setStatusMessage(data.message || "Payment initiated.");
      setErrorMessage("");
    },
    onError: (error) => {
      paymentSubmissionRef.current = false;
      const apiError = error as Error & {
        data?: { error_code?: string; expected_amount?: number };
        statusCode?: number;
      };
      if (apiError.data?.error_code === "CHECKOUT_TOTAL_CHANGED") {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["cart-promotions-v2"] }),
          queryClient.invalidateQueries({ queryKey: ["checkout-active-promotion-evaluations"] }),
          queryClient.invalidateQueries({ queryKey: ["checkout-promotion-offers"] }),
          queryClient.invalidateQueries({ queryKey: ["checkout-promotion-eligibility"] }),
          queryClient.invalidateQueries({ queryKey: ["checkout-promotion-evaluation"] }),
          queryClient.invalidateQueries({ queryKey: ["wallet-discount-quote"] }),
          queryClient.invalidateQueries({ queryKey: ["direct-coupon-checkout-quote"] }),
          queryClient.invalidateQueries({ queryKey: ["cart"] }),
        ]);
        setErrorMessage("Your cart total changed while we verified the offers. Review the refreshed total and try again.");
        setStatusMessage("");
        return;
      }
      const paymentErrorText = `${apiError.data?.error_code || ""} ${apiError.message || ""}`;
      if (appliedDirectCouponCode && /(?:DIRECT_)?COUPON_/i.test(paymentErrorText)) {
        const friendlyMessage = directCouponErrorMessage(apiError);
        announcedDirectCouponCodeRef.current = null;
        saveDirectCoupon(userId, null);
        setAppliedDirectCouponCode(null);
        void queryClient.invalidateQueries({ queryKey: ["direct-coupon-checkout-quote"] });
        setOfferActionError(friendlyMessage);
        setErrorMessage(friendlyMessage);
        setStatusMessage("");
        return;
      }
      const validationErrors = extractProductValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setBackendStockErrors(validationErrors);
      }
      setErrorMessage(error instanceof Error ? error.message : "Could not start checkout. Please try again.");
      setStatusMessage("");
    },
  });

  const startPayment = () => {
    paymentSubmissionRef.current = true;
    paymentMutation.mutate();
  };

  const handlePaymentSubmission = async () => {
    // React Query updates isPending on the next render. This synchronous guard
    // closes the small window where a rapid double-click can submit twice.
    if (paymentSubmissionRef.current || paymentMutation.isPending) return;
    paymentSubmissionRef.current = true;

    if (pendingPaymentId) {
      // Check the earlier payment before charging the customer again.
      setPendingPaymentChecking(true);
      const outcome = await fetchPaymentOutcome(pendingPaymentId);
      setPendingPaymentChecking(false);
      if (outcome === "success") {
        clearPendingPhonePePayment(userId);
        navigate(`/checkout/confirmation?${new URLSearchParams({ merchantTransactionId: pendingPaymentId }).toString()}`, { replace: true });
        return;
      }
      if (outcome === "pending") {
        paymentSubmissionRef.current = false;
        setPendingPaymentPromptOpen(true);
        return;
      }
      clearPendingPhonePePayment(userId);
      setPendingPaymentId(null);
    }

    startPayment();
  };

  const payAgainDespitePendingPayment = () => {
    if (paymentSubmissionRef.current || paymentMutation.isPending) return;
    setPendingPaymentPromptOpen(false);
    clearPendingPhonePePayment(userId);
    setPendingPaymentId(null);
    startPayment();
  };

  const handleAddressSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    if (!user) return;

    if (!addressForm.name.trim() || !addressForm.address.trim() || !addressForm.city.trim() || !addressForm.state.trim()) {
      setErrorMessage("Please fill the required address fields.");
      return;
    }

    if (!isValidIndianMobile(String(addressForm.mobilenumber))) {
      setErrorMessage(INVALID_MOBILE_MESSAGE);
      return;
    }
    if (String(addressForm.pincode).length !== 6) {
      setErrorMessage("Please enter a valid 6-digit pincode.");
      return;
    }

    const payload = { ...addressForm, userid: user.id };
    if (editingAddressId) {
      updateAddressMutation.mutate({ addressId: editingAddressId, payload });
      return;
    }

    createAddressMutation.mutate(payload);
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <CreditCard className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
          <h1 className="mt-4 text-2xl font-bold text-[var(--color-text)]">Login to checkout</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Your cart will be ready after OTP login.</p>
          <Link to="/login" className="mt-6 inline-flex">
            <Button>Login with OTP</Button>
          </Link>
        </section>
      </main>
    );
  }

  if (cartQuery.isLoading || productsQuery.isLoading || (isBuyNowCheckout && buyNowProductQuery.isLoading)) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-8 sm:px-6">
        <PageSkeleton variant="checkout" />
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <PackageCheck className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
          <h1 className="mt-4 text-2xl font-bold text-[var(--color-text)]">
            {isBuyNowCheckout ? "This product is not available for checkout" : "Your cart is empty"}
          </h1>
          <Link to="/products" className="mt-6 inline-flex">
            <Button>Shop Products</Button>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">Checkout</p>
          <h1 className="text-[22px] font-semibold text-[var(--color-text)]">Complete your order</h1>

          {/* <Link
            to="/cart"
            className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-2.5 text-xs font-semibold text-[var(--color-secondary)] transition hover:bg-[var(--color-surface)] sm:min-h-9 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to cart</span>
            <span className="sm:hidden">Cart</span>
          </Link>
           */}
        </div>

        <div className="mb-8 flex items-center">
          <CheckoutStep label="Cart" state="done" value="1" onClick={() => navigate("/cart")} />
          <div className="mx-3 h-px w-10 bg-[var(--color-border)] sm:w-16" />
          <CheckoutStep label="Checkout" state="active" value="2" />
          <div className="mx-3 h-px w-10 bg-[var(--color-border)] sm:w-16" />
          <CheckoutStep label="Confirmation" state="idle" value="3" />
        </div>

        {(statusMessage || errorMessage) && (
          <div
            className={`mb-5 rounded-[var(--radius-md)] border bg-white p-4 text-sm font-semibold transition duration-300 ${notificationVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              } ${errorMessage ? "border-red-200 text-red-600" : "border-green-200 text-green-700"
              }`}
          >
            {errorMessage || statusMessage}
          </div>
        )}

        {pendingPaymentId && !phonePeCheckoutActive && (
          <div role="status" className="mb-5 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p className="font-semibold">Payment window closed.</p>
            <p>
              If you completed the payment in your UPI app, we'll confirm it automatically. You can also check{" "}
              <Link to="/payments" className="font-semibold underline">Payments</Link> in a few minutes.
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  <MapPin className="h-4 w-4 text-[var(--color-muted)]" />
                  Delivery address
                </h2>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    className="inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-2.5 text-xs font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)]"
                    onClick={() => {
                      if (showAddressForm) {
                        setShowAddressForm(false);
                        setEditingAddressId(null);
                      } else {
                        setAddressForm(emptyAddressForm(userId ?? 0, userMobile, storedCustomerName));
                        setEditingAddressId(null);
                        setShowAddressForm(true);
                      }
                    }}
                  >
                    {!showAddressForm && <Plus className="h-3.5 w-3.5" />}
                    {showAddressForm ? "Hide" : "Add"}
                  </button>
                )}
              </div>

              {addressesQuery.isLoading ? (
                <p className="text-sm text-[var(--color-muted)]">Loading addresses...</p>
              ) : addresses.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      onClick={() => setSelectedAddressId(address.id)}
                      className={`relative min-h-32 cursor-pointer rounded-[var(--radius-sm)] border p-4 pr-12 text-left transition ${selectedAddressId === address.id
                          ? "border-[var(--color-secondary)] bg-white shadow-[0_12px_30px_rgba(17,24,39,0.08)] ring-1 ring-[var(--color-secondary)]/10"
                          : "border-[var(--color-border)] bg-white hover:border-[var(--color-muted)] hover:shadow-[0_10px_24px_rgba(17,24,39,0.05)]"
                        }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedAddressId(address.id);
                        }
                      }}
                    >
                      <span
                        className={`absolute right-3 top-3 grid h-4 w-4 place-items-center rounded-full border ${selectedAddressId === address.id
                            ? "border-[var(--color-secondary)] bg-[var(--color-secondary)] text-white"
                            : "border-[var(--color-border)]"
                          }`}
                      >
                        {selectedAddressId === address.id && <CheckCircle2 className="h-2.5 w-2.5" />}
                      </span>
                      <button
                        type="button"
                        aria-label={`Edit address for ${address.name}`}
                        className="absolute bottom-3 left-4 inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--color-secondary)] transition hover:border-[var(--color-secondary)] hover:bg-[var(--color-surface)] disabled:opacity-50"
                        disabled={updateAddressMutation.isPending || deleteAddressMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedAddressId(address.id);
                          setEditingAddressId(address.id);
                          setAddressForm(addressToPayload(address));
                          setShowAddressForm(true);
                          setErrorMessage("");
                          setStatusMessage("");
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete address for ${address.name}`}
                        className="absolute bottom-3 left-20 inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--color-muted)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        disabled={deleteAddressMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (window.confirm("Delete this address?")) {
                            deleteAddressMutation.mutate(address);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                      <span className="flex items-start gap-2 pb-8">
                        <Home className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--color-text)]">{address.name}</span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
                            {address.doornumber}, {address.address}, {address.city}, {address.state} - {address.pincode}
                          </span>
                          <span className="mt-2 block text-xs text-[var(--color-muted)]">
                            {address.mobilenumber}
                          </span>
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {showAddressForm && (
                <AddressFormModal
                  open={showAddressForm}
                  title={editingAddressId ? "Edit address" : "Add new address"}
                  onClose={() => {
                    setShowAddressForm(false);
                    setEditingAddressId(null);
                    if (userId) {
                      setAddressForm(emptyAddressForm(userId, userMobile, storedCustomerName));
                    }
                  }}
                >
                  <AddressForm
                    form={addressForm}
                    isEditing={Boolean(editingAddressId)}
                    isPending={createAddressMutation.isPending || updateAddressMutation.isPending}
                    onChange={setAddressForm}
                    onCancel={() => {
                      setShowAddressForm(false);
                      setEditingAddressId(null);
                      if (userId) {
                        setAddressForm(emptyAddressForm(userId, userMobile, storedCustomerName));
                      }
                    }}
                    onSubmit={handleAddressSubmit}
                  />
                </AddressFormModal>
              )}
            </section>

            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <WalletCards className="h-4 w-4 text-[var(--color-muted)]" />
                Payment method
              </h2>

              <div className="mt-4 grid gap-2">
                <PaymentOption
                  checked
                  icon={walletCoversOrder ? <WalletCards className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                  title={walletCoversOrder ? "Pay with wallet credit" : "Pay Online"}
                  detail={walletCoversOrder ? "No external payment required" : "UPI, cards, wallets"}
                  onClick={() => undefined}
                />
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 lg:sticky lg:top-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
              <ShoppingBag className="h-4 w-4 text-[var(--color-muted)]" />
              Order summary
            </h2>
            <div className="mt-4 space-y-3">
              {enrichedItems.map(({ item, product, quantity }) => {
                const displayName = getProductDisplayName(product, `Product #${item.productid}`);

                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                      <img
                        src={productImage(product)}
                        alt={displayName}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = fallbackProduct;
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-semibold text-[var(--color-text)]">
                        {displayName}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">Qty: {quantity}</p>
                      {(checkoutStockIssueMap.has(item.productid) || checkoutBackendIssueMap.has(item.productid)) && (
                        <p className="mt-2 rounded-[var(--radius-sm)] bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600">
                          {checkoutBackendIssueMap.get(item.productid) || checkoutStockIssueMap.get(item.productid)}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs font-semibold text-[var(--color-text)]">
                      {formatCurrency(productUnitPrice(product) * quantity)}
                    </p>
                  </div>
                );
              })}
              {useV2PromotionResult && v2GiftAdjustments.map((gift) => {
                const giftProduct = products.find((product) => String(product.id) === gift.product_id);
                const giftName = getProductDisplayName(giftProduct) || `Product #${gift.product_id}`;
                return (
                  <div key={gift.adjustment_id} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[#fbbc05] bg-[#fffaf0] p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-white">
                      <img src={productImage(giftProduct)} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.src = fallbackProduct; }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-semibold text-[var(--color-text)]">{giftName}</p>
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">Promotional gift · Qty: {gift.affected_quantity}</p>
                    </div>
                    <p className="shrink-0 text-xs font-bold text-emerald-700">Free</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
              <SummaryLine label="Items total" value={formatCurrency(mrpTotal)} />
              <SummaryLine label="Product discount" value={`-${formatCurrency(productDiscount)}`} />
              {hasPromotionDiscount && (
                <SummaryLine
                  label={promotionEvaluationQuery.isError && !manualAppliedPromotion ? "Promotion" : promotionLabel}
                  value={
                    promotionEvaluationQuery.isError && !manualAppliedPromotion
                      ? "Removed"
                      : promotionDiscount > 0
                        ? `-${formatCurrency(promotionDiscount)}`
                        : "Free gift"
                  }
                />
              )}
              {directCouponDiscount > 0 && (
                <SummaryLine label="Coupon" value={`-${formatCurrency(directCouponDiscount)}`} />
              )}
              {walletDiscount > 0 && <SummaryLine label="Wallet credit" value={`-${formatCurrency(walletDiscount)}`} />}
              <SummaryLine
                label="Shipping"
                value={shipping === 0 ? "Free" : formatCurrency(shipping)}
                previousValue={shippingSavings > 0 ? formatCurrency(cartTotals.shipping) : undefined}
                highlight={shippingSavings > 0}
              />
              <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-base font-semibold text-[var(--color-text)]">
                <span>Total</span>
                <span>{formatCurrency(finalCheckoutTotal)}</span>
              </div>
              {isCheckoutPricingResolving && (
                <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-[#68748a]" role="status" aria-live="polite">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#9a6b00]" />
                  <span>Confirming your offers and final total…</span>
                </div>
              )}
            </div>

            {eligibleWalletBalance > 0 && (
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
                <div className="flex min-w-0 items-center gap-2.5"><WalletCards className="h-5 w-5 shrink-0 text-[#485470]" /><div className="min-w-0"><p className="text-sm font-bold text-[#172033]">Wallet balance {formatCurrency(eligibleWalletBalance)}</p><p className="text-[11px] text-[#68748a]">{walletApplied && walletDiscount > 0 ? `${formatCurrency(walletDiscount)} applied · ${formatCurrency(projectedWalletBalance)} after this order` : walletApplicableDiscount > 0 ? `${formatCurrency(walletApplicableDiscount)} available for this order` : "Promotional wallet credit cannot be used for shipping"}</p></div></div>
                {walletApplicableDiscount > 0 && <button type="button" onClick={toggleWallet} disabled={walletQuoteQuery.isFetching} className="shrink-0 rounded-lg bg-[#fbbc05] px-3 py-2 text-xs font-extrabold text-[#172033] disabled:opacity-50">{walletApplied ? "Remove" : "Apply"}</button>}
              </div>
            )}

            {promotionRows.length > 0 && (
              <section className="mt-5 border-t border-[var(--color-border)] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0ad] text-[#7a5700]">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-[#172033]">Offers for your order</p>
                      <p className="text-[11px] text-[#68748a]">Choose an applicable benefit</p>
                    </div>
                  </div>
                  {promotionDiscount + directCouponDiscount + shippingSavings > 0 && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                      Saved {formatCurrency(promotionDiscount + directCouponDiscount + shippingSavings)}
                    </span>
                  )}
                </div>

                {appliedDirectCouponCode && directCouponQuote ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
                      <TicketPercent className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-[#172033]">{directCouponQuote.name}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                        {directCouponQuote.code} · Save {formatCurrency(directCouponDiscount)}
                      </p>
                    </div>
                    <button type="button" onClick={removeDirectCoupon} className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[11px] font-extrabold text-emerald-700">
                      Remove
                    </button>
                  </div>
                ) : (
                  <form
                    className="mt-3 rounded-xl border border-[#dfe4ee] bg-[#f7f8fb] p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      applyDirectCoupon();
                    }}
                  >
                    <label htmlFor="checkout-voucher-code" className="flex items-center gap-2 text-xs font-extrabold text-[#26344f]">
                      <TicketPercent className="h-4 w-4 text-[#9a6b00]" />
                      Have a coupon code?
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        id="checkout-voucher-code"
                        type="text"
                        value={voucherCode}
                        onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
                        placeholder="Enter Code"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={100}
                        disabled={Boolean(appliedDirectCouponCode) || directCouponQuery.isFetching || isPromotionResolving}
                        className="min-w-0 flex-1 rounded-lg border border-[#cbd2df] bg-white px-3 py-2.5 font-mono text-xs font-bold uppercase text-[#172033] outline-none focus:border-[#fbbc05] disabled:cursor-not-allowed disabled:bg-[#edf0f5]"
                      />
                      <button
                        type="submit"
                        disabled={Boolean(appliedDirectCouponCode) || directCouponQuery.isFetching || isPromotionResolving || !voucherCode.trim()}
                        className="shrink-0 rounded-lg bg-[#26344f] px-3 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {directCouponQuery.isFetching ? "Checking..." : "Apply"}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] leading-4 text-[#68748a]">
                      Applying here uses the coupon for this order. To save it for later, add it from My Wallet instead.
                    </p>
                    {unclaimedCoupons.length > 0 && (
                      <div className="mt-3 border-t border-[#dfe4ee] pt-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#26344f]">
                          Your coupons ({unclaimedCoupons.length})
                        </p>
                        <ul className="mt-2 space-y-2">
                          {unclaimedCoupons.map((coupon) => {
                            const amount = Number(coupon.promotion.action?.value || 0);
                            const minimum = Number(
                              coupon.promotion.conditions?.find((condition) => condition.attribute === "cart.total_value")?.value || 0,
                            );
                            return (
                              <li key={coupon.id} className="flex items-center gap-3 rounded-lg border border-dashed border-[#cbd2df] bg-white p-2.5">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-extrabold text-[#172033]">
                                    {amount > 0 ? `${formatCurrency(amount)} off` : coupon.promotion.name || "Coupon"}
                                  </p>
                                  <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-[#46536b]">{coupon.code}</p>
                                  {minimum > 0 && (
                                    <p className="text-[11px] text-[#68748a]">Minimum cart {formatCurrency(minimum)}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVoucherCode(coupon.code);
                                    applyDirectCoupon(coupon.code);
                                  }}
                                  disabled={Boolean(appliedDirectCouponCode) || directCouponQuery.isFetching || isPromotionResolving}
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#fbbc05] px-3 py-2 text-[11px] font-extrabold text-[#172033] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {appliedDirectCouponCode === coupon.code ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Applying…
                                    </>
                                  ) : (
                                    "Apply"
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </form>
                )}

                {offerActionError && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
                    {offerActionError}
                  </p>
                )}

                {promotionOffersQuery.isLoading ? (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking offers
                  </div>
                ) : promotionOffersQuery.isError ? (
                  <p className="mt-3 text-xs font-semibold text-red-600">
                    Offers could not be checked. Please refresh and try again.
                  </p>
                ) : eligiblePromotionCandidates.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {appliedSummaryPromotions.length > 0 ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          {appliedSummaryPromotions.length} {appliedSummaryPromotions.length === 1 ? "offer" : "offers"} applied
                          {promotionDiscount + shippingSavings > 0 && (
                            <span className="font-semibold text-emerald-700">
                              · You save {formatCurrency(promotionDiscount + shippingSavings)}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 line-clamp-2 pl-[22px] text-[11px] leading-4 text-[#46536b]">
                          {appliedSummaryPromotions.map((promotion) => promotion.name).join(" · ")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#46536b]">
                        {eligiblePromotionCandidates.length} {eligiblePromotionCandidates.length === 1 ? "offer is" : "offers are"} available for this order.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setOffersModalOpen(true)}
                      className="w-full rounded-xl border border-[#d7deea] bg-white px-4 py-2.5 text-center text-xs font-extrabold text-[#26344f] transition hover:border-[#fbbc05] hover:bg-[#fffaf0]"
                    >
                      {appliedSummaryPromotions.length > 0 ? "View / change offers" : "View offers"} ({eligiblePromotionCandidates.length})
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    No additional promotion offers apply to this order right now.
                  </p>
                )}
              </section>
            )}

            <Button
              className="mt-5 w-full gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[var(--color-text)] shadow-[0_14px_30px_rgba(251,188,5,0.24)] hover:bg-[var(--color-secondary)] hover:text-white"
              disabled={
                !selectedAddress ||
                paymentMutation.isPending ||
                phonePeCheckoutActive ||
                pendingPaymentChecking ||
                createAddressMutation.isPending ||
                updateAddressMutation.isPending ||
                applyPromotionMutation.isPending ||
                removePromotionMutation.isPending ||
                isCheckoutPricingResolving ||
                checkoutStockIssues.length > 0 ||
                Object.keys(backendStockErrors).length > 0 ||
                finalCheckoutTotal < 0
              }
              onClick={() => void handlePaymentSubmission()}
            >
              {paymentMutation.isPending || phonePeCheckoutActive || pendingPaymentChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              {phonePeCheckoutActive
                ? "Complete payment in PhonePe"
                : pendingPaymentChecking
                ? "Checking previous payment..."
                : paymentMutation.isPending
                ? walletCoversOrder || finalCheckoutTotal <= 0
                  ? "Placing order..."
                  : "Starting payment..."
                : walletCoversOrder
                  ? "Place Order using Wallet"
                  : finalCheckoutTotal <= 0
                    ? "Place Order"
                    : `Pay ${formatCurrency(finalCheckoutTotal)} securely`}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-[var(--color-muted)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {walletCoversOrder || finalCheckoutTotal <= 0 ? "No external payment required" : "256-bit SSL encrypted checkout"}
            </p>
          </aside>
        </div>
      </section>

      {offersModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111827]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={() => setOffersModalOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="checkout-offers-title" className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between gap-4 border-b border-[#e5e9f0] px-5 py-4"><div><h2 id="checkout-offers-title" className="text-lg font-extrabold text-[#172033]">Offers</h2><p className="mt-1 text-xs text-[#68748a]">Apply or remove an offer for this order.</p>{(applyPromotionMutation.isPending || removePromotionMutation.isPending || isPromotionResolving) && <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#9a6b00]" role="status"><Loader2 className="h-3 w-3 animate-spin" />Updating total...</p>}</div><button type="button" onClick={() => setOffersModalOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1f3f7] text-[#26344f] transition hover:bg-[#e3e7ee]" aria-label="Close eligible offers"><X className="h-5 w-5" /></button></header>
            <div className="overflow-y-auto px-5 py-4"><div className="space-y-2.5">{eligiblePromotionCandidates.map(renderCheckoutPromotionOffer)}</div></div>
          </section>
        </div>
      )}

      {pendingPaymentPromptOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111827]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={() => setPendingPaymentPromptOpen(false)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="pending-payment-title" aria-describedby="pending-payment-text" className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="pending-payment-title" className="text-lg font-extrabold text-[#172033]">Previous payment still processing</h2>
            <p id="pending-payment-text" className="mt-2 text-sm leading-6 text-[#68748a]">
              If money was debited, please don't pay again. It will be confirmed shortly and your order will appear in Payments.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={payAgainDespitePendingPayment} className="min-h-10 rounded-xl border border-[#d5dae3] px-4 text-sm font-bold text-[#26344f] transition hover:bg-[#f1f3f7]">
                Pay again
              </button>
              <Button autoFocus className="rounded-xl" onClick={() => setPendingPaymentPromptOpen(false)}>
                Wait
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

function extractProductValidationErrors(error: unknown): Record<number, string> {
  const data = (error as { data?: { validation_errors?: unknown[]; errors?: unknown[] } })?.data;
  const rawErrors = Array.isArray(data?.validation_errors)
    ? data.validation_errors
    : Array.isArray(data?.errors)
      ? data.errors
      : [];

  return rawErrors.reduce<Record<number, string>>((messages, rawError) => {
    if (!rawError || typeof rawError !== "object") return messages;

    const validationError = rawError as {
      productid?: unknown;
      productname?: unknown;
      quantity?: unknown;
      available?: unknown;
      availableqty?: unknown;
      error?: unknown;
      error_code?: unknown;
    };
    const productId = Number(validationError.productid);
    if (!Number.isFinite(productId)) return messages;

    const available = Number(validationError.availableqty ?? validationError.available);
    const requested = Number(validationError.quantity);
    const productName = typeof validationError.productname === "string" ? validationError.productname : "This item";
    const backendMessage = typeof validationError.error === "string" ? validationError.error : "";

    if (Number.isFinite(available) && Number.isFinite(requested)) {
      messages[productId] = `${productName}: requested quantity exceeds the available stock.`;
      return messages;
    }

    messages[productId] = backendMessage || `${productName} has a stock validation issue.`;
    return messages;
  }, {});
}

function buildOrderItems(
  rows: Array<{ item: { id: number; productid: number }; product?: Product; quantity: number }>,
  userId: number,
  addressId: number
): PaymentOrderItem[] {
  return rows.map(({ item, product, quantity }) => {
    const price = Number(product?.price || 0);
    const discount = Number(product?.discount || 0);
    const discountedPrice = Math.max(price - discount, 0);

    return {
      addressid: addressId,
      cartId: item.id,
      discountamount: discount * quantity,
      orderamount: discountedPrice * quantity,
      productamount: price,
      productcategory: product?.category || product?.subcategory || "General",
      productid: item.productid,
      productname: product?.name || `Product ${item.productid}`,
      quantity,
      userid: userId,
    };
  });
}

function PaymentOption({
  checked,
  icon,
  title,
  detail,
  onClick,
}: {
  checked: boolean;
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-[var(--radius-sm)] border px-3.5 py-3 text-left transition ${checked
          ? "border-[var(--color-secondary)] bg-white shadow-[0_10px_24px_rgba(17,24,39,0.06)] ring-1 ring-[var(--color-secondary)]/10"
          : "border-[var(--color-border)] bg-white hover:border-[var(--color-muted)]"
        }`}
    >
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${checked
            ? "border-[var(--color-secondary)] bg-[var(--color-secondary)] text-white"
            : "border-[var(--color-muted)]"
          }`}
      >
        {checked && <CheckCircle2 className="h-2.5 w-2.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--color-text)]">{title}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--color-muted)]">{detail}</span>
      </span>
      <span className="text-[var(--color-muted)]">{icon}</span>
    </button>
  );
}

function CheckoutStep({
  label,
  state,
  value,
  onClick,
}: {
  label: string;
  state: "done" | "active" | "idle";
  value: string;
  onClick?: () => void;
}) {
  const isDone = state === "done";
  const isActive = state === "active";
  const className = `flex items-center gap-2 text-xs ${isDone ? "text-green-700" : isActive ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-muted)]"
    }`;
  const content = (
    <>
      <span
        className={`grid h-[22px] w-[22px] place-items-center rounded-full border text-[11px] font-semibold ${isDone
            ? "border-green-200 bg-green-50 text-green-700"
            : isActive
              ? "border-[var(--color-secondary)] bg-white text-[var(--color-secondary)] shadow-[0_0_0_3px_rgba(251,188,5,0.2)]"
              : "border-[var(--color-border)] text-[var(--color-muted)]"
          }`}
      >
        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : value}
      </span>
      <span>{label}</span>
    </>
  );

  if (isDone && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} appearance-none border-0 bg-transparent p-0 transition hover:bg-transparent hover:text-green-800 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2`}
        aria-label={`Go back to ${label}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className}>{content}</div>
  );
}

function SummaryLine({
  label,
  value,
  previousValue,
  highlight = false,
}: {
  label: string;
  value: string;
  previousValue?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 text-[13px] text-[var(--color-muted)]">
      <span>{label}</span>
      <span className={`font-semibold ${highlight ? "text-emerald-700" : "text-[var(--color-text)]"}`}>
        {previousValue && (
          <span className="mr-2 font-normal text-[var(--color-muted)] line-through">{previousValue}</span>
        )}
        {value}
      </span>
    </div>
  );
}

export default Checkout;

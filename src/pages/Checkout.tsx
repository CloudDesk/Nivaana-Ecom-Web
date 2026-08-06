import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
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
import { couponWalletService } from "../services/couponWalletService";
import { paymentService, type PaymentOrderItem } from "../services/paymentService";
import { platformProductService } from "../services/productPlatformService";
import {
  promotionService,
  type ApplicablePromotion,
  type AppliedPromotion,
} from "../services/promotionService";
import { sessionService } from "../services/sessionService";
import { userService } from "../services/userService";
import { Button } from "../components/ui/button";
import { productFallback as fallbackProduct } from "../assets/config.js";
import type { Product } from "../types";
import { getProductDisplayName } from "../lib/productDisplay";
import { getAvailableStock, isOutOfStock, stockLimitMessage } from "../lib/stock";
import {
  buildPromotionCartData,
  buildPromotionEvaluationCartItems,
  cartPromotionSignature,
  clearSelectedCartPromotion,
  getAppliedPromotionSummary,
  getPromotionCartTotals,
  isFreeShippingAppliedPromotion,
  isFreeShippingPromotion,
  isFreeShippingPromotionEligible,
  productUnitPrice,
  readSelectedCartPromotion,
  saveSelectedCartPromotion,
  type SelectedCartPromotion,
} from "../lib/cartPromotions";
import { readWalletApplied, saveWalletApplied } from "../lib/walletSelection";
import { isOfferAlreadyUsedError } from "../lib/notificationMessages";

const PENDING_TRANSACTION_KEY = "nivaana_pending_payment_transaction";

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
  if (normalized.includes("ALREADY APPLIED")) return "This voucher is already applied to your order.";
  if (normalized.includes("ANOTHER_PROMOTION_ALREADY_APPLIED")) return "Remove the current offer before applying another.";

  return message || "The voucher could not be redeemed.";
};

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

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
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [backendStockErrors, setBackendStockErrors] = useState<Record<number, string>>({});
  const [voucherCode, setVoucherCode] = useState("");
  const [offerActionError, setOfferActionError] = useState("");
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [alreadyUsedPromotionIds, setAlreadyUsedPromotionIds] = useState<Set<number>>(
    () => new Set()
  );
  const [walletApplied, setWalletApplied] = useState(() => readWalletApplied(userId));
  const paymentSubmissionRef = useRef(false);
  const [selectedPromotion, setSelectedPromotion] = useState<SelectedCartPromotion | null>(() =>
    readSelectedCartPromotion(user?.id)
  );

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

  const addresses = addressesQuery.data?.data ?? [];
  const allCartItems = (cartQuery.data?.data ?? []).filter((item) => item.iscart);
  const products = productsQuery.data?.data ?? [];
  const buyNowProduct = buyNowProductQuery.data?.data ?? products.find((product) => product.id === buyNowProductId);
  const cartItems = isBuyNowCheckout
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
    : allCartItems;

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
  const mrpTotal = cartTotals.mrpTotal;
  const productDiscount = cartTotals.productDiscount;
  const total = cartTotals.total;
  const selectedPromotionId = selectedPromotion?.promotionId ?? null;

  const activeEvaluationsQuery = useQuery({
    queryKey: ["checkout-active-promotion-evaluations", userId, cartSignature],
    queryFn: () =>
      promotionService.evaluateAutomatic({
        userId: String(userId),
        cartItems: promotionEvaluationItems,
        currentTotal: total,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      }),
    enabled: Boolean(userId && promotionRows.length > 0),
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

  // evaluateAutomatic is scoped to the current cart signature. Using the first
  // user-level active evaluation can attach prices/promotions from an older cart.
  const backendEvaluation = activeEvaluationsQuery.data?.data ?? null;
  const backendAppliedPromotions = backendEvaluation?.applied_promotions ?? [];
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
        currentTotal: total,
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
        selectedPromotionMatchesOrder &&
        promotionRows.length > 0 &&
        !activeEvaluationsQuery.isLoading &&
        !manualAppliedPromotion
    ),
    retry: false,
  });

  const promotionEvaluation = promotionEvaluationQuery.data?.data;
  const selectedPromotionApplies = selectedPromotionMatchesOrder;
  const appliedPromotionsForTotals =
    backendAppliedPromotions.length > 0
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
  const promotionDiscount = promotionSummary.normalDiscount;
  const shipping = promotionSummary.effectiveShipping;
  const checkoutTotal = promotionSummary.payableTotal;
  const walletQuoteQuery = useQuery({
    queryKey: ["wallet-discount-quote", userId, cartTotals.subtotal, checkoutTotal],
    queryFn: () => couponWalletService.quoteDiscount(cartTotals.subtotal, checkoutTotal),
    enabled: Boolean(userId && promotionRows.length > 0 && checkoutTotal > 0),
    staleTime: 1000 * 15,
  });
  const eligibleWalletBalance = Number(walletQuoteQuery.data?.data.eligible_balance || 0);
  const walletDiscount = walletApplied ? Number(walletQuoteQuery.data?.data.discount_amount || 0) : 0;
  const finalCheckoutTotal = Math.max(checkoutTotal - walletDiscount, 0);
  const walletCoversOrder = walletApplied && walletDiscount > 0 && finalCheckoutTotal < 0.01;
  const projectedWalletBalance = Math.max(eligibleWalletBalance - walletDiscount, 0);
  const toggleWallet = () => {
    const next = !walletApplied;
    setWalletApplied(next);
    saveWalletApplied(userId, next);
  };
  const activeEvaluationId = backendEvaluation?.evaluation_id || (promotionEvaluationQuery.isError ? undefined : promotionEvaluation?.evaluation_id || selectedPromotion?.evaluationId);
  const promotionLabel =
    promotionSummary.normalPromotions[0]?.promotion_name ||
    manualAppliedPromotion?.promotion_name ||
    selectedPromotion?.promotionName ||
    "Promotion";
  const hasPromotionDiscount = promotionDiscount > 0 || promotionSummary.normalPromotions.length > 0 || Boolean(manualAppliedPromotion);
  const appliedPromotionIds = new Set(
    appliedPromotionsForTotals.map(appliedPromotionId).filter((id) => id > 0)
  );
  const promotionCandidates = useMemo(() => {
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
        ...offers.autoAppliedPromotions,
        ...offers.stackablePromotions,
      ]
        .filter((promotion): promotion is ApplicablePromotion => Boolean(promotion && promotionId(promotion) > 0))
        .map(withStackability)
    );
  }, [promotionOffersQuery.data]);
  const eligiblePromotionCandidates = promotionCandidates.filter(
    (promotion) =>
      !isFreeShippingPromotion(promotion) ||
      isFreeShippingPromotionEligible(promotion, cartTotals.subtotal)
  );
  const hasManualPromotionApplied = appliedPromotionsForTotals.some(
    (promotion) => !promotion.is_auto && !isFreeShippingAppliedPromotion(promotion)
  );
  const allAppliedManualPromotionsAreStackable = appliedPromotionsForTotals
    .filter((promotion) => !promotion.is_auto && !isFreeShippingAppliedPromotion(promotion))
    .every((promotion) => promotion.stackable === true || promotion.is_stacked === true);
  const isPromotionResolving = Boolean(
    activeEvaluationsQuery.isLoading ||
      activeEvaluationsQuery.isFetching ||
      (selectedPromotion && (promotionEvaluationQuery.isLoading || promotionEvaluationQuery.isFetching))
  );

  const applyPromotionMutation = useMutation({
    mutationFn: async (promotion: ApplicablePromotion) => {
      let evaluationId = backendEvaluation?.evaluation_id;
      if (!evaluationId) {
        const automaticEvaluation = await promotionService.evaluateAutomatic({
          userId: String(userId),
          cartItems: promotionEvaluationItems,
          currentTotal: total,
          mode: "phonepe",
          channel: "web",
          geo: "IN",
        });
        evaluationId = automaticEvaluation.data.evaluation_id;
      }

      return promotionService.evaluate({
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
    },
    onMutate: () => setOfferActionError(""),
    onSuccess: async (response, promotion) => {
      if (!userId) return;

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
      };

      saveSelectedCartPromotion(nextPromotion);
      setSelectedPromotion(nextPromotion);
      await promotionOffersQuery.refetch();
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

      setOfferActionError(
        checkoutVoucherErrorMessage(message)
      );
    },
  });

  const redeemVoucherMutation = useMutation({
    mutationFn: async (code: string) => {
      let evaluationId = backendEvaluation?.evaluation_id;
      if (!evaluationId) {
        const automaticEvaluation = await promotionService.evaluateAutomatic({
          userId: String(userId),
          cartItems: promotionEvaluationItems,
          currentTotal: total,
          mode: "phonepe",
          channel: "web",
          geo: "IN",
        });
        evaluationId = automaticEvaluation.data.evaluation_id;
      }

      return promotionService.evaluate({
        cartId: `checkout-${isBuyNowCheckout ? "buy-now" : "cart"}-${userId}`,
        userId: String(userId),
        evaluationId,
        code,
        cartData: promotionCartData,
        cartItems: promotionEvaluationItems,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });
    },
    onMutate: () => setOfferActionError(""),
    onSuccess: async (response) => {
      if (!userId) return;

      const evaluation = response.data;
      queryClient.setQueryData(
        ["checkout-active-promotion-evaluations", userId, cartSignature],
        response
      );
      const appliedPromotions = evaluation.applied_promotions ?? [];
      const enteredCode = voucherCode.trim().toUpperCase();
      const redeemedPromotion =
        appliedPromotions.find(
          (promotion) => String(promotion.voucher_code || "").toUpperCase() === enteredCode
        ) || [...appliedPromotions].reverse().find((promotion) => !promotion.is_auto);
      const summary = getAppliedPromotionSummary(
        cartTotals,
        appliedPromotions,
        Number(evaluation.total_discount || 0)
      );

      if (redeemedPromotion && appliedPromotionId(redeemedPromotion) > 0) {
        const nextPromotion: SelectedCartPromotion = {
          userId,
          promotionId: appliedPromotionId(redeemedPromotion),
          promotionName: redeemedPromotion.promotion_name || "Voucher promotion",
          evaluationId: evaluation.evaluation_id,
          cartSignature,
          totalDiscount: summary.normalDiscount,
          discountedTotal: summary.payableTotal,
          appliedPromotions,
          expiresAt: evaluation.expires_at,
          savedAt: Date.now(),
        };
        saveSelectedCartPromotion(nextPromotion);
        setSelectedPromotion(nextPromotion);
      }

      setVoucherCode("");
      await promotionOffersQuery.refetch();
      setStatusMessage(
        redeemedPromotion?.promotion_name
          ? `${redeemedPromotion.promotion_name} applied to your order.`
          : "Offer applied to your order."
      );
      setErrorMessage("");
    },
    onError: (error) => {
      setOfferActionError(
        checkoutVoucherErrorMessage(
          error instanceof Error ? error.message : "The voucher could not be redeemed."
        )
      );
    },
  });

  const removePromotionMutation = useMutation({
    mutationFn: async (promotionIdToRemove: number) => {
      if (!backendEvaluation?.evaluation_id) return;
      await promotionService.removeEvaluation(backendEvaluation.evaluation_id, promotionIdToRemove);
    },
    onMutate: () => setOfferActionError(""),
    onSuccess: async () => {
      clearSelectedCartPromotion(userId);
      setSelectedPromotion(null);
      await activeEvaluationsQuery.refetch();
      await promotionOffersQuery.refetch();
      setStatusMessage("Offer removed from your order.");
      setErrorMessage("");
    },
    onError: (error) => {
      setOfferActionError(
        checkoutVoucherErrorMessage(
          error instanceof Error ? error.message : "Could not remove this offer."
        )
      );
    },
  });

  const renderCheckoutPromotionOffer = (promotion: ApplicablePromotion) => {
    const id = promotionId(promotion);
    const appliedPromotion = appliedPromotionsForTotals.find(
      (candidate) => appliedPromotionId(candidate) === id
    );
    const isApplied = appliedPromotionIds.has(id);
    const isAlreadyUsed = alreadyUsedPromotionIds.has(id);
    const isAutomatic = promotion.application_mode === "automatic" || promotion.auto_apply === true;
    const isCodeEntry = promotion.application_mode === "code_entry";
    const canCombine =
      !hasManualPromotionApplied ||
      (allAppliedManualPromotionsAreStackable && promotion.stackable === true);
    const canRemove = Boolean(isApplied && appliedPromotion && !appliedPromotion.is_auto);
    const offerSavings = Number(
      promotion.applied_discount || promotion.discountInfo?.discountAmount || 0
    );
    const actionPending =
      (applyPromotionMutation.isPending &&
        applyPromotionMutation.variables &&
        promotionId(applyPromotionMutation.variables) === id) ||
      (removePromotionMutation.isPending && removePromotionMutation.variables === id);

    return (
      <div key={id} className={`rounded-xl border border-[#dce3ec] p-3 ${isAlreadyUsed ? "bg-[#f5f7fa]" : "bg-white"}`}>
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
          </div>

          {isAlreadyUsed ? (
            <button
              type="button"
              disabled
              className="shrink-0 rounded-lg bg-[#e3e7ee] px-3 py-2 text-[11px] font-extrabold text-[#68748a] disabled:cursor-not-allowed"
            >
              Already Used
            </button>
          ) : isApplied ? (
            canRemove ? (
              <button
                type="button"
                disabled={actionPending}
                onClick={() => removePromotionMutation.mutate(id)}
                className="shrink-0 rounded-lg border border-emerald-300 px-3 py-2 text-[11px] font-extrabold text-emerald-700 disabled:opacity-50"
              >
                {actionPending ? "Removing..." : "Remove"}
              </button>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-700">
                Applied
              </span>
            )
          ) : isAutomatic ? (
            <span className="shrink-0 rounded-full bg-[#fff2bd] px-2.5 py-1.5 text-[10px] font-extrabold text-[#856000]">
              Automatic
            </span>
          ) : isCodeEntry ? (
            <span className="shrink-0 rounded-full bg-[#eef1f6] px-2.5 py-1.5 text-[10px] font-extrabold text-[#58657a]">
              Use code
            </span>
          ) : (
            <button
              type="button"
              disabled={actionPending || !canCombine || isPromotionResolving}
              onClick={() => applyPromotionMutation.mutate(promotion)}
              className="shrink-0 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-[11px] font-extrabold text-[#172033] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionPending ? "Applying..." : "Apply"}
            </button>
          )}
        </div>
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
    if (!userId || !backendEvaluation || !manualAppliedPromotion || !cartSignature) return;

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
    if (!userId || !selectedPromotion || !promotionEvaluationQuery.isError || manualAppliedPromotion) return;

    clearSelectedCartPromotion(userId);
    setSelectedPromotion(null);
  }, [manualAppliedPromotion, promotionEvaluationQuery.isError, selectedPromotion, userId]);

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

      if (isPromotionResolving) {
        throw new Error("Please wait while we confirm your promotion.");
      }

      const unavailableItems = enrichedItems.filter(({ product }) => !product || Number(product.price || 0) <= 0);
      if (unavailableItems.length > 0) {
        throw new Error("Some cart items are missing product details. Please refresh the cart and try again.");
      }

      const payerMobile = String(selectedAddress.mobilenumber).replace(/\D/g, "");
      const orderItems = buildOrderItems(enrichedItems, user.id, selectedAddress.id);

      if (payerMobile.length !== 10 || payerMobile.startsWith("0")) {
        throw new Error("Please use a valid 10-digit mobile number for payment.");
      }

      return paymentService.initiate({
        mode: "phonepe",
        returnUrl: `${window.location.origin}/payments`,
        order: orderItems,
        transaction: {
          amount: Number(checkoutTotal.toFixed(2)),
          mobilenumber: payerMobile,
          name: payerName.replace(/[^a-zA-Z ]/g, "").trim(),
          productid: orderItems.map((item) => item.productid),
          transactionfor: "product",
          userId: user.id,
        },
        shippingCost: shipping,
        taxAmount: 0,
        evaluation_ids: activeEvaluationId ? [activeEvaluationId] : undefined,
        ...(walletApplied && walletDiscount > 0 ? { wallet: { apply: true, eligibility_base: Number(cartTotals.subtotal.toFixed(2)) } } : {}),
      });
    },
    onSuccess: async (response) => {
      const data = response.data;
      const redirectUrl = data.redirectUrl || data.next_steps?.phonepe?.redirectUrl;

      if (redirectUrl) {
        if (data.merchantTransactionId) {
          localStorage.setItem(PENDING_TRANSACTION_KEY, data.merchantTransactionId);
        }
        window.location.replace(redirectUrl);
        return;
      }

      if (data.mode === "wallet" && data.orderData?.order_created) {
        clearSelectedCartPromotion(userId);
        saveWalletApplied(userId, false);
        setWalletApplied(false);
        localStorage.removeItem(PENDING_TRANSACTION_KEY);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["wallet"] }),
          queryClient.invalidateQueries({ queryKey: ["wallet-discount-quote"] }),
          queryClient.invalidateQueries({ queryKey: ["cart"] }),
          queryClient.invalidateQueries({ queryKey: ["orders"] }),
        ]);
        paymentSubmissionRef.current = false;
        navigate("/orders", { replace: true });
        return;
      }

      paymentSubmissionRef.current = false;
      setStatusMessage(data.message || "Payment initiated.");
      setErrorMessage("");
    },
    onError: (error) => {
      paymentSubmissionRef.current = false;
      const validationErrors = extractProductValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setBackendStockErrors(validationErrors);
      }
      setErrorMessage(error instanceof Error ? error.message : "Could not start checkout. Please try again.");
      setStatusMessage("");
    },
  });

  const handlePaymentSubmission = () => {
    // React Query updates isPending on the next render. This synchronous guard
    // closes the small window where a rapid double-click can submit twice.
    if (paymentSubmissionRef.current || paymentMutation.isPending) return;
    paymentSubmissionRef.current = true;
    paymentMutation.mutate();
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

    if (String(addressForm.mobilenumber).length !== 10 || String(addressForm.pincode).length !== 6) {
      setErrorMessage("Please enter a valid 10-digit mobile number and 6-digit pincode.");
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
      <main className="grid min-h-screen place-items-center bg-[var(--color-surface)] px-4">
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-white p-5 text-sm font-semibold text-[var(--color-secondary)] shadow-[var(--shadow-card)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading checkout
        </div>
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
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">Checkout</p>
            <h1 className="text-[22px] font-semibold text-[var(--color-text)]">Complete your order</h1>
          </div>
          <Link
            to="/cart"
            className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-2.5 text-xs font-semibold text-[var(--color-secondary)] transition hover:bg-[var(--color-surface)] sm:min-h-9 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to cart</span>
            <span className="sm:hidden">Cart</span>
          </Link>
        </div>

        <div className="mb-8 flex items-center">
          <CheckoutStep label="Cart" state="done" value="1" />
          <div className="mx-3 h-px w-10 bg-[var(--color-border)] sm:w-16" />
          <CheckoutStep label="Checkout" state="active" value="2" />
          <div className="mx-3 h-px w-10 bg-[var(--color-border)] sm:w-16" />
          <CheckoutStep label="Confirmation" state="idle" value="3" />
        </div>

        {(statusMessage || errorMessage) && (
          <div
            className={`mb-5 rounded-[var(--radius-md)] border bg-white p-4 text-sm font-semibold transition duration-300 ${
              notificationVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            } ${
              errorMessage ? "border-red-200 text-red-600" : "border-green-200 text-green-700"
            }`}
          >
            {errorMessage || statusMessage}
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
                        setAddressForm(emptyAddressForm(userId ?? 0, userMobile));
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
                      className={`relative min-h-32 cursor-pointer rounded-[var(--radius-sm)] border p-4 pr-12 text-left transition ${
                        selectedAddressId === address.id
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
                        className={`absolute right-3 top-3 grid h-4 w-4 place-items-center rounded-full border ${
                          selectedAddressId === address.id
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
                <AddressForm
                  form={addressForm}
                  isEditing={Boolean(editingAddressId)}
                  isPending={createAddressMutation.isPending || updateAddressMutation.isPending}
                  onChange={setAddressForm}
                  onCancel={() => {
                    setShowAddressForm(false);
                    setEditingAddressId(null);
                    if (userId) {
                      setAddressForm(emptyAddressForm(userId, userMobile));
                    }
                  }}
                  onSubmit={handleAddressSubmit}
                />
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
            </div>

            <div className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
              <SummaryLine label="Items total" value={formatCurrency(mrpTotal)} />
              <SummaryLine label="Product discount" value={`-${formatCurrency(productDiscount)}`} />
              <SummaryLine label="Shipping" value={shipping === 0 ? "Free" : formatCurrency(shipping)} />
              {hasPromotionDiscount && (
                <SummaryLine
                  label={promotionEvaluationQuery.isError && !manualAppliedPromotion ? "Promotion" : promotionLabel}
                  value={
                    promotionEvaluationQuery.isError && !manualAppliedPromotion
                      ? "Removed"
                      : isPromotionResolving
                        ? "Checking..."
                        : `-${formatCurrency(promotionDiscount)}`
                  }
                />
              )}
              {walletDiscount > 0 && <SummaryLine label="Wallet credit" value={`-${formatCurrency(walletDiscount)}`} />}
              <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-base font-semibold text-[var(--color-text)]">
                <span>Total</span>
                <span>{formatCurrency(finalCheckoutTotal)}</span>
              </div>
            </div>

            {eligibleWalletBalance > 0 && (
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
                <div className="flex min-w-0 items-center gap-2.5"><WalletCards className="h-5 w-5 shrink-0 text-[#485470]" /><div className="min-w-0"><p className="text-sm font-bold text-[#172033]">Wallet balance {formatCurrency(eligibleWalletBalance)}</p><p className="text-[11px] text-[#68748a]">{walletApplied ? `${formatCurrency(walletDiscount)} applied · ${formatCurrency(projectedWalletBalance)} after this order` : "Available for this order"}</p></div></div>
                <button type="button" onClick={toggleWallet} disabled={walletQuoteQuery.isFetching} className="shrink-0 rounded-lg bg-[#fbbc05] px-3 py-2 text-xs font-extrabold text-[#172033] disabled:opacity-50">{walletApplied ? "Remove" : "Apply"}</button>
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
                  {promotionDiscount + promotionSummary.shippingSavings > 0 && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                      Saved {formatCurrency(promotionDiscount + promotionSummary.shippingSavings)}
                    </span>
                  )}
                </div>

                <form
                  className="mt-3 rounded-xl border border-[#dfe4ee] bg-[#f7f8fb] p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const normalizedCode = voucherCode.trim().toUpperCase();
                    if (!normalizedCode) {
                      setOfferActionError("Enter your voucher code.");
                      return;
                    }
                    redeemVoucherMutation.mutate(normalizedCode);
                  }}
                >
                  <label
                    htmlFor="checkout-voucher-code"
                    className="flex items-center gap-2 text-xs font-extrabold text-[#26344f]"
                  >
                    <TicketPercent className="h-4 w-4 text-[#9a6b00]" />
                    Have a voucher code?
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
                      disabled={
                        redeemVoucherMutation.isPending ||
                        (hasManualPromotionApplied && !allAppliedManualPromotionsAreStackable)
                      }
                      className="min-w-0 flex-1 rounded-lg border border-[#cbd2df] bg-white px-3 py-2.5 font-mono text-xs font-bold uppercase text-[#172033] outline-none focus:border-[#fbbc05] disabled:cursor-not-allowed disabled:bg-[#edf0f5]"
                    />
                    <button
                      type="submit"
                      disabled={
                        redeemVoucherMutation.isPending ||
                        !voucherCode.trim() ||
                        (hasManualPromotionApplied && !allAppliedManualPromotionsAreStackable)
                      }
                      className="shrink-0 rounded-lg bg-[#26344f] px-3 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {redeemVoucherMutation.isPending ? "Checking..." : "Redeem"}
                    </button>
                  </div>
                  {hasManualPromotionApplied && !allAppliedManualPromotionsAreStackable && (
                    <p className="mt-2 text-[11px] leading-4 text-[#68748a]">
                      Remove the current offer before applying another code.
                    </p>
                  )}
                </form>

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
                    {eligiblePromotionCandidates.slice(0, 2).map(renderCheckoutPromotionOffer)}
                    {eligiblePromotionCandidates.length > 2 && (
                      <button type="button" onClick={() => setOffersModalOpen(true)} className="w-full rounded-xl border border-[#d7deea] bg-white px-4 py-2.5 text-center text-xs font-extrabold text-[#26344f] transition hover:border-[#fbbc05] hover:bg-[#fffaf0]">View all offers ({eligiblePromotionCandidates.length})</button>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    No offers apply to this order right now.
                  </p>
                )}
              </section>
            )}

            <Button
              className="mt-5 w-full gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[var(--color-text)] shadow-[0_14px_30px_rgba(251,188,5,0.24)] hover:bg-[var(--color-secondary)] hover:text-white"
              disabled={
                !selectedAddress ||
                paymentMutation.isPending ||
                createAddressMutation.isPending ||
                updateAddressMutation.isPending ||
                applyPromotionMutation.isPending ||
                redeemVoucherMutation.isPending ||
                removePromotionMutation.isPending ||
                isPromotionResolving ||
                checkoutStockIssues.length > 0 ||
                Object.keys(backendStockErrors).length > 0 ||
                (!walletCoversOrder && finalCheckoutTotal <= 0)
              }
              onClick={handlePaymentSubmission}
            >
              {paymentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              {paymentMutation.isPending
                ? walletCoversOrder
                  ? "Placing order..."
                  : "Starting payment..."
                : walletCoversOrder
                  ? "Place Order using Wallet"
                  : `Pay ${formatCurrency(finalCheckoutTotal)} securely`}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-[var(--color-muted)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {walletCoversOrder ? "No external payment required" : "256-bit SSL encrypted checkout"}
            </p>
          </aside>
        </div>
      </section>

      {offersModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111827]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={() => setOffersModalOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="checkout-offers-title" className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between gap-4 border-b border-[#e5e9f0] px-5 py-4"><div><h2 id="checkout-offers-title" className="text-lg font-extrabold text-[#172033]">Offers</h2><p className="mt-1 text-xs text-[#68748a]">Apply or remove an offer for this order.</p></div><button type="button" onClick={() => setOffersModalOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1f3f7] text-[#26344f] transition hover:bg-[#e3e7ee]" aria-label="Close eligible offers"><X className="h-5 w-5" /></button></header>
            {offerActionError && <p className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700" role="alert">{offerActionError}</p>}
            <div className="overflow-y-auto px-5 py-4"><div className="space-y-2.5">{eligiblePromotionCandidates.map(renderCheckoutPromotionOffer)}</div></div>
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

function AddressForm({
  form,
  isEditing,
  isPending,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: AddressPayload;
  isEditing: boolean;
  isPending: boolean;
  onChange: React.Dispatch<React.SetStateAction<AddressPayload>>;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [alternatePhone, setAlternatePhone] = useState("");
  const [addressType, setAddressType] = useState<"home" | "work">("home");

  const setField = (field: keyof AddressPayload, value: string | boolean) => {
    onChange((current) => ({
      ...current,
      [field]: field === "mobilenumber" || field === "pincode" ? Number(value) : value,
    }));
  };

  return (
    <form className="mt-5 border-t border-[var(--color-border)] pt-5" onSubmit={onSubmit}>
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_24px_rgba(17,24,39,0.04)] sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--color-secondary)]">
          {isEditing ? "Edit Address" : "Add New Address"}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={form.name} onChange={(value) => setField("name", value)} required />
          <Field
            label="10-digit mobile number"
            value={form.mobilenumber ? String(form.mobilenumber) : ""}
            inputMode="numeric"
            onChange={(value) => setField("mobilenumber", value.replace(/\D/g, "").slice(0, 10))}
            required
          />
          <Field
            label="Pincode"
            value={form.pincode ? String(form.pincode) : ""}
            inputMode="numeric"
            onChange={(value) => setField("pincode", value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <Field label="Locality" value={form.doornumber} onChange={(value) => setField("doornumber", value)} required />
          <Field
            className="sm:col-span-2"
            label="Address (Area and Street)"
            value={form.address}
            onChange={(value) => setField("address", value)}
            multiline
            required
          />
          <Field label="City/District/Town" value={form.city} onChange={(value) => setField("city", value)} required />
          <Field
            label="State"
            value={form.state}
            onChange={(value) => setField("state", value)}
            options={INDIAN_STATES}
            required
          />
          <Field label="Landmark (Optional)" value={form.landmark} onChange={(value) => setField("landmark", value)} />
          <Field
            label="Alternate Phone (Optional)"
            value={alternatePhone}
            inputMode="numeric"
            onChange={(value) => setAlternatePhone(value.replace(/\D/g, "").slice(0, 10))}
          />
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-[var(--color-muted)]">Address Type</p>
          <div className="mt-3 flex flex-wrap gap-8">
            {(["home", "work"] as const).map((type) => (
              <label key={type} className="inline-flex items-center gap-3 text-sm font-semibold capitalize text-[var(--color-text)]">
                <input
                  type="radio"
                  name="address-type"
                  checked={addressType === type}
                  onChange={() => setAddressType(type)}
                  className="h-5 w-5 accent-[var(--color-secondary)]"
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-[var(--color-text)]">
          <input
            type="checkbox"
            checked={Boolean(form.isdefaultaddress)}
            onChange={(event) => setField("isdefaultaddress", event.target.checked)}
            className="h-4 w-4 accent-[var(--color-secondary)]"
          />
          Default address
        </label>

        <div className="mt-6 flex flex-wrap items-center gap-5">
          <Button className="h-12 min-w-48 bg-[var(--color-secondary)] text-white shadow-none hover:bg-[var(--color-text)] hover:text-white hover:shadow-none" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Save"}
          </Button>
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="h-12 px-4 text-sm font-bold uppercase tracking-[0.04em] text-[var(--color-secondary)] transition hover:text-[var(--color-text)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
  inputMode,
  multiline,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  multiline?: boolean;
  options?: string[];
  required?: boolean;
}) {
  const shellClass =
    "block rounded-none border border-[var(--color-border)] bg-white px-4 py-3 transition focus-within:border-[var(--color-secondary)] focus-within:ring-1 focus-within:ring-[var(--color-secondary)]";
  const controlClass =
    "mt-1 w-full border-0 bg-transparent p-0 text-base font-medium text-[#050505] outline-none placeholder:text-[#858b94]";

  return (
    <label className={`${shellClass} ${multiline ? "min-h-28" : "min-h-[62px]"} ${className}`}>
      <span className="block text-sm font-medium text-[#767d87]">{label}</span>
      {options ? (
        <select
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={`${controlClass} appearance-auto`}
        >
          <option value="">Select state</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={`${controlClass} min-h-16 resize-none`}
        />
      ) : (
        <input
          value={value}
          inputMode={inputMode}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        />
      )}
    </label>
  );
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
      className={`flex items-center gap-3 rounded-[var(--radius-sm)] border px-3.5 py-3 text-left transition ${
        checked
          ? "border-[var(--color-secondary)] bg-white shadow-[0_10px_24px_rgba(17,24,39,0.06)] ring-1 ring-[var(--color-secondary)]/10"
          : "border-[var(--color-border)] bg-white hover:border-[var(--color-muted)]"
      }`}
    >
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
          checked
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

function CheckoutStep({ label, state, value }: { label: string; state: "done" | "active" | "idle"; value: string }) {
  const isDone = state === "done";
  const isActive = state === "active";

  return (
    <div
      className={`flex items-center gap-2 text-xs ${
        isDone ? "text-green-700" : isActive ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-muted)]"
      }`}
    >
      <span
        className={`grid h-[22px] w-[22px] place-items-center rounded-full border text-[11px] font-semibold ${
          isDone
            ? "border-green-200 bg-green-50 text-green-700"
            : isActive
              ? "border-[var(--color-secondary)] bg-white text-[var(--color-secondary)] shadow-[0_0_0_3px_rgba(251,188,5,0.2)]"
              : "border-[var(--color-border)] text-[var(--color-muted)]"
        }`}
      >
        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : value}
      </span>
      <span>{label}</span>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-[13px] text-[var(--color-muted)]">
      <span>{label}</span>
      <span className="font-semibold text-[var(--color-text)]">{value}</span>
    </div>
  );
}

export default Checkout;

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Heart,
  Loader2,
  Minus,
  Percent,
  Plus,
  Sparkles,
  TicketPercent,
  Trash2,
  Truck,
  WalletCards,
  X,
} from "lucide-react";
import { cartService } from "../services/cartService";
import { couponWalletService } from "../services/couponWalletService";
import { platformProductService } from "../services/productPlatformService";
import { promotionService, type ApplicablePromotion, type AppliedPromotion, type CurrentEvaluation } from "../services/promotionService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { Button } from "../components/ui/button";
import { toast } from "../components/toastApi";
import { productFallback as fallbackProduct } from "../assets/config.js";
import type { ApiResponse, CartItem, Product } from "../types";
import { getProductDisplayName } from "../lib/productDisplay";
import { getAvailableStock, isOutOfStock, stockLimitMessage } from "../lib/stock";
import { friendlyNotificationMessage } from "../lib/notificationMessages";
import {
  buildPromotionCartData,
  buildPromotionEvaluationCartItems,
  cartPromotionSignature,
  clearSelectedCartPromotion,
  getAppliedPromotionSummary,
  getPromotionCartTotals,
  isFreeShippingPromotion,
  isFreeShippingPromotionEligible,
  isFreeShippingAppliedPromotion,
  productUnitPrice,
  readSelectedCartPromotion,
  saveSelectedCartPromotion,
  type SelectedCartPromotion,
} from "../lib/cartPromotions";
import { readWalletApplied, saveWalletApplied } from "../lib/walletSelection";

const imageFor = (product?: { medium: string[] | null; small: string[] | null; large: string[] | null }) =>
  product?.medium?.[0] || product?.small?.[0] || product?.large?.[0] || fallbackProduct;

const quantityFor = (quantity: unknown) => {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) => `₹${Math.max(value, 0).toLocaleString("en-IN")}`;

const countDistinctProducts = (items: Array<{ productid: number }>) =>
  new Set(items.map((item) => item.productid)).size;

const promotionId = (promotion: ApplicablePromotion) =>
  promotion.promotion_id || Number((promotion as ApplicablePromotion & { id?: number }).id || 0);

const uniquePromotions = (promotions: ApplicablePromotion[]) => {
  const seen = new Set<number | string>();

  return promotions.filter((promotion) => {
    const key = promotionId(promotion) || promotion.code || promotion.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const appliedPromotionId = (promotion: AppliedPromotion) => Number(promotion.promotion_id || 0);

const isFreeShippingOffer = (promotion: ApplicablePromotion) => isFreeShippingPromotion(promotion);
const isStackablePromotion = (promotion: Pick<ApplicablePromotion, "stackable">) =>
  promotion.stackable === true;
const guestPromotionUserId = "guest-web";

const voucherErrorMessage = (message?: string) => {
  const normalized = String(message || "").toUpperCase();

  if (
    normalized.includes("PROMOTION_NOT_FOUND") ||
    normalized.includes("PROMOTION NOT FOUND")
  ) {
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
  if (normalized.includes("NOT ELIGIBLE FOR THIS CART")) return "Your cart does not currently meet this voucher's requirements.";
  if (normalized.includes("ALREADY APPLIED")) return "This voucher is already applied to your cart.";
  if (normalized.includes("ANOTHER_PROMOTION_ALREADY_APPLIED")) return "Remove the current offer before applying another.";

  return friendlyNotificationMessage(message || "The voucher could not be redeemed.");
};

const Cart: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = sessionService.getSession();
  const [, setGuestVersion] = useState(0);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [voucherCode, setVoucherCode] = useState("");
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [offerActionError, setOfferActionError] = useState<string | null>(null);
  const [walletApplied, setWalletApplied] = useState(() => readWalletApplied(session?.user.id));
  const [selectedPromotion, setSelectedPromotion] = useState<SelectedCartPromotion | null>(() =>
    readSelectedCartPromotion(session?.user.id)
  );

  useEffect(() => {
    const refresh = () => setGuestVersion((version) => version + 1);
    window.addEventListener("nivaana-guest-store-change", refresh);
    return () => window.removeEventListener("nivaana-guest-store-change", refresh);
  }, []);

  useEffect(() => {
    setSelectedPromotion(readSelectedCartPromotion(session?.user.id));
    setWalletApplied(readWalletApplied(session?.user.id));
  }, [session?.user.id]);

  useEffect(() => {
    if (!offersModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOffersModalOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [offersModalOpen]);

  const cartQuery = useQuery({
    queryKey: ["cart", session?.user.id],
    queryFn: () => cartService.getCart(session!.user.id),
    enabled: Boolean(session),
  });

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", session?.user.id],
    queryFn: () => cartService.getWishlist(session!.user.id),
    enabled: Boolean(session),
  });

  const productsQuery = useQuery({
    queryKey: ["cart-products"],
    queryFn: () => platformProductService.getProducts(1, 100),
  });

  const mutation = useMutation<
    unknown,
    Error,
    { id?: number; productid: number; userid?: number; quantity: number; iswishlist?: boolean },
    { previousCart?: ApiResponse<CartItem[]> } | undefined
  >({
    scope: { id: "cart-quantity-updates" },
    mutationFn: ({ id, productid, userid, quantity, iswishlist }) => {
      if (!session) {
        guestStoreService.updateCartQuantity(productid, quantity);
        return Promise.resolve();
      }

      if (!id) return Promise.resolve();

      if (quantity <= 0) {
        return iswishlist
          ? cartService.upsert({
              id,
              productid,
              userid: userid ?? session.user.id,
              quantity: 1,
              iscart: false,
              iswishlist: true,
            })
          : cartService.remove(id);
      }

      return cartService.upsert({
        id,
        productid,
        userid: userid ?? session.user.id,
        quantity,
        iscart: true,
        iswishlist: Boolean(iswishlist),
      });
    },
    onMutate: async ({ productid, quantity }) => {
      if (!session) return undefined;

      await queryClient.cancelQueries({ queryKey: ["cart", session.user.id] });
      const previousCart = queryClient.getQueryData<ApiResponse<CartItem[]>>(["cart", session.user.id]);

      queryClient.setQueryData<ApiResponse<CartItem[]>>(["cart", session.user.id], (current) => {
        if (!current) return current;

        return {
          ...current,
          data: current.data
            .map((cartItem) =>
              cartItem.productid === productid
                ? {
                    ...cartItem,
                    quantity: Math.max(quantity, 0),
                    iscart: quantity > 0,
                  }
                : cartItem
            )
            .filter((cartItem) => cartItem.iscart),
        };
      });

      return { previousCart };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
    },
    onError: (_error, _variables, context) => {
      if (session && context?.previousCart) {
        queryClient.setQueryData(["cart", session.user.id], context.previousCart);
      }
      toast.error("Could not update cart. Please try again.");
    },
  });

  const moveToWishlist = useMutation<unknown, Error, { id?: number; productid: number; quantity: number }>({
    mutationFn: ({ id, productid, quantity }) => {
      if (!session) {
        guestStoreService.addToWishlist(productid);
        guestStoreService.removeFromCart(productid);
        return Promise.resolve();
      }

      if (!id) return Promise.resolve();

      return cartService.upsert({
        id,
        productid,
        userid: session.user.id,
        quantity: Math.max(quantity, 1),
        iscart: false,
        iswishlist: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
      toast.success("Item saved for later.");
    },
    onError: (error) => toast.error(friendlyNotificationMessage(error.message || "Could not save item for later. Please try again.")),
  });

  const products = productsQuery.data?.data ?? [];
  const items = session ? cartQuery.data?.data ?? [] : guestStoreService.getCart();
  const wishlistItems = session ? wishlistQuery.data?.data ?? [] : guestStoreService.getWishlist();
  const wishlistCount = countDistinctProducts(wishlistItems);
  const enriched = items.map((item) => ({
    item,
    quantity: quantityFor(item.quantity),
    apiId: "id" in item && typeof item.id === "number" ? item.id : undefined,
    product: products.find((product) => product.id === item.productid),
  }));
  const promotionRows = useMemo(
    () =>
      enriched
        .filter(({ product, quantity }) => product && quantity > 0)
        .map(({ apiId, item, product, quantity }) => ({
          cartRecordId: apiId ?? item.productid,
          productid: item.productid,
          product,
          quantity,
        })),
    [enriched]
  );
  const promotionCartData = useMemo(() => buildPromotionCartData(promotionRows), [promotionRows]);
  const promotionEvaluationItems = useMemo(() => buildPromotionEvaluationCartItems(promotionRows), [promotionRows]);
  const cartSignature = useMemo(() => cartPromotionSignature(promotionRows), [promotionRows]);
  const cartTotals = useMemo(() => getPromotionCartTotals(promotionRows), [promotionRows]);
  const automaticPromotionsQueryKey = [
    "cart-automatic-promotions",
    session?.user.id,
    cartSignature,
  ] as const;

  const automaticPromotionsQuery = useQuery({
    queryKey: automaticPromotionsQueryKey,
    queryFn: () =>
      promotionService.evaluateAutomatic({
        userId: String(session!.user.id),
        cartItems: promotionEvaluationItems,
        currentTotal: cartTotals.total,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      }),
    enabled: Boolean(session?.user.id && promotionRows.length > 0 && !mutation.isPending),
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!session?.user.id || !automaticPromotionsQuery.data?.data?.evaluation_id) return;

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cart-promotion-offers", session.user.id] }),
      queryClient.invalidateQueries({ queryKey: ["cart-active-promotion-evaluations", session.user.id] }),
    ]);
  }, [automaticPromotionsQuery.dataUpdatedAt, queryClient, session?.user.id]);

  const promotionOffersQuery = useQuery({
    queryKey: ["cart-promotion-offers", session?.user.id ?? guestPromotionUserId, cartSignature],
    queryFn: () =>
      promotionService.getRecommendedOffers({
        userId: String(session?.user.id ?? guestPromotionUserId),
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
    enabled: Boolean(promotionRows.length > 0 && !mutation.isPending),
    staleTime: 1000 * 60,
  });

  const activeEvaluationsQuery = useQuery({
    queryKey: ["cart-active-promotion-evaluations", session?.user.id, cartSignature],
    queryFn: () => promotionService.getActiveEvaluations(session!.user.id),
    enabled: Boolean(session && promotionRows.length > 0 && !mutation.isPending),
    staleTime: 1000 * 30,
  });

  const refreshPromotionQueries = async () => {
    // The automatic evaluation is the source preferred by backendEvaluation,
    // so refresh it first. Refreshing only offers/evaluations leaves stale
    // applied IDs in the UI until the browser is manually reloaded.
    await automaticPromotionsQuery.refetch();
    await Promise.all([
      promotionOffersQuery.refetch(),
      activeEvaluationsQuery.refetch(),
    ]);
  };

  const promotionCandidates = useMemo(() => {
    const offers = promotionOffersQuery.data?.data;
    if (!offers) return [];

    // The offers endpoint also classifies stackable promotions in a separate
    // collection. Preserve that classification when the same promotion first
    // appears in bestCoupon/eligibleCoupons and is then de-duplicated.
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

  const promotionDetailsById = useMemo(
    () => new Map(promotionCandidates.map((promotion) => [promotionId(promotion), promotion])),
    [promotionCandidates]
  );
  const backendEvaluation = useMemo(() => {
    const refreshedEvaluation = automaticPromotionsQuery.data?.data;
    if (refreshedEvaluation) return refreshedEvaluation;

    const offerEvaluation = promotionOffersQuery.data?.data?.currentEvaluation;
    if (offerEvaluation) return offerEvaluation;

    const activeEvaluation = activeEvaluationsQuery.data?.data?.evaluations?.[0];
    if (!activeEvaluation) return null;

    return {
      evaluation_id: activeEvaluation.evaluation_id,
      original_total: activeEvaluation.original_total ?? cartTotals.total,
      discounted_total: activeEvaluation.discounted_total ?? Math.max(cartTotals.total - Number(activeEvaluation.total_discount || 0), 0),
      total_discount: activeEvaluation.total_discount,
      applied_promotions: activeEvaluation.applied_promotions ?? [],
    } satisfies CurrentEvaluation;
  }, [activeEvaluationsQuery.data, automaticPromotionsQuery.data, cartTotals.total, promotionOffersQuery.data]);

  const backendAppliedPromotions = useMemo(
    () =>
      (backendEvaluation?.applied_promotions ?? []).map((promotion) => {
        const offerDetails = promotionDetailsById.get(appliedPromotionId(promotion));
        return offerDetails
          ? {
              ...promotion,
              action: offerDetails.action,
              actions: offerDetails.actions,
              conditions: offerDetails.conditions,
              description: offerDetails.description,
              min_order_value: offerDetails.min_order_value,
              minimum_order_value: offerDetails.minimum_order_value,
              stackable: offerDetails.stackable,
            }
          : promotion;
      }),
    [backendEvaluation?.applied_promotions, promotionDetailsById]
  );
  const backendAppliedIds = useMemo(
    () => new Set(backendAppliedPromotions.map(appliedPromotionId).filter((id) => id > 0)),
    [backendAppliedPromotions]
  );
  const selectedPromotionApplies = Boolean(selectedPromotion && selectedPromotion.cartSignature === cartSignature);
  const appliedPromotionsForTotals =
    backendAppliedPromotions.length > 0
      ? backendAppliedPromotions
      : selectedPromotionApplies
        ? (selectedPromotion?.appliedPromotions ?? []).map((promotion) => {
            const offerDetails = promotionDetailsById.get(appliedPromotionId(promotion));
            return offerDetails
              ? {
                  ...promotion,
                  action: offerDetails.action,
                  actions: offerDetails.actions,
                  conditions: offerDetails.conditions,
                  description: offerDetails.description,
                  min_order_value: offerDetails.min_order_value,
                  minimum_order_value: offerDetails.minimum_order_value,
                  stackable: offerDetails.stackable,
                }
              : promotion;
          })
        : [];
  const fallbackPromotionDiscount =
    backendEvaluation && backendAppliedPromotions.length === 0
      ? Number(backendEvaluation.total_discount ?? Math.max(backendEvaluation.original_total - backendEvaluation.discounted_total, 0))
      : selectedPromotionApplies
        ? selectedPromotion?.totalDiscount ?? 0
        : 0;
  const promotionSummary = getAppliedPromotionSummary(
    cartTotals,
    appliedPromotionsForTotals,
    fallbackPromotionDiscount
  );
  const promotionDiscount = promotionSummary.normalDiscount;
  const shippingSavings = promotionSummary.shippingSavings;
  const totalPromotionSavings = promotionDiscount + shippingSavings;
  const payableTotal = promotionSummary.payableTotal;
  const walletQuoteQuery = useQuery({
    queryKey: ["wallet-discount-quote", session?.user.id, cartTotals.subtotal, payableTotal],
    queryFn: () => couponWalletService.quoteDiscount(cartTotals.subtotal, payableTotal),
    enabled: Boolean(session?.user.id && promotionRows.length > 0 && payableTotal > 0),
    staleTime: 1000 * 15,
  });
  const eligibleWalletBalance = Number(walletQuoteQuery.data?.data.eligible_balance || 0);
  const walletDiscount = walletApplied ? Number(walletQuoteQuery.data?.data.discount_amount || 0) : 0;
  const finalPayableTotal = Math.max(payableTotal - walletDiscount, 0);
  const toggleWallet = () => {
    const next = !walletApplied;
    setWalletApplied(next);
    saveWalletApplied(session?.user.id, next);
  };
  const hasManualPromotionApplied = appliedPromotionsForTotals.some(
    (promotion) =>
      !promotion.is_auto &&
      !isFreeShippingAppliedPromotion(promotion)
  );
  const appliedManualPromotions = appliedPromotionsForTotals.filter(
    (promotion) =>
      !promotion.is_auto &&
      !isFreeShippingAppliedPromotion(promotion)
  );
  const allAppliedManualPromotionsAreStackable =
    appliedManualPromotions.length > 0 &&
    appliedManualPromotions.every(
      (promotion) => promotion.stackable === true || promotion.is_stacked === true
    );
  const canCombineWithAppliedPromotions = (promotion: ApplicablePromotion) =>
    appliedManualPromotions.length === 0 ||
    (allAppliedManualPromotionsAreStackable && isStackablePromotion(promotion));

  // Private/assigned promotions may be present in the active evaluation but
  // intentionally absent from the public/recommended offer collections. Add
  // a display candidate for every applied promotion so shoppers can see and
  // remove a manual offer that is already affecting their total.
  const visiblePromotionCandidates = useMemo(() => {
    const appliedCandidates = appliedPromotionsForTotals
      .map((promotion): ApplicablePromotion | null => {
        const id = appliedPromotionId(promotion);
        if (id <= 0) return null;

        const details = promotionDetailsById.get(id);
        const discountAmount = Number(
          promotion.discount_amount ?? details?.discountInfo?.discountAmount ?? 0
        );
        const voucherCode = String(promotion.voucher_code || details?.code || "");

        return {
          ...details,
          promotion_id: id,
          name: promotion.promotion_name || details?.name || `Promotion ${id}`,
          type: promotion.promotion_type || details?.type || "UNKNOWN",
          code: voucherCode || null,
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
  }, [appliedPromotionsForTotals, promotionCandidates, promotionDetailsById]);

  useEffect(() => {
    if (!session?.user.id || !backendEvaluation || backendAppliedPromotions.length === 0 || !cartSignature) return;

    const primaryPromotion = backendAppliedPromotions.find(
      (promotion) => !promotion.is_auto && !isFreeShippingAppliedPromotion(promotion) && appliedPromotionId(promotion) > 0
    );

    if (!primaryPromotion) {
      if (selectedPromotion) {
        clearSelectedCartPromotion(session.user.id);
        setSelectedPromotion(null);
      }
      return;
    }

    const nextPromotion: SelectedCartPromotion = {
      userId: session.user.id,
      promotionId: appliedPromotionId(primaryPromotion),
      promotionName: primaryPromotion.promotion_name || "Applied promotion",
      evaluationId: backendEvaluation.evaluation_id,
      cartSignature,
      totalDiscount: promotionDiscount,
      discountedTotal: payableTotal,
      appliedPromotions: backendAppliedPromotions,
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
    payableTotal,
    promotionDiscount,
    selectedPromotion,
    session?.user.id,
  ]);

  useEffect(() => {
    if (!session?.user.id || !selectedPromotion || !cartSignature) return;

    if (selectedPromotion.cartSignature !== cartSignature) {
      clearSelectedCartPromotion(session.user.id);
      setSelectedPromotion(null);
    }
  }, [cartSignature, selectedPromotion, session?.user.id]);

  const applyPromotionMutation = useMutation({
    mutationFn: async (promotion: ApplicablePromotion) => {
      // Match the mobile flow: create the automatic evaluation only when one
      // does not already exist. Recreating it here would erase previously
      // selected stackable promotions before adding the next one.
      let evaluationId = backendEvaluation?.evaluation_id;
      if (!evaluationId) {
        const automaticEvaluation = await promotionService.evaluateAutomatic({
          userId: String(session!.user.id),
          cartItems: promotionEvaluationItems,
          currentTotal: cartTotals.total,
          mode: "phonepe",
          channel: "web",
          geo: "IN",
        });
        evaluationId = automaticEvaluation.data.evaluation_id;
      }

      return promotionService.evaluate({
        cartId: `cart-${session!.user.id}`,
        userId: String(session!.user.id),
        evaluationId,
        promotionId: promotionId(promotion),
        applicationType: promotion.stackable
          ? "stackable_promotion"
          : "manual_coupon",
        cartData: promotionCartData,
        cartItems: promotionEvaluationItems,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });
    },
    onMutate: () => setOfferActionError(null),
    onSuccess: async (response, promotion) => {
      if (!session?.user.id) return;

      const evaluation = response.data;
      queryClient.setQueryData(automaticPromotionsQueryKey, response);
      const evaluationSummary = getAppliedPromotionSummary(
        cartTotals,
        evaluation.applied_promotions ?? [],
        Number(evaluation.total_discount || 0)
      );
      const nextPromotion: SelectedCartPromotion = {
        userId: session.user.id,
        promotionId: promotionId(promotion),
        promotionName: promotion.name,
        evaluationId: evaluation.evaluation_id,
        cartSignature,
        totalDiscount: evaluationSummary.normalDiscount,
        discountedTotal: evaluationSummary.payableTotal,
        appliedPromotions: evaluation.applied_promotions ?? [],
        expiresAt: evaluation.expires_at,
        savedAt: Date.now(),
      };

      saveSelectedCartPromotion(nextPromotion);
      setSelectedPromotion(nextPromotion);
      setOfferActionError(null);
      await Promise.all([
        promotionOffersQuery.refetch(),
        activeEvaluationsQuery.refetch(),
      ]);
      toast.success(`${promotion.name} applied to your cart.`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Could not apply this promotion. Please try another offer.";

      if (message.toLowerCase().includes("already applied")) {
        const alreadyAppliedMessage = "This offer is already applied to your cart.";
        setOfferActionError(alreadyAppliedMessage);
        toast.warning(alreadyAppliedMessage);
        return;
      }

      const friendlyMessage = friendlyNotificationMessage(message);
      setOfferActionError(friendlyMessage);
      toast.error(friendlyMessage);
    },
  });

  const redeemVoucherMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!session?.user.id) {
        throw new Error("Please log in to redeem a customer voucher.");
      }
      if (promotionEvaluationItems.length === 0) {
        throw new Error("Add an item to your cart before redeeming a voucher.");
      }
      let evaluationId = backendEvaluation?.evaluation_id;
      if (!evaluationId) {
        const automaticEvaluation = await promotionService.evaluateAutomatic({
          userId: String(session.user.id),
          cartItems: promotionEvaluationItems,
          currentTotal: cartTotals.total,
          mode: "phonepe",
          channel: "web",
          geo: "IN",
        });
        evaluationId = automaticEvaluation.data.evaluation_id;
      }

      return promotionService.evaluate({
        cartId: `cart-${session.user.id}`,
        userId: String(session.user.id),
        evaluationId,
        code,
        cartData: promotionCartData,
        cartItems: promotionEvaluationItems,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });
    },
    onMutate: () => setOfferActionError(null),
    onSuccess: async (response) => {
      if (!session?.user.id) return;

      const evaluation = response.data;
      queryClient.setQueryData(automaticPromotionsQueryKey, response);
      const appliedPromotions = evaluation.applied_promotions ?? [];
      const evaluationSummary = getAppliedPromotionSummary(
        cartTotals,
        appliedPromotions,
        Number(evaluation.total_discount || 0)
      );
      const enteredCode = voucherCode.trim().toUpperCase();
      const redeemedPromotion =
        appliedPromotions.find(
          (promotion) =>
            String(promotion.voucher_code || "").toUpperCase() === enteredCode
        ) ||
        [...appliedPromotions].reverse().find((promotion) => !promotion.is_auto);

      if (redeemedPromotion && appliedPromotionId(redeemedPromotion) > 0) {
        const nextPromotion: SelectedCartPromotion = {
          userId: session.user.id,
          promotionId: appliedPromotionId(redeemedPromotion),
          promotionName: redeemedPromotion.promotion_name || "Voucher promotion",
          evaluationId: evaluation.evaluation_id,
          cartSignature,
          totalDiscount: evaluationSummary.normalDiscount,
          discountedTotal: evaluationSummary.payableTotal,
          appliedPromotions,
          expiresAt: evaluation.expires_at,
          savedAt: Date.now(),
        };
        saveSelectedCartPromotion(nextPromotion);
        setSelectedPromotion(nextPromotion);
      }

      setVoucherCode("");
      setOfferActionError(null);
      await Promise.all([
        promotionOffersQuery.refetch(),
        activeEvaluationsQuery.refetch(),
      ]);
      toast.success(
        redeemedPromotion?.promotion_name
          ? `${redeemedPromotion.promotion_name} applied to your cart.`
          : "Offer applied to your cart."
      );
    },
    onError: (error) => {
      const message = voucherErrorMessage(
        error instanceof Error ? error.message : "The voucher could not be redeemed."
      );
      setOfferActionError(message);
      toast.error(message);
    },
  });

  const removePromotionMutation = useMutation({
    mutationFn: async (promotionIdToRemove: number) => {
      if (!session?.user.id || promotionIdToRemove <= 0) return { localOnly: true };

      const backendContainsPromotion = Boolean(
        backendEvaluation?.applied_promotions?.some(
          (promotion) => appliedPromotionId(promotion) === promotionIdToRemove
        )
      );
      const selectedContainsPromotion = Boolean(
        selectedPromotion?.appliedPromotions?.some(
          (promotion) => appliedPromotionId(promotion) === promotionIdToRemove
        )
      );
      const evaluationId = backendContainsPromotion
        ? backendEvaluation?.evaluation_id
        : selectedContainsPromotion
          ? selectedPromotion?.evaluationId
          : undefined;

      // A promotion visible only in local cart state has already disappeared
      // from the active backend evaluation. Clearing that stale state is the
      // correct removal action and avoids sending an unrelated evaluation ID.
      if (!evaluationId) return { localOnly: true };

      try {
        await promotionService.removeEvaluation(evaluationId, promotionIdToRemove);
        return { localOnly: false };
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (
          message.includes("promotion not found in applied promotions") ||
          message.includes("evaluation not found") ||
          message.includes("evaluation is not active")
        ) {
          return { localOnly: true };
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await refreshPromotionQueries();
      clearSelectedCartPromotion(session?.user.id);
      setSelectedPromotion(null);
      toast.success("Offer removed from your cart.");
    },
    onError: (error) => {
      toast.error(friendlyNotificationMessage(error instanceof Error ? error.message : "Could not remove this promotion. Please try again."));
    },
  });

  const updateQuantity = ({
    apiId,
    product,
    productid,
    quantity,
    nextQuantity,
    iswishlist,
  }: {
    apiId?: number;
    product?: Product;
    productid: number;
    quantity: number;
    nextQuantity: number;
    iswishlist?: boolean;
  }) => {
    setItemErrors((current) => {
      const next = { ...current };
      delete next[productid];
      return next;
    });

    if (nextQuantity > quantity) {
      const availableStock = getAvailableStock(product);

      if (isOutOfStock(product)) {
        setItemErrors((current) => ({
          ...current,
          [productid]: "This item is out of stock. Save it for later or remove it from your cart.",
        }));
        toast.warning("This item is out of stock. Save it for later or remove it from your cart.");
        return;
      }

      if (nextQuantity > availableStock) {
        const message = stockLimitMessage(availableStock);
        setItemErrors((current) => ({
          ...current,
          [productid]: message,
        }));
        toast.warning(message);
        return;
      }
    }

    mutation.mutate({
      id: apiId,
      productid,
      userid: session?.user.id,
      quantity: nextQuantity,
      iswishlist,
    });
  };

  const getPromotionDisplayState = (promotion: ApplicablePromotion) => {
    const id = promotionId(promotion);
    const freeShippingOffer = isFreeShippingOffer(promotion);
    const freeShippingEligible =
      !freeShippingOffer || isFreeShippingPromotionEligible(promotion, cartTotals.subtotal);
    const appliedPromotion = appliedPromotionsForTotals.find(
      (item) => appliedPromotionId(item) === id
    );
    const freeShippingApplied =
      freeShippingOffer && freeShippingEligible && Boolean(appliedPromotion);
    const isApplied =
      freeShippingApplied ||
      (freeShippingEligible &&
        (backendAppliedIds.has(id) ||
          (selectedPromotionApplies && selectedPromotion?.promotionId === id)));
    const canRemove = Boolean(isApplied && appliedPromotion && !appliedPromotion.is_auto);

    return {
      id,
      freeShippingOffer,
      freeShippingEligible,
      freeShippingApplied,
      isApplied,
      canRemove,
    };
  };

  const renderPromotionOffer = (promotion: ApplicablePromotion) => {
    const state = getPromotionDisplayState(promotion);

    return (
      <PromotionOffer
        key={state.id}
        promotion={promotion}
        isPending={
          applyPromotionMutation.isPending &&
          promotionId(applyPromotionMutation.variables) === state.id
        }
        isRemoving={
          removePromotionMutation.isPending &&
          removePromotionMutation.variables === state.id
        }
        isApplied={state.isApplied}
        isDisabled={
          !session ||
          !state.freeShippingEligible ||
          (!state.isApplied &&
            !state.freeShippingOffer &&
            !canCombineWithAppliedPromotions(promotion))
        }
        shippingSavings={state.freeShippingApplied ? shippingSavings : 0}
        onApply={() => applyPromotionMutation.mutate(promotion)}
        onRemove={
          state.canRemove
            ? () => removePromotionMutation.mutate(state.id)
            : undefined
        }
      />
    );
  };

  const eligiblePromotionCandidates = visiblePromotionCandidates.filter(
    (promotion) => getPromotionDisplayState(promotion).freeShippingEligible
  );
  const summaryPromotions = [
    ...eligiblePromotionCandidates.filter(
      (promotion) => getPromotionDisplayState(promotion).isApplied
    ),
    ...eligiblePromotionCandidates.filter(
      (promotion) => !getPromotionDisplayState(promotion).isApplied
    ),
  ].slice(0, 2);

  const checkoutValidationMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user.id || !backendEvaluation?.evaluation_id) return null;
      return promotionService.validateForCheckout(
        backendEvaluation.evaluation_id,
        session.user.id,
      );
    },
    onSuccess: async (response) => {
      if (!response || response.data.is_valid) {
        navigate("/checkout");
        return;
      }

      clearSelectedCartPromotion(session?.user.id);
      setSelectedPromotion(null);
      await automaticPromotionsQuery.refetch();
      await Promise.all([
        promotionOffersQuery.refetch(),
        activeEvaluationsQuery.refetch(),
      ]);
      toast.warning("Your available promotions changed. The cart total has been refreshed; please review it before checkout.");
    },
    onError: (error) => {
      toast.error(friendlyNotificationMessage(
        error instanceof Error ? error.message : "Could not validate the cart promotions. Please try again.",
      ));
    },
  });

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Cart</h1>
          <Link
            to="/wishlist"
            className="relative inline-flex min-h-10 shrink-0 items-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-text)] shadow-sm md:hidden"
          >
            Go to Wishlist
            {wishlistCount > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-secondary)] px-1.5 text-[11px] font-bold leading-none text-white shadow-sm">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </Link>
        </div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {items.length} items in your cart{session ? "" : " as guest"}
        </p>
        {!session && items.length > 0 && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-muted)]">
            Login before checkout and we will move these guest items into your account.
            <Link to="/login?redirect=/cart" className="ml-2 font-bold text-[var(--color-secondary)]">Login</Link>
          </div>
        )}
        {session && cartQuery.isLoading ? (
          <div className="mt-8 rounded-[var(--radius-md)] bg-white p-8 text-sm text-[var(--color-muted)]">Loading cart...</div>
        ) : items.length === 0 ? (
          <EmptyState title="Your cart is empty" />
        ) : productsQuery.isLoading ? (
          <CartLoadingState itemCount={items.length} />
        ) : productsQuery.isError ? (
          <div className="mt-8 rounded-[var(--radius-md)] border border-red-200 bg-white p-6 text-sm font-semibold text-red-600 shadow-[var(--shadow-card)]">
            Could not load product details for your cart. Please refresh and try again.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,0.9fr)_460px]">
            <div className="space-y-4">
              {enriched.map(({ apiId, item, product, quantity }) => {
                const displayName = getProductDisplayName(product, `Product #${item.productid}`);

                return (
                <article key={`${item.productid}-${apiId ?? "guest"}`} className="relative flex gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] sm:gap-4">
                  <Link
                    to={`/products/${item.productid}`}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface)] sm:h-24 sm:w-24"
                    aria-label={`View ${displayName}`}
                  >
                    <img
                      src={imageFor(product)}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = fallbackProduct;
                      }}
                    />
                  </Link>
                  <div className="min-w-0 flex-1 pr-16 sm:pr-20">
                    <Link
                      to={`/products/${item.productid}`}
                      className="line-clamp-2 text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-secondary)] sm:text-base"
                    >
                      {displayName}
                    </Link>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">Qty: {quantity}</p>
                    {(itemErrors[item.productid] || isOutOfStock(product) || quantity > getAvailableStock(product)) && (
                      <p className="mt-2 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                          {itemErrors[item.productid] ||
                          (isOutOfStock(product)
                            ? "This item is out of stock. Save it for later or remove it from your cart."
                            : stockLimitMessage(getAvailableStock(product)))}
                      </p>
                    )}
                    <div className="mt-3 flex flex-nowrap items-center gap-2">
                      <div className="inline-flex h-9 items-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white">
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center bg-white text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:opacity-50"
                          disabled={mutation.isPending}
                          onClick={() =>
                            updateQuantity({
                              apiId,
                              product,
                              productid: item.productid,
                              quantity,
                              nextQuantity: quantity - 1,
                              iswishlist: item.iswishlist,
                            })
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-8 border-x border-[var(--color-border)] px-2 text-center text-sm font-semibold text-[var(--color-text)]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center bg-white text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:opacity-50"
                          disabled={mutation.isPending || isOutOfStock(product) || quantity >= getAvailableStock(product)}
                          onClick={() =>
                            updateQuantity({
                              apiId,
                              product,
                              productid: item.productid,
                              quantity,
                              nextQuantity: quantity + 1,
                              iswishlist: item.iswishlist,
                            })
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <Button
                        variant="secondary"
                        className="h-9 w-9 !border-[var(--color-border)] !bg-white px-0 !text-[var(--color-text)] hover:!border-[var(--color-primary)] hover:!bg-[var(--color-primary)]/15"
                        disabled={moveToWishlist.isPending || mutation.isPending}
                        aria-label={`Save ${displayName} for later`}
                        onClick={() =>
                          moveToWishlist.mutate({
                            id: apiId,
                            productid: item.productid,
                            quantity,
                          })
                        }
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 w-9 !border !border-[var(--color-border)] !bg-white px-0 !text-red-600 hover:!border-red-200 hover:!bg-red-50"
                        disabled={mutation.isPending}
                        onClick={() =>
                          updateQuantity({
                            apiId,
                            product,
                            productid: item.productid,
                            quantity,
                            nextQuantity: 0,
                            iswishlist: item.iswishlist,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="absolute right-4 top-4 text-right text-sm font-bold text-[var(--color-secondary)]">
                    {formatCurrency(productUnitPrice(product))}
                  </div>
                </article>
                );
              })}
            </div>
            <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Order Summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <SummaryLine label="Items total" value={formatCurrency(cartTotals.subtotal)} />
                <SummaryLine
                  label="Shipping"
                  value={promotionSummary.effectiveShipping === 0 ? "Free" : formatCurrency(promotionSummary.effectiveShipping)}
                  previousValue={shippingSavings > 0 ? formatCurrency(cartTotals.shipping) : undefined}
                  highlight={shippingSavings > 0}
                />
                {promotionDiscount > 0 && <SummaryLine label="Promotion" value={`-${formatCurrency(promotionDiscount)}`} />}
                {walletDiscount > 0 && <SummaryLine label="Wallet credit" value={`-${formatCurrency(walletDiscount)}`} />}
                <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-base font-bold text-[var(--color-text)]">
                  <span>Total</span>
                  <strong>{formatCurrency(finalPayableTotal)}</strong>
                </div>
              </div>

              {session && eligibleWalletBalance > 0 && (
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <WalletCards className="h-5 w-5 shrink-0 text-[#485470]" />
                    <div className="min-w-0"><p className="text-sm font-bold text-[#172033]">Wallet balance {formatCurrency(eligibleWalletBalance)}</p><p className="text-[11px] text-[#68748a]">Available for this cart</p></div>
                  </div>
                  <button type="button" onClick={toggleWallet} disabled={walletQuoteQuery.isFetching} className="shrink-0 rounded-lg bg-[#fbbc05] px-3 py-2 text-xs font-extrabold text-[#172033] disabled:opacity-50">{walletApplied ? "Remove" : "Apply"}</button>
                </div>
              )}

              {promotionRows.length > 0 && (
                <div className="mt-5 border-t border-[var(--color-border)] pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0ad] text-[#7a5700]">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-[#172033]">Offers for your cart</p>
                        <p className="text-[11px] text-[#68748a]">Choose the best available benefit</p>
                      </div>
                    </div>
                    {totalPromotionSavings > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                        Saved {formatCurrency(totalPromotionSavings)}
                      </span>
                    )}
                  </div>

                  <form
                    className="mt-3 rounded-2xl border border-[#dfe4ee] bg-[#f7f8fb] p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const normalizedCode = voucherCode.trim().toUpperCase();
                      if (!normalizedCode) {
                        toast.warning("Enter your voucher code.");
                        return;
                      }
                      redeemVoucherMutation.mutate(normalizedCode);
                    }}
                  >
                    <label
                      htmlFor="cart-voucher-code"
                      className="flex items-center gap-2 text-xs font-extrabold text-[#26344f]"
                    >
                      <TicketPercent className="h-4 w-4 text-[#9a6b00]" />
                      Have a voucher code?
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        id="cart-voucher-code"
                        type="text"
                        value={voucherCode}
                        onChange={(event) =>
                          setVoucherCode(event.target.value.toUpperCase())
                        }
                        placeholder="Enter Code"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={100}
                        disabled={
                          redeemVoucherMutation.isPending ||
                          !session ||
                          (hasManualPromotionApplied && !allAppliedManualPromotionsAreStackable)
                        }
                        className="min-w-0 flex-1 rounded-xl border border-[#cbd2df] bg-white px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.04em] text-[#172033] outline-none transition placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-[#929bad] focus:border-[#fbbc05] focus:ring-2 focus:ring-[#fbbc05]/20 disabled:cursor-not-allowed disabled:bg-[#edf0f5]"
                      />
                      <button
                        type="submit"
                        disabled={
                          redeemVoucherMutation.isPending ||
                          !voucherCode.trim() ||
                          !session ||
                          (hasManualPromotionApplied && !allAppliedManualPromotionsAreStackable)
                        }
                        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[#26344f] px-4 text-xs font-extrabold text-white transition hover:bg-[#364765] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {redeemVoucherMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Redeem"
                        )}
                      </button>
                    </div>
                    {(!session || (hasManualPromotionApplied && !allAppliedManualPromotionsAreStackable)) && (
                      <p className="mt-2 text-[11px] leading-4 text-[#68748a]">
                        {!session
                          ? "Log in with the mobile number that received the voucher."
                          : "Remove the current offer before applying another code."}
                      </p>
                    )}
                  </form>

                  {promotionOffersQuery.isLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking offers
                    </div>
                  ) : promotionOffersQuery.isError ? (
                    <p className="mt-3 text-xs font-semibold text-red-600">
                      Offers could not be checked. Please refresh and try again.
                    </p>
                  ) : summaryPromotions.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {summaryPromotions.map(renderPromotionOffer)}
                      <button
                        type="button"
                        onClick={() => {
                          setOfferActionError(null);
                          setOffersModalOpen(true);
                        }}
                        className="flex w-full items-center justify-center rounded-xl border border-[#d7deea] bg-white px-4 py-2.5 text-xs font-extrabold text-[#26344f] transition hover:border-[#fbbc05] hover:bg-[#fffaf0]"
                      >
                        View all offers ({eligiblePromotionCandidates.length})
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--color-muted)]">No offers apply to this cart right now.</p>
                  )}
                </div>
              )}
              {session ? (
                <Button
                  className="mt-5 w-full"
                  disabled={checkoutValidationMutation.isPending || automaticPromotionsQuery.isFetching}
                  onClick={() => checkoutValidationMutation.mutate()}
                >
                  {(checkoutValidationMutation.isPending || automaticPromotionsQuery.isFetching) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Checkout
                </Button>
              ) : (
                <Link to="/login?redirect=/checkout" className="mt-5 block"><Button className="w-full">Login to Checkout</Button></Link>
              )}
            </aside>
          </div>
        )}
      </section>

      {offersModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111827]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          onMouseDown={() => setOffersModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="eligible-offers-title"
            className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#e5e9f0] px-5 py-4">
              <div>
                <h2 id="eligible-offers-title" className="text-lg font-extrabold text-[#172033]">
                  Offers
                </h2>
                <p className="mt-1 text-xs text-[#68748a]">
                  Apply or remove an offer for this cart.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOffersModalOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1f3f7] text-[#26344f] transition hover:bg-[#e3e7ee]"
                aria-label="Close eligible offers"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {offerActionError && (
              <div
                className="mx-5 mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="min-w-0 flex-1">{offerActionError}</p>
                <button
                  type="button"
                  className="shrink-0 text-red-500 hover:text-red-700"
                  onClick={() => setOfferActionError(null)}
                  aria-label="Dismiss offer error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="overflow-y-auto px-5 py-4">
              <div className="space-y-2.5">
                {eligiblePromotionCandidates.map(renderPromotionOffer)}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

function PromotionOffer({
  promotion,
  isPending,
  isRemoving,
  isApplied,
  isDisabled,
  shippingSavings,
  onApply,
  onRemove,
}: {
  promotion: ApplicablePromotion;
  isPending: boolean;
  isRemoving: boolean;
  isApplied: boolean;
  isDisabled: boolean;
  shippingSavings: number;
  onApply: () => void;
  onRemove?: () => void;
}) {
  const appliedSavings = Number(promotion.applied_discount || 0);
  const discountValue = Number(
    promotion.discount_value ||
      (appliedSavings > 0 ? 0 : promotion.discountInfo?.discountAmount) ||
      0
  );
  const freeShipping = isFreeShippingOffer(promotion);
  const discountType = `${promotion.type || ""} ${promotion.discount_type || ""} ${promotion.action?.type || ""}`.toLowerCase();
  const percentageDiscount = discountType.includes("percent");
  const potentialSavings = Number(
    appliedSavings ||
      promotion.discountInfo?.discountAmount ||
      (percentageDiscount ? 0 : discountValue)
  );
  const benefitLabel = freeShipping
    ? shippingSavings > 0
      ? `Saved ${formatCurrency(shippingSavings)} shipping`
      : "Free shipping"
    : potentialSavings > 0
      ? `Save ${formatCurrency(potentialSavings)}`
      : percentageDiscount && discountValue > 0
        ? `${discountValue}% off`
        : "Special offer";

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition ${
        isApplied
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-[#dfe4ee] bg-white hover:border-[#fbbc05]/70 hover:shadow-sm"
      }`}
    >
      <div className="flex items-stretch">
        <div
          className={`flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 ${
            isApplied
              ? "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white"
              : freeShipping
                ? "bg-gradient-to-b from-[#15867c] to-[#27a89a] text-white"
                : "bg-gradient-to-b from-[#344461] to-[#53617e] text-white"
          }`}
        >
          {freeShipping ? (
            <Truck className="h-5 w-5" />
          ) : percentageDiscount ? (
            <Percent className="h-5 w-5" />
          ) : (
            <WalletCards className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-extrabold leading-5 text-[#172033]">
                {promotion.name}
              </p>
              <p className={`mt-1 text-xs font-bold ${isApplied ? "text-emerald-700" : "text-[#9a6b00]"}`}>
                {benefitLabel}
              </p>
            </div>
            <Button
              className={`h-9 min-h-9 shrink-0 gap-1.5 rounded-xl px-3 text-xs shadow-none ${
                isApplied
                  ? "!border !border-emerald-200 !bg-white !text-emerald-700 hover:!bg-white"
                  : "!bg-[#fbbc05] !text-[#172033] hover:!bg-[#ffd042]"
              }`}
              disabled={isPending || isRemoving || (isApplied ? !onRemove : isDisabled)}
              variant={isApplied ? "secondary" : "primary"}
              onClick={isApplied && onRemove ? onRemove : onApply}
            >
              {isPending || isRemoving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isApplied && onRemove ? (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </>
              ) : isApplied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Applied
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
          {promotion.code && (
            <div className="mt-2 inline-flex max-w-full rounded-lg bg-[#eef1f6] px-2.5 py-1 font-mono text-[11px] font-bold text-[#485470]">
              <span className="truncate">{promotion.code}</span>
            </div>
          )}
        </div>
      </div>
    </div>
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
    <div className="flex justify-between gap-4 text-[var(--color-muted)]">
      <span>{label}</span>
      <span className={`font-semibold ${highlight ? "text-emerald-700" : "text-[var(--color-text)]"}`}>
        {previousValue && (
          <span className="mr-2 font-normal text-[var(--color-muted)] line-through">
            {previousValue}
          </span>
        )}
        {value}
      </span>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="mt-8 rounded-[var(--radius-md)] bg-white p-10 text-center shadow-[var(--shadow-card)]">
      <h2 className="text-xl font-bold">{title}</h2>
      <Link to="/products" className="mt-5 inline-flex"><Button>Shop Products</Button></Link>
    </div>
  );
}

function CartLoadingState({ itemCount }: { itemCount: number }) {
  const rows = Array.from({ length: Math.max(itemCount, 1) });

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,0.9fr)_460px]">
      <div className="space-y-4">
        {rows.map((_, index) => (
          <article
            key={index}
            className="flex gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]"
          >
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface)]" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--color-surface)]" />
              <div className="mt-3 h-4 w-20 animate-pulse rounded bg-[var(--color-surface)]" />
              <div className="mt-5 flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--color-secondary)]" />
                <span className="text-sm font-semibold text-[var(--color-muted)]">Loading product details</span>
              </div>
            </div>
            <div className="h-5 w-16 animate-pulse rounded bg-[var(--color-surface)]" />
          </article>
        ))}
      </div>
      <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Order Summary</h2>
        <div className="mt-5 h-10 animate-pulse rounded bg-[var(--color-surface)]" />
      </aside>
    </div>
  );
}

export default Cart;

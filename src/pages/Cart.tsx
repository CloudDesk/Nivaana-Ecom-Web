import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { hashKey, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PageSkeleton } from "../components/PageSkeleton";
import { toast } from "../components/toastApi";
import { productFallback as fallbackProduct } from "../assets/config.js";
import type { ApiResponse, CartItem, Product } from "../types";
import { getAvailableStock, isOutOfStock, stockLimitMessage } from "../lib/stock";
import { friendlyNotificationMessage, isOfferAlreadyUsedError } from "../lib/notificationMessages";
import {
  buildPromotionCartData,
  buildPromotionEvaluationCartItems,
  cartPromotionSignature,
  clearSelectedCartPromotion,
  createSeededQuoteTracker,
  getAppliedPromotionSummary,
  getPromotionCartTotals,
  describeOfferApplied,
  describeOfferNotApplied,
  getOfferActionState,
  isRecoverablePromotionEvaluationError,
  isFreeShippingPromotion,
  isFreeShippingPromotionEligible,
  isFreeShippingAppliedPromotion,
  offerCombinationNote,
  offerNoticeClassName,
  offerPendingLabel,
  preserveAppliedStacking,
  promotionDiscountLabel,
  productUnitPrice,
  PromotionOfferMessageError,
  readSelectedCartPromotion,
  resolveAppliedStackable,
  promotionSelectionKey,
  saveSelectedCartPromotion,
  selectedCartPromotionIds,
  type OfferActionState,
  type OfferNotice,
  type SelectedCartPromotion,
} from "../lib/cartPromotions";
import { readWalletApplied, saveWalletApplied } from "../lib/walletSelection";

const imageFor = (product?: { medium: string[] | null; small: string[] | null; large: string[] | null }) =>
  product?.medium?.[0] || product?.small?.[0] || product?.large?.[0] || fallbackProduct;

const quantityFor = (quantity: unknown) => {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
  `₹${Math.max(value, 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

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
const showPromotionCalculationBreakdown = false;

const Cart: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = sessionService.getSession();
  const [, setGuestVersion] = useState(0);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [offerActionError, setOfferActionError] = useState<string | null>(null);
  // "Not applied" feedback sits on the offer's own card, not in an error banner.
  const [offerNotice, setOfferNotice] = useState<OfferNotice | null>(null);

  useEffect(() => {
    // Closing the offers pop-up resets its feedback.
    if (!offersModalOpen) setOfferNotice(null);
  }, [offersModalOpen]);
  const [alreadyUsedPromotionIds, setAlreadyUsedPromotionIds] = useState<Set<number>>(
    () => new Set()
  );
  const [walletApplied, setWalletApplied] = useState(() => readWalletApplied(session?.user.id));
  const seededQuotes = useRef(createSeededQuoteTracker()).current;
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
    staleTime: 0,
    refetchOnMount: "always",
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
  const selectedV2PromotionIds = useMemo(
    () =>
      selectedPromotion?.engine === "v2" && selectedPromotion.cartSignature === cartSignature
        ? selectedCartPromotionIds(selectedPromotion)
        : [],
    [cartSignature, selectedPromotion],
  );
  const promotionsV2QueryRoot = ["cart-promotions-v2", session?.user.id, cartSignature] as const;
  const promotionsV2QueryKey = [
    ...promotionsV2QueryRoot,
    promotionSelectionKey(selectedV2PromotionIds),
  ] as const;
  const promotionsV2Query = useQuery({
    queryKey: promotionsV2QueryKey,
    queryFn: () => promotionService.calculatePromotions({
      cartItems: promotionRows.map((row) => ({ cart_record_id: String(row.cartRecordId ?? row.productid), product_id: String(row.productid), quantity: row.quantity })),
      shippingAmount: cartTotals.shipping,
      channel: "web",
      previewOnly: !session,
      selectedPromotionIds: selectedV2PromotionIds.length ? selectedV2PromotionIds : undefined,
    }),
    enabled: Boolean(
      promotionRows.length > 0 &&
      !mutation.isPending,
    ),
    // A quote just returned by Apply/Remove is not fetched again straight away.
    staleTime: (query) => seededQuotes.staleTime(query.queryHash),
    retry: false,
  });
  const promotionsV2Quote = promotionsV2Query.data?.data;
  const hasSelectedV2Promotion = Boolean(
    selectedV2PromotionIds.length > 0
  );
  const useV2PromotionResult = Boolean(
    promotionsV2Quote
  );
  const hasV2AppliedBenefit = Boolean(
    promotionsV2Quote &&
    (promotionsV2Quote.applied_promotions.length > 0 || promotionsV2Quote.adjustments.length > 0)
  );
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
        currentTotal: cartTotals.subtotal,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      }),
    // V2 is the canonical quote and already includes legacy automatic offers.
    // Only fall back to the legacy evaluator when V2 itself is unavailable.
    enabled: Boolean(session?.user.id && promotionRows.length > 0 && !mutation.isPending && promotionsV2Query.isError),
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
    queryKey: ["cart-promotion-offers", session?.user.id, cartSignature],
    queryFn: () =>
      promotionService.getRecommendedOffers({
        userId: String(session!.user.id),
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
    enabled: Boolean(session?.user.id && promotionRows.length > 0 && !mutation.isPending),
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

  const rawPromotionCandidates = useMemo(() => {
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
      uniquePromotions([
        offers.bestCoupon,
        ...offers.eligibleCoupons,
        ...offers.autoAppliedPromotions,
        ...offers.stackablePromotions,
      ].filter((promotion): promotion is ApplicablePromotion => Boolean(promotion)))
        .filter((promotion) => {
          if (promotion.application_mode !== "automatic" && promotion.auto_apply !== true) return true;
          const saving = Number(promotion.applied_discount || promotion.discountInfo?.discountAmount || 0);
          return saving > 0 || isFreeShippingPromotion(promotion) || promotion.type === "FREE_PRODUCT";
        })
        .map(promotionId)
        .filter((id) => id > 0),
    );
  }, [promotionOffersQuery.data]);

  const eligibilityPromotionIds = useMemo(
    () => rawPromotionCandidates.map(promotionId).filter((id) => id > 0).sort((left, right) => left - right),
    [rawPromotionCandidates],
  );
  const promotionEligibilityQuery = useQuery({
    queryKey: ["cart-promotion-eligibility", session?.user.id, cartSignature, eligibilityPromotionIds.join(",")],
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
    enabled: Boolean(session?.user.id && eligibilityPromotionIds.length > 0 && promotionRows.length > 0 && !mutation.isPending),
    staleTime: 0,
    retry: false,
  });

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
      (backendEvaluation?.applied_promotions ?? []).filter((promotion) => {
        const id = appliedPromotionId(promotion);
        const eligibility = promotionEligibilityQuery.data?.data;
        const versionedIds = new Set(eligibility?.versioned_promotion_ids ?? []);
        const eligibleIds = new Set((eligibility?.eligible_promotions ?? []).map((item) => item.promotion_id));
        if (versionedIds.has(id) && !eligibleIds.has(id)) return false;
        const discount = Number(promotion.discount_amount ?? 0);
        const freeItems = Number(promotion.bogo_details?.free_items_count ?? promotion.free_product_details?.granted_items_count ?? 0);
        return discount > 0 || isFreeShippingAppliedPromotion(promotion) || freeItems > 0;
      }).map((promotion) => {
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
    [backendEvaluation?.applied_promotions, promotionDetailsById, promotionEligibilityQuery.data]
  );
  const backendAppliedIds = useMemo(
    () => new Set(backendAppliedPromotions.map(appliedPromotionId).filter((id) => id > 0)),
    [backendAppliedPromotions]
  );
  const selectedPromotionApplies = Boolean(selectedPromotion && selectedPromotion.cartSignature === cartSignature);
  const selectedV2AppliedPromotions = selectedPromotion?.appliedPromotions ?? [];
  const liveV2AppliedPromotions: AppliedPromotion[] = (promotionsV2Quote?.applied_promotions ?? []).map(
    (promotion) => {
      const details = promotionDetailsById.get(promotion.promotion_id);
      const savedPromotion = selectedV2AppliedPromotions.find(
        (item) => appliedPromotionId(item) === promotion.promotion_id,
      );
      const adjustmentType = promotionsV2Quote?.adjustments.find(
        (adjustment) => adjustment.promotion_id === promotion.promotion_id,
      )?.type;
      const stackable = resolveAppliedStackable(details, savedPromotion);
      return {
        promotion_id: promotion.promotion_id,
        promotion_name: promotion.name,
        promotion_type: adjustmentType ?? "V2",
        discount_amount: promotion.saving / 100,
        is_auto: !selectedV2PromotionIds.includes(promotion.promotion_id),
        is_free_shipping: adjustmentType === "FREE_SHIPPING",
        stackable,
        is_stacked: stackable,
      };
    },
  );
  const appliedPromotionsForTotals =
    useV2PromotionResult
      ? [
        ...(liveV2AppliedPromotions.length > 0
          ? liveV2AppliedPromotions
          : selectedV2AppliedPromotions),
        ...backendAppliedPromotions.filter(
          (promotion) =>
            isFreeShippingAppliedPromotion(promotion) &&
            ![...liveV2AppliedPromotions, ...selectedV2AppliedPromotions].some(
              (selected) => appliedPromotionId(selected) === appliedPromotionId(promotion),
            ),
        ),
      ]
      : backendAppliedPromotions.length > 0
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
  const v2MerchandiseDiscount = (promotionsV2Quote?.adjustments ?? []).filter((adjustment) => adjustment.type !== "FREE_SHIPPING" && (adjustment.type !== "FREE_ITEM" || adjustment.metadata.fulfilment === "DISCOUNT_EXISTING")).reduce((sum, adjustment) => sum + adjustment.amount, 0) / 100;
  const v2ShippingSavings = (promotionsV2Quote?.adjustments ?? []).filter((adjustment) => adjustment.type === "FREE_SHIPPING").reduce((sum, adjustment) => sum + adjustment.amount, 0) / 100;
  const v2GiftSavings = (promotionsV2Quote?.adjustments ?? []).filter((adjustment) => adjustment.type === "FREE_ITEM" && adjustment.metadata.fulfilment === "AUTO_ADD").reduce((sum, adjustment) => sum + adjustment.list_amount, 0) / 100;
  const promotionDiscount = useV2PromotionResult ? v2MerchandiseDiscount : promotionSummary.normalDiscount;
  const shippingSavings = useV2PromotionResult
    ? v2ShippingSavings
    : promotionSummary.shippingSavings;
  const totalPromotionSavings = promotionDiscount + shippingSavings + (useV2PromotionResult ? v2GiftSavings : 0);
  const payableTotal = useV2PromotionResult
    ? Math.max(0, promotionsV2Quote!.payable_total / 100)
    : promotionSummary.payableTotal;
  const effectiveShipping = Math.max(0, cartTotals.shipping - shippingSavings);
  const merchandisePayableBeforeWallet = Math.max(0, cartTotals.subtotal - promotionDiscount);
  const v2GiftAdjustments = useV2PromotionResult ? (promotionsV2Quote?.adjustments ?? []).filter((adjustment) => adjustment.type === "FREE_ITEM" && adjustment.metadata.fulfilment === "AUTO_ADD") : [];
  const walletQuoteQuery = useQuery({
    queryKey: [
      "wallet-discount-quote",
      session?.user.id,
      cartTotals.subtotal,
      payableTotal,
      merchandisePayableBeforeWallet,
      effectiveShipping,
    ],
    queryFn: () => couponWalletService.quoteDiscount(
      cartTotals.subtotal,
      payableTotal,
      {
        merchandisePayable: merchandisePayableBeforeWallet,
        shippingPayable: effectiveShipping,
      },
    ),
    enabled: Boolean(session?.user.id && promotionRows.length > 0 && payableTotal > 0),
    staleTime: 1000 * 15,
  });
  const eligibleWalletBalance = Number(walletQuoteQuery.data?.data.eligible_balance || 0);
  const walletApplicableDiscount = Number(walletQuoteQuery.data?.data.discount_amount || 0);
  const walletDiscount = walletApplied ? walletApplicableDiscount : 0;
  const finalPayableTotal = Math.max(payableTotal - walletDiscount, 0);
  const toggleWallet = () => {
    const next = !walletApplied;
    setWalletApplied(next);
    saveWalletApplied(session?.user.id, next);
  };

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
    if (
      !session?.user.id ||
      selectedPromotion?.engine === "v2" ||
      !backendEvaluation ||
      backendAppliedPromotions.length === 0 ||
      !cartSignature
    ) return;

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

  useEffect(() => {
    if (
      !session?.user.id ||
      selectedPromotion?.engine !== "v2" ||
      selectedPromotion.cartSignature !== cartSignature ||
      selectedV2PromotionIds.length === 0 ||
      !promotionsV2Quote
    ) return;

    const appliedIds = new Set(promotionsV2Quote.applied_promotions.map((promotion) => promotion.promotion_id));
    if (!selectedV2PromotionIds.every((id) => appliedIds.has(id))) return;
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
    cartSignature,
    promotionsV2Quote,
    selectedPromotion,
    selectedV2PromotionIds,
    session?.user.id,
  ]);

  const applyPromotionMutation = useMutation({
    mutationFn: async (promotion: ApplicablePromotion) => {
      const previousApplied = promotionsV2Quote?.applied_promotions ?? [];
      await queryClient.cancelQueries({ queryKey: promotionsV2QueryRoot });
      const selectedId = promotionId(promotion);
      const requestedPromotionIds = [...new Set([
        ...(selectedPromotion?.engine === "v2" && selectedPromotion.cartSignature === cartSignature
          ? selectedCartPromotionIds(selectedPromotion)
          : []),
        selectedId,
      ])];
      // A versioned promotion must be evaluated by the canonical V2 engine.
      // Asking V2 first is safe for legacy promotions: if no published rule
      // mentions this ID, the request falls through to the legacy evaluator.
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
        const v2Quote = v2Response.data;
        const v2Applied = v2Quote.applied_promotions.some(
          (item) => item.promotion_id === selectedId,
        );
        if (!v2Applied) {
          throw new PromotionOfferMessageError(
            describeOfferNotApplied(
              selectedId,
              v2Quote,
              Math.round(Number(promotion.applied_discount || promotion.discountInfo?.discountAmount || 0) * 100),
            ),
          );
        }
        return { engine: "v2" as const, response: v2Response, requestedPromotionIds, previousApplied };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("PROMOTION_V2_RULE_NOT_FOUND")) throw error;
      }

      // Match the mobile flow: create the automatic evaluation only when one
      // does not already exist. Recreating it here would erase previously
      // selected stackable promotions before adding the next one.
      let evaluationId = backendEvaluation?.evaluation_id;
      if (!evaluationId) {
        const automaticEvaluation = await promotionService.evaluateAutomatic({
          userId: String(session!.user.id),
          cartItems: promotionEvaluationItems,
          currentTotal: cartTotals.subtotal,
          mode: "phonepe",
          channel: "web",
          geo: "IN",
        });
        evaluationId = automaticEvaluation.data.evaluation_id;
      }

      const response = await promotionService.evaluate({
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
      return { engine: "legacy" as const, response };
    },
    onMutate: () => {
      setOfferActionError(null);
      setOfferNotice(null);
    },
    onSuccess: async (result, promotion) => {
      if (!session?.user.id) return;

      if (result.engine === "v2") {
        const quote = result.response.data;
        const appliedQuoteKey = [...promotionsV2QueryRoot, promotionSelectionKey(result.requestedPromotionIds)];
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
          userId: session.user.id,
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
        setOfferActionError(null);
        void promotionOffersQuery.refetch();
        toast.success(
          describeOfferApplied(promotion.name, promotionId(promotion), quote, result.previousApplied, "cart"),
        );
        return;
      }

      const response = result.response;
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
        engine: "legacy",
      };

      saveSelectedCartPromotion(nextPromotion);
      setSelectedPromotion(nextPromotion);
      setOfferActionError(null);
      void Promise.all([
        promotionOffersQuery.refetch(),
        activeEvaluationsQuery.refetch(),
      ]);
      toast.success(`${promotion.name} applied to your cart.`);
    },
    onError: (error, promotion) => {
      const message = error instanceof Error ? error.message : "Could not apply this promotion. Please try another offer.";

      if (isOfferAlreadyUsedError(message)) {
        const id = promotionId(promotion);
        if (id > 0) {
          setAlreadyUsedPromotionIds((current) => new Set(current).add(id));
        }
        setOfferActionError(null);
        toast.warning("This offer has already been used.");
        void promotionOffersQuery.refetch();
        return;
      }

      if (error instanceof PromotionOfferMessageError) {
        setOfferNotice({ promotionId: promotionId(promotion), message, tone: "info" });
        return;
      }

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

  const removePromotionMutation = useMutation({
    onMutate: () => setOfferNotice(null),
    mutationFn: async (promotionIdToRemove: number) => {
      if (!session?.user.id || promotionIdToRemove <= 0) return { localOnly: true };

      await queryClient.cancelQueries({ queryKey: promotionsV2QueryRoot });

      if (
        selectedPromotion?.engine === "v2" &&
        selectedCartPromotionIds(selectedPromotion).includes(promotionIdToRemove)
      ) {
        const selectedIds = selectedCartPromotionIds(selectedPromotion);
        try {
          const response = await promotionService.removePromotionFromEvaluation(
            selectedPromotion.evaluationId,
            promotionIdToRemove,
          );
          return { localOnly: false, engine: "v2" as const, response };
        } catch (error) {
          if (!isRecoverablePromotionEvaluationError(error)) throw error;

          // Refresh an expired/stale evaluation once, then retry the requested
          // removal against the newly issued evaluation ID.
          const refreshed = await promotionService.calculatePromotions({
            cartItems: promotionRows.map((row) => ({
              cart_record_id: String(row.cartRecordId ?? row.productid),
              product_id: String(row.productid),
              quantity: row.quantity,
            })),
            shippingAmount: cartTotals.shipping,
            channel: "web",
            selectedPromotionIds: selectedIds,
          });
          if (!refreshed.data.applied_promotions.some((item) => item.promotion_id === promotionIdToRemove)) {
            return { localOnly: false, engine: "v2" as const, response: refreshed };
          }
          const response = await promotionService.removePromotionFromEvaluation(
            refreshed.data.evaluation_id,
            promotionIdToRemove,
          );
          return { localOnly: false, engine: "v2" as const, response };
        }
      }

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
        return { localOnly: false, engine: "legacy" as const };
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
    onSuccess: async (result, removedPromotionId) => {
      if (result && "engine" in result && result.engine === "v2" && selectedPromotion) {
        const quote = result.response.data;
        const remainingPromotionIds = selectedCartPromotionIds(selectedPromotion).filter(
          (id) => id !== removedPromotionId && quote.applied_promotions.some((item) => item.promotion_id === id)
        );
        const remainingQuoteKey = [...promotionsV2QueryRoot, promotionSelectionKey(remainingPromotionIds)];
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
          clearSelectedCartPromotion(session?.user.id);
          setSelectedPromotion(null);
        }
        // V2 already returned the new quote; the legacy evaluation list is not needed.
        void promotionOffersQuery.refetch();
        toast.success("Offer removed from your cart.");
        return;
      }
      clearSelectedCartPromotion(session?.user.id);
      setSelectedPromotion(null);
      await refreshPromotionQueries();
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
      freeShippingEligible && Boolean(
        appliedPromotion ||
        (!hasSelectedV2Promotion && backendAppliedIds.has(id))
      );
    const canRemove = Boolean(
      isApplied &&
      ((selectedPromotion?.engine === "v2" && selectedV2PromotionIds.includes(id)) ||
        (appliedPromotion && !appliedPromotion.is_auto)),
    );

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
    const v2AppliedOffer = useV2PromotionResult
      ? promotionsV2Quote?.applied_promotions.find((offer) => offer.promotion_id === state.id)
      : undefined;
    const displayedPromotion = v2AppliedOffer
      ? { ...promotion, applied_discount: v2AppliedOffer.saving / 100 }
      : promotion;

    return (
      <PromotionOffer
        key={state.id}
        promotion={displayedPromotion}
        isPending={
          applyPromotionMutation.isPending &&
          promotionId(applyPromotionMutation.variables) === state.id
        }
        isRemoving={
          removePromotionMutation.isPending &&
          removePromotionMutation.variables === state.id
        }
        isApplied={state.isApplied}
        isAlreadyUsed={alreadyUsedPromotionIds.has(state.id)}
        notice={offerNotice?.promotionId === state.id ? offerNotice : null}
        action={getOfferActionState({
          promotion,
          isApplied: state.isApplied,
          canRemove: state.canRemove,
          isAlreadyUsed: alreadyUsedPromotionIds.has(state.id),
          isLoggedIn: Boolean(session),
          freeShippingEligible: state.freeShippingEligible,
          anyOfferActionPending: applyPromotionMutation.isPending || removePromotionMutation.isPending,
          pricingResolving: isPricingRecalculating,
        })}
        combinationNote={state.isApplied ? null : offerCombinationNote(promotion)}
        shippingSavings={state.freeShippingApplied ? shippingSavings : 0}
        onApply={() => applyPromotionMutation.mutate(promotion)}
        onRemove={() => removePromotionMutation.mutate(state.id)}
      />
    );
  };

  const eligiblePromotionCandidates = visiblePromotionCandidates.filter(
    (promotion) => getPromotionDisplayState(promotion).freeShippingEligible
  );
  const appliedSummaryPromotions = eligiblePromotionCandidates.filter(
    (promotion) => getPromotionDisplayState(promotion).isApplied
  );
  const summaryPromotions = [
    // Never hide an applied benefit behind "View all". If three compatible
    // promotions are active, all three must remain visible in the cart.
    ...appliedSummaryPromotions,
    ...eligiblePromotionCandidates
      .filter((promotion) => !getPromotionDisplayState(promotion).isApplied)
      .slice(0, Math.max(0, 2 - appliedSummaryPromotions.length)),
  ];

  const checkoutValidationMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) return null;
      if (promotionsV2Quote?.evaluation_id) {
        // A zero-benefit quote is useful for displaying the standard total but
        // does not need to be validated or attached to the eventual order.
        if (!hasV2AppliedBenefit) return null;
        const response = await promotionService.validatePromotionEvaluation(promotionsV2Quote.evaluation_id);
        return { isValid: true, evaluationId: response.data.evaluation_id };
      }
      if (!backendEvaluation?.evaluation_id) return null;
      const response = await promotionService.validateForCheckout(
        backendEvaluation.evaluation_id,
        session.user.id,
      );
      return { isValid: response.data.is_valid, evaluationId: backendEvaluation.evaluation_id };
    },
    onSuccess: async (response) => {
      if (!response || response.isValid) {
        if (response?.evaluationId) {
          sessionStorage.setItem('nivaana_promotions_v2_evaluation_id', response.evaluationId);
        } else {
          sessionStorage.removeItem('nivaana_promotions_v2_evaluation_id');
        }
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

  const isPricingRecalculating = Boolean(
    promotionRows.length > 0 &&
    (
      mutation.isPending ||
      moveToWishlist.isPending ||
      promotionsV2Query.isFetching ||
      (!promotionsV2Quote && automaticPromotionsQuery.isFetching) ||
      applyPromotionMutation.isPending ||
      removePromotionMutation.isPending ||
      (walletApplied && walletQuoteQuery.isFetching)
    )
  );

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
        {/* {!session && items.length > 0 && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-muted)]">
            Login before checkout and we will move these guest items into your account.
            <Link to="/login?redirect=/cart" className="ml-2 font-bold text-[var(--color-secondary)]">Login</Link>
          </div>
        )} */}
        {session && cartQuery.isLoading ? (
          <div className="mt-8">
            <PageSkeleton variant="cart" count={3} hideHeader />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Your cart is empty" />
        ) : productsQuery.isLoading ? (
          <div className="mt-8">
            <PageSkeleton variant="cart" count={Math.max(items.length, 3)} hideHeader />
          </div>
        ) : productsQuery.isError ? (
          <div className="mt-8 rounded-[var(--radius-md)] border border-red-200 bg-white p-6 text-sm font-semibold text-red-600 shadow-[var(--shadow-card)]">
            Could not load product details for your cart. Please refresh and try again.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,0.9fr)_460px]">
            <div className="space-y-4">
              {enriched.map(({ apiId, item, product, quantity }) => {
                const displayName = product?.name?.trim() || `Product #${item.productid}`;
                const lineAdjustments = useV2PromotionResult ? (promotionsV2Quote?.adjustments ?? []).filter((adjustment) => adjustment.product_id === String(item.productid) && (adjustment.type !== "FREE_ITEM" || adjustment.metadata.fulfilment === "DISCOUNT_EXISTING")) : [];
                const linePromotionSummaries = [...lineAdjustments.reduce((groups, adjustment) => {
                  const current = groups.get(adjustment.promotion_id) ?? { quantity: 0, savingPaise: 0 };
                  current.quantity += Math.max(Number(adjustment.affected_quantity || 0), 0);
                  current.savingPaise += Math.max(Number(adjustment.amount || 0), 0);
                  groups.set(adjustment.promotion_id, current);
                  return groups;
                }, new Map<number, { quantity: number; savingPaise: number }>())].map(([promotionIdValue, summary]) => ({
                  promotionId: promotionIdValue,
                  quantity: summary.quantity,
                  saving: summary.savingPaise / 100,
                  unitSaving: summary.quantity > 0 ? summary.savingPaise / 100 / summary.quantity : summary.savingPaise / 100,
                }));

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
                      {showPromotionCalculationBreakdown && linePromotionSummaries.filter((summary) => summary.saving > 0).map((summary) => (
                        <p key={summary.promotionId} className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                          {summary.quantity > 1
                            ? `Promotion saving: ${summary.quantity} × ${formatCurrency(summary.unitSaving)} = ${formatCurrency(summary.saving)}`
                            : `Promotion saving ${formatCurrency(summary.saving)}`}
                        </p>
                      ))}
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
              {v2GiftAdjustments.map((gift) => {
                const giftProduct = products.find((product) => String(product.id) === gift.product_id);
                const giftName = giftProduct?.name?.trim() || `Product #${gift.product_id}`;
                return <article key={gift.adjustment_id} className="relative flex gap-4 rounded-[var(--radius-md)] border-2 border-[#fbbc05] bg-[#fffaf0] p-4 shadow-[var(--shadow-card)]" aria-label={`Promotional gift: ${giftName}`}>
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-white"><img src={imageFor(giftProduct)} alt="" className="h-full w-full object-cover" /></div>
                  <div className="min-w-0"><span className="inline-flex rounded-full bg-[#fbbc05] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#26344f]">Promotional gift</span><p className="mt-2 line-clamp-2 text-sm font-bold text-[#172033]">{giftName}</p><p className="mt-1 text-xs text-[#68748a]">Qty: {gift.affected_quantity} · Automatically added · Non-editable</p><p className="mt-1 text-sm"><span className="mr-2 text-[#68748a] line-through">{formatCurrency(gift.list_amount / 100)}</span><strong className="text-emerald-700">Free</strong></p></div>
                </article>;
              })}
            </div>
            <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Order Summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <SummaryLine label="Items total" value={formatCurrency(cartTotals.subtotal)} />
                {isPricingRecalculating ? (
                  <div
                    className="flex items-center gap-2 border-t border-[var(--color-border)] py-3 text-xs font-semibold text-[#68748a]"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#9a6b00]" />
                    <span>Updating delivery, offers and final total…</span>
                  </div>
                ) : (
                  <>
                    <SummaryLine
                      label="Shipping"
                      value={effectiveShipping === 0 ? (!session ? "Free*" : "Free") : formatCurrency(effectiveShipping)}
                      previousValue={shippingSavings > 0 ? formatCurrency(cartTotals.shipping) : undefined}
                      highlight={shippingSavings > 0}
                    />
                    {promotionDiscount > 0 && (
                      <SummaryLine
                        label={!session ? "Automatic promotion" : promotionDiscountLabel(appliedPromotionsForTotals)}
                        value={`-${formatCurrency(promotionDiscount)}${!session ? "*" : ""}`}
                      />
                    )}
                    {walletDiscount > 0 && <SummaryLine label="Wallet credit" value={`-${formatCurrency(walletDiscount)}`} />}
                    <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-base font-bold text-[var(--color-text)]">
                      <span>Total</span>
                      <strong>{formatCurrency(finalPayableTotal)}{!session && totalPromotionSavings > 0 ? "*" : ""}</strong>
                    </div>
                  </>
                )}
              </div>

              {session && eligibleWalletBalance > 0 && (
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <WalletCards className="h-5 w-5 shrink-0 text-[#485470]" />
                    <div className="min-w-0"><p className="text-sm font-bold text-[#172033]">Wallet balance {formatCurrency(eligibleWalletBalance)}</p><p className="text-[11px] text-[#68748a]">{walletApplicableDiscount > 0 ? `${formatCurrency(walletApplicableDiscount)} available for this cart` : "Promotional wallet credit cannot be used for shipping"}</p></div>
                  </div>
                  {walletApplicableDiscount > 0 && <button type="button" onClick={toggleWallet} disabled={walletQuoteQuery.isFetching || isPricingRecalculating} className="shrink-0 rounded-lg bg-[#fbbc05] px-3 py-2 text-xs font-extrabold text-[#172033] disabled:opacity-50">{walletApplied ? "Remove" : "Apply"}</button>}
                </div>
              )}

              {session && promotionRows.length > 0 && (
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
                    {!isPricingRecalculating && totalPromotionSavings > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                        Saved {formatCurrency(totalPromotionSavings)}
                      </span>
                    )}
                  </div>

                  {showPromotionCalculationBreakdown && useV2PromotionResult && promotionsV2Quote && (
                    <div className="mt-3 space-y-2" aria-label="Promotion status groups">
                      {promotionsV2Quote.applied_promotions.map((offer) => <div key={`applied-${offer.promotion_id}`} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><strong>Applied · {offer.name}</strong><span className="float-right">Save {formatCurrency(offer.saving / 100)}</span></div>)}
                      {promotionsV2Quote.eligible_alternatives.map((offer) => <div key={`eligible-${offer.promotion_id}`} className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-[#26344f]"><strong>Eligible · {offer.name}</strong><p className="mt-1 text-[#68748a]">A better compatible offer is currently applied.</p></div>)}
                    </div>
                  )}

                  <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[#dfe4ee] bg-[#f7f8fb] p-3 text-[11px] leading-4 text-[#68748a]">
                    <TicketPercent className="mt-0.5 h-4 w-4 shrink-0 text-[#9a6b00]" />
                    <p>
                      {session
                        ? "Have a coupon code? Apply it securely at checkout."
                        : "Have a coupon code? Sign in and apply it securely at checkout."}
                    </p>
                  </div>

                  {isPricingRecalculating ? null : promotionOffersQuery.isLoading || (promotionOffersQuery.isFetching && !promotionOffersQuery.data) ? (
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking available offers…
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
              {!session && promotionRows.length > 0 && (
                <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                  <p className="text-sm font-bold text-[var(--color-text)]">Get your best available offer</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                    Sign in to view personalised offers and apply the one that saves you the most.
                  </p>
                  <p className="mt-3 text-[11px] leading-4 text-[var(--color-muted)]">
                    * Estimated savings based on your cart. Final offers depend on eligibility and availability after sign-in.
                  </p>
                </div>
              )}
              {session ? (
                <Button
                  className="mt-5 w-full"
                  disabled={checkoutValidationMutation.isPending || isPricingRecalculating}
                  onClick={() => checkoutValidationMutation.mutate()}
                >
                  {checkoutValidationMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Checkout
                </Button>
              ) : (
                <Link
                  to="/login?redirect=/checkout"
                  className={`mt-5 block ${isPricingRecalculating ? "pointer-events-none" : ""}`}
                  aria-disabled={isPricingRecalculating}
                >
                  <Button className="w-full" disabled={isPricingRecalculating}>
                    Login to Checkout
                  </Button>
                </Link>
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
                {isPricingRecalculating && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#9a6b00]" role="status">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating total...
                  </p>
                )}
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
  isAlreadyUsed,
  action,
  combinationNote,
  notice,
  shippingSavings,
  onApply,
  onRemove,
}: {
  promotion: ApplicablePromotion;
  isPending: boolean;
  isRemoving: boolean;
  isApplied: boolean;
  isAlreadyUsed: boolean;
  action: OfferActionState;
  combinationNote: string | null;
  notice: OfferNotice | null;
  shippingSavings: number;
  onApply: () => void;
  onRemove: () => void;
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
      className={`overflow-hidden rounded-2xl border transition ${isApplied
          ? "border-emerald-200 bg-emerald-50/60"
          : isAlreadyUsed
            ? "border-[#dfe4ee] bg-[#f5f7fa]"
            : "border-[#dfe4ee] bg-white hover:border-[#fbbc05]/70 hover:shadow-sm"
        }`}
    >
      <div className="flex items-stretch">
        <div
          className={`flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 ${isApplied
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
            {action.kind === "automatic" || action.kind === "use-code" ? (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-extrabold ${action.kind === "automatic"
                    ? "bg-[#fff2bd] text-[#856000]"
                    : "bg-[#eef1f6] text-[#58657a]"
                  }`}
              >
                {action.kind === "automatic" ? "Automatic" : "Use code"}
              </span>
            ) : action.kind === "remove" || action.kind === "applied" ? (
              // Same as Checkout: applied offers read as applied; Remove is a quiet link.
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
                    aria-busy={isRemoving}
                    onClick={() => {
                      if (!action.busy) onRemove();
                    }}
                    className={`inline-flex items-center gap-1 bg-transparent px-1 py-0.5 text-[11px] font-semibold text-[#68748a] underline-offset-2 hover:text-[#172033] hover:underline disabled:opacity-50 ${action.busy && !isRemoving ? "cursor-wait" : ""}`}
                  >
                    {isRemoving && <Loader2 className="h-3 w-3 animate-spin" />}
                    {isRemoving ? offerPendingLabel("remove") : "Remove"}
                  </button>
                )}
              </div>
            ) : (
              <Button
                className={`h-9 min-h-9 shrink-0 gap-1.5 rounded-xl px-3 text-xs shadow-none ${isApplied
                    ? "!border !border-emerald-200 !bg-white !text-emerald-700 hover:!bg-white"
                    : isAlreadyUsed
                      ? "!bg-[#e3e7ee] !text-[#68748a] hover:!bg-[#e3e7ee]"
                      : "!bg-[#fbbc05] !text-[#172033] hover:!bg-[#ffd042]"
                  }`}
                disabled={action.disabled}
                aria-disabled={action.busy}
                aria-busy={isPending || isRemoving}
                variant={isApplied ? "secondary" : "primary"}
                onClick={() => {
                  // Busy: another offer action or a price re-check is running.
                  if (action.busy) return;
                  if (action.kind === "remove") onRemove();
                  else onApply();
                }}
              >
                {isPending || isRemoving ? (
                  // The label follows the running action, not the card's current state.
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {offerPendingLabel(isPending ? "apply" : "remove")}
                  </>
                ) : action.kind === "already-used" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Already Used
                  </>
                ) : (
                  "Apply"
                )}
              </Button>
            )}
          </div>
          {promotion.code && (
            <div className="mt-2 inline-flex max-w-full rounded-lg bg-[#eef1f6] px-2.5 py-1 font-mono text-[11px] font-bold text-[#485470]">
              <span className="truncate">{promotion.code}</span>
            </div>
          )}
          {combinationNote && (
            <p className="mt-2 text-[11px] leading-4 text-[#68748a]">{combinationNote}</p>
          )}
          {notice && (
            <p
              className={`mt-2 rounded-lg border px-2.5 py-2 text-[11px] font-semibold leading-4 ${offerNoticeClassName(notice.tone)}`}
              role={notice.tone === "error" ? "alert" : "status"}
            >
              {notice.message}
            </p>
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

export default Cart;

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, CheckCircle2, Heart, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { cartService } from "../services/cartService";
import { platformProductService } from "../services/productPlatformService";
import { promotionService, type ApplicablePromotion, type AppliedPromotion, type CurrentEvaluation } from "../services/promotionService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { Button } from "../components/ui/button";
import fallbackProduct from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";
import type { ApiResponse, CartItem, Product } from "../types";
import { getAvailableStock, isOutOfStock, stockLimitMessage } from "../lib/stock";
import {
  buildPromotionCartData,
  buildPromotionEvaluationCartItems,
  cartPromotionSignature,
  clearSelectedCartPromotion,
  getPromotionCartTotals,
  productUnitPrice,
  readSelectedCartPromotion,
  saveSelectedCartPromotion,
  type SelectedCartPromotion,
} from "../lib/cartPromotions";

const imageFor = (product?: { medium: string[] | null; small: string[] | null; large: string[] | null }) =>
  product?.medium?.[0] || product?.small?.[0] || product?.large?.[0] || fallbackProduct;

const quantityFor = (quantity: unknown) => {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) => `Rs. ${Math.max(value, 0).toLocaleString("en-IN")}`;

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

const appliedPromotionDiscount = (promotions: AppliedPromotion[]) =>
  promotions.reduce((sum, promotion) => sum + Number(promotion.discount_amount || 0), 0);

const Cart: React.FC = () => {
  const queryClient = useQueryClient();
  const session = sessionService.getSession();
  const [, setGuestVersion] = useState(0);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
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
  }, [session?.user.id]);

  const cartQuery = useQuery({
    queryKey: ["cart", session?.user.id],
    queryFn: () => cartService.getCart(session!.user.id),
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
    mutationFn: ({ id, productid, userid, quantity, iswishlist }) => {
      setActionMessage("");
      setActionError("");

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] }),
    onError: (_error, _variables, context) => {
      if (session && context?.previousCart) {
        queryClient.setQueryData(["cart", session.user.id], context.previousCart);
      }
      setActionError("Could not update cart. Please try again.");
    },
  });

  const moveToWishlist = useMutation<unknown, Error, { id?: number; productid: number; quantity: number }>({
    mutationFn: ({ id, productid, quantity }) => {
      setActionMessage("");
      setActionError("");

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
      setActionMessage("Item saved for later.");
    },
    onError: () => setActionError("Could not save item for later. Please try again."),
  });

  const products = productsQuery.data?.data ?? [];
  const items = session ? cartQuery.data?.data ?? [] : guestStoreService.getCart();
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
    enabled: Boolean(session && promotionRows.length > 0),
    staleTime: 1000 * 60,
  });

  const activeEvaluationsQuery = useQuery({
    queryKey: ["cart-active-promotion-evaluations", session?.user.id, cartSignature],
    queryFn: () => promotionService.getActiveEvaluations(session!.user.id),
    enabled: Boolean(session && promotionRows.length > 0),
    staleTime: 1000 * 30,
  });

  const backendEvaluation = useMemo(() => {
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
  }, [activeEvaluationsQuery.data, cartTotals.total, promotionOffersQuery.data]);

  const backendAppliedPromotions = backendEvaluation?.applied_promotions ?? [];
  const backendAppliedIds = useMemo(
    () => new Set(backendAppliedPromotions.map(appliedPromotionId).filter((id) => id > 0)),
    [backendAppliedPromotions]
  );
  const selectedPromotionApplies = Boolean(selectedPromotion && selectedPromotion.cartSignature === cartSignature);
  const backendPromotionDiscount = backendEvaluation
    ? Number(backendEvaluation.total_discount ?? Math.max(backendEvaluation.original_total - backendEvaluation.discounted_total, 0)) ||
      appliedPromotionDiscount(backendAppliedPromotions)
    : 0;
  const promotionDiscount = backendPromotionDiscount || (selectedPromotionApplies ? selectedPromotion?.totalDiscount ?? 0 : 0);
  const payableTotal = Math.max(cartTotals.total - promotionDiscount, 0);

  const promotionCandidates = useMemo(() => {
    const offers = promotionOffersQuery.data?.data;
    if (!offers) return [];

    return uniquePromotions(
      [
        offers.bestCoupon,
        ...offers.eligibleCoupons,
        ...offers.autoAppliedPromotions,
        ...offers.stackablePromotions,
      ].filter((promotion): promotion is ApplicablePromotion => Boolean(promotion && promotionId(promotion) > 0))
    ).slice(0, 3);
  }, [promotionOffersQuery.data]);

  useEffect(() => {
    if (!session?.user.id || !backendEvaluation || backendAppliedPromotions.length === 0 || !cartSignature) return;

    const primaryPromotion = backendAppliedPromotions.find(
      (promotion) => !promotion.is_auto && appliedPromotionId(promotion) > 0
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
      setActionMessage("");
    }
  }, [cartSignature, selectedPromotion, session?.user.id]);

  const applyPromotionMutation = useMutation({
    mutationFn: async (promotion: ApplicablePromotion) => {
      await promotionService.evaluateAutomatic({
        userId: String(session!.user.id),
        cartItems: promotionEvaluationItems,
        currentTotal: cartTotals.total,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });

      return promotionService.evaluate({
        cartId: `cart-${session!.user.id}`,
        userId: String(session!.user.id),
        promotionId: promotionId(promotion),
        cartData: promotionCartData,
        cartItems: promotionEvaluationItems,
        mode: "phonepe",
        channel: "web",
        geo: "IN",
      });
    },
    onSuccess: (response, promotion) => {
      if (!session?.user.id) return;

      const evaluation = response.data;
      const nextPromotion: SelectedCartPromotion = {
        userId: session.user.id,
        promotionId: promotionId(promotion),
        promotionName: promotion.name,
        evaluationId: evaluation.evaluation_id,
        cartSignature,
        totalDiscount: Number(evaluation.total_discount || 0),
        discountedTotal: Number(evaluation.discounted_total || payableTotal),
        appliedPromotions: evaluation.applied_promotions ?? [],
        expiresAt: evaluation.expires_at,
        savedAt: Date.now(),
      };

      saveSelectedCartPromotion(nextPromotion);
      setSelectedPromotion(nextPromotion);
      setActionMessage(`${promotion.name} applied.`);
      setActionError("");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Could not apply this promotion. Please try another offer.";

      if (message.toLowerCase().includes("already applied")) {
        setActionMessage("Promotion is already applied.");
        setActionError("");
        return;
      }

      setActionError(message);
      setActionMessage("");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-promotion-offers", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["cart-active-promotion-evaluations", session?.user.id] });
    },
  });

  const removePromotionMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) return;

      const evaluationId = backendEvaluation?.evaluation_id || selectedPromotion?.evaluationId;
      const promotionIds = Array.from(
        new Set(
          (backendAppliedPromotions.length > 0 ? backendAppliedPromotions : selectedPromotion?.appliedPromotions ?? [])
            .filter((promotion) => !promotion.is_auto)
            .map(appliedPromotionId)
            .filter((id) => id > 0)
        )
      );

      if (!evaluationId || promotionIds.length === 0) return;

      for (const id of promotionIds) {
        await promotionService.removeEvaluation(evaluationId, id);
      }
    },
    onSuccess: () => {
      clearSelectedCartPromotion(session?.user.id);
      setSelectedPromotion(null);
      setActionMessage("Promotion removed.");
      setActionError("");
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Could not remove this promotion. Please try again.");
      setActionMessage("");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-promotion-offers", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["cart-active-promotion-evaluations", session?.user.id] });
    },
  });

  const removeSelectedPromotion = () => {
    removePromotionMutation.mutate();
  };

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
    setActionMessage("");
    setActionError("");
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
          [productid]: "This item is currently out of stock. Move it to wishlist or remove it from cart.",
        }));
        return;
      }

      if (nextQuantity > availableStock) {
        setItemErrors((current) => ({
          ...current,
          [productid]: stockLimitMessage(availableStock),
        }));
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

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">Cart</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {items.length} items in your cart{session ? "" : " as guest"}
        </p>
        {!session && items.length > 0 && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-muted)]">
            Login before checkout and we will move these guest items into your account.
            <Link to="/login" className="ml-2 font-bold text-[var(--color-secondary)]">Login</Link>
          </div>
        )}
        {(actionMessage || actionError) && (
          <div
            className={`mt-4 rounded-[var(--radius-md)] border bg-white p-4 text-sm font-semibold ${
              actionError
                ? "border-red-200 text-red-600"
                : "border-green-200 text-green-700"
            }`}
          >
            {actionError || actionMessage}
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
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {enriched.map(({ apiId, item, product, quantity }) => (
                <article key={`${item.productid}-${apiId ?? "guest"}`} className="flex gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface)]">
                    <img
                      src={imageFor(product)}
                      alt={product?.name || "Product image"}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = fallbackProduct;
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-base font-bold text-[var(--color-text)]">{product?.name || `Product #${item.productid}`}</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">Qty: {quantity}</p>
                    {(itemErrors[item.productid] || isOutOfStock(product) || quantity > getAvailableStock(product)) && (
                      <p className="mt-2 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                        {itemErrors[item.productid] ||
                          (isOutOfStock(product)
                            ? "This item is currently out of stock. Move it to wishlist or remove it from cart."
                            : stockLimitMessage(getAvailableStock(product)))}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        className="h-9 px-3"
                        disabled={mutation.isPending || isOutOfStock(product) || quantity >= getAvailableStock(product)}
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
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 px-3"
                        disabled={mutation.isPending}
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
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-9 gap-2 px-3 text-xs sm:text-sm"
                        disabled={moveToWishlist.isPending || mutation.isPending}
                        aria-label={`Save ${product?.name || `product ${item.productid}`} for later`}
                        onClick={() =>
                          moveToWishlist.mutate({
                            id: apiId,
                            productid: item.productid,
                            quantity,
                          })
                        }
                      >
                        <Heart className="h-4 w-4" />
                        <span>Save for later</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 px-3"
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
                  <div className="text-right text-sm font-bold text-[var(--color-secondary)]">
                    {formatCurrency(productUnitPrice(product))}
                  </div>
                </article>
              ))}
            </div>
            <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Order Summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <SummaryLine label="Items total" value={formatCurrency(cartTotals.subtotal)} />
                <SummaryLine label="Shipping" value={cartTotals.shipping === 0 ? "Free" : formatCurrency(cartTotals.shipping)} />
                {promotionDiscount > 0 && <SummaryLine label="Promotion" value={`-${formatCurrency(promotionDiscount)}`} />}
                <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-base font-bold text-[var(--color-text)]">
                  <span>Total</span>
                  <strong>{formatCurrency(payableTotal)}</strong>
                </div>
              </div>

              {session && (
                <div className="mt-5 border-t border-[var(--color-border)] pt-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
                    <BadgePercent className="h-4 w-4 text-[var(--color-secondary)]" />
                    Offers
                  </div>

                  {selectedPromotionApplies && selectedPromotion && (
                    <div className="mt-3 rounded-[var(--radius-sm)] border border-green-200 bg-green-50 p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-green-800">{selectedPromotion.promotionName}</p>
                          <p className="mt-1 text-xs font-semibold text-green-700">
                            You save {formatCurrency(promotionDiscount)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="mt-3 h-9 gap-2 px-3 text-xs"
                        disabled={removePromotionMutation.isPending}
                        onClick={removeSelectedPromotion}
                      >
                        {removePromotionMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {removePromotionMutation.isPending ? "Removing" : "Remove"}
                      </Button>
                    </div>
                  )}

                  {promotionOffersQuery.isLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking offers
                    </div>
                  ) : promotionCandidates.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {promotionCandidates.map((promotion) => (
                        <PromotionOffer
                          key={promotionId(promotion)}
                          promotion={promotion}
                          isPending={applyPromotionMutation.isPending}
                          isApplied={
                            backendAppliedIds.has(promotionId(promotion)) ||
                            (selectedPromotionApplies && selectedPromotion?.promotionId === promotionId(promotion)) ||
                            promotion.promotionState === "applied"
                          }
                          onApply={() => applyPromotionMutation.mutate(promotion)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--color-muted)]">No offers apply to this cart right now.</p>
                  )}
                </div>
              )}
              {session ? (
                <Link to="/checkout" className="mt-5 block">
                  <Button className="w-full">Checkout</Button>
                </Link>
              ) : (
                <Link to="/login" className="mt-5 block"><Button className="w-full">Login to Checkout</Button></Link>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
};

function PromotionOffer({
  promotion,
  isPending,
  isApplied,
  onApply,
}: {
  promotion: ApplicablePromotion;
  isPending: boolean;
  isApplied: boolean;
  onApply: () => void;
}) {
  const discountValue = Number(promotion.discount_value || promotion.discountInfo?.discountAmount || 0);

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-bold text-[var(--color-text)]">{promotion.name}</p>
          {(promotion.code || discountValue > 0) && (
            <p className="mt-1 text-xs font-semibold text-[var(--color-muted)]">
              {promotion.code || `${promotion.discount_type?.toLowerCase().includes("percent") ? `${discountValue}%` : formatCurrency(discountValue)} off`}
            </p>
          )}
        </div>
        <Button
          className="h-9 gap-1.5 px-3 text-xs"
          disabled={isPending || isApplied}
          variant={isApplied ? "secondary" : "primary"}
          onClick={onApply}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-[var(--color-muted)]">
      <span>{label}</span>
      <span className="font-semibold text-[var(--color-text)]">{value}</span>
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
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
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

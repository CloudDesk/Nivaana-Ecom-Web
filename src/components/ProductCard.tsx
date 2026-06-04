import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "../types";
import fallbackProduct from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";
import { Button } from "./ui/button";
import { cartService } from "../services/cartService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { cn } from "../lib/utils";

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

const formatLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Nivaana";

const getProductImage = (product: Product) =>
  product.medium?.[0] || product.small?.[0] || product.large?.[0] || fallbackProduct;

const getFinalPrice = (product: Product) => Math.max(product.price - product.discount, 0);
const clampCartQuantity = (quantity: number, availableQuantity: number) =>
  Math.min(Math.max(quantity, 0), Math.max(availableQuantity || 99, 1));

const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const hasDiscount = product.discount > 0;
  const rating = product.averagerating ?? 4.7;
  const session = sessionService.getSession();
  const [, setStoreVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setStoreVersion((version) => version + 1);
    window.addEventListener("nivaana-guest-store-change", refresh);
    window.addEventListener("nivaana-session-change", refresh);
    return () => {
      window.removeEventListener("nivaana-guest-store-change", refresh);
      window.removeEventListener("nivaana-session-change", refresh);
    };
  }, []);

  const cartQuery = useQuery({
    queryKey: ["cart", session?.user.id],
    queryFn: () => cartService.getCart(session!.user.id),
    enabled: Boolean(session),
    staleTime: 1000 * 60,
  });

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", session?.user.id],
    queryFn: () => cartService.getWishlist(session!.user.id),
    enabled: Boolean(session),
    staleTime: 1000 * 60,
  });

  const cartItems = cartQuery.data?.data ?? [];
  const wishlistItems = wishlistQuery.data?.data ?? [];
  const guestItem = !session ? guestStoreService.getItems().find((item) => item.productid === product.id) : undefined;
  const cartItem = session ? cartItems.find((item) => item.productid === product.id && item.iscart) : undefined;
  const wishlistItem = session
    ? wishlistItems.find((item) => item.productid === product.id && item.iswishlist)
    : undefined;
  const cartQuantity = session ? cartItem?.quantity ?? 0 : guestItem?.iscart ? guestItem.quantity : 0;
  const isInCart = cartQuantity > 0;
  const isInWishlist = session ? Boolean(wishlistItem) : Boolean(guestItem?.iswishlist);

  const addItem = useMutation<unknown, Error, "cart" | "wishlist">({
    mutationFn: (mode: "cart" | "wishlist") => {
      if (!session) {
        if (mode === "cart") {
          guestStoreService.addToCart(product.id);
          if (isInWishlist) {
            guestStoreService.removeFromWishlist(product.id);
          }
        } else if (isInWishlist) {
          guestStoreService.removeFromWishlist(product.id);
        } else {
          guestStoreService.addToWishlist(product.id);
        }
        return Promise.resolve();
      }

      const existingItem = mode === "cart" ? cartItem ?? wishlistItem : wishlistItem ?? cartItem;
      const nextQuantity = Math.max(cartQuantity || existingItem?.quantity || 1, 1);

      if (mode === "wishlist" && isInWishlist) {
        if (!existingItem) return Promise.resolve();

        return isInCart
          ? cartService.upsert({
              id: existingItem.id,
              productid: product.id,
              userid: session.user.id,
              quantity: nextQuantity,
              iscart: true,
              iswishlist: false,
            })
          : cartService.remove(existingItem.id);
      }

      return cartService.upsert({
        id: existingItem?.id,
        productid: product.id,
        userid: session.user.id,
        quantity: nextQuantity,
        iscart: mode === "cart" || isInCart,
        iswishlist: mode === "cart" ? false : true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
    },
  });

  const updateCartQuantity = useMutation<unknown, Error, number>({
    mutationFn: (quantity: number) => {
      const nextQuantity = clampCartQuantity(quantity, product.availablequantity);

      if (!session) {
        guestStoreService.updateCartQuantity(product.id, nextQuantity);
        return Promise.resolve();
      }

      if (!cartItem) {
        if (nextQuantity <= 0) return Promise.resolve();

        return cartService.upsert({
          id: wishlistItem?.id,
          productid: product.id,
          userid: session.user.id,
          quantity: nextQuantity,
          iscart: true,
          iswishlist: isInWishlist,
        });
      }

      if (nextQuantity <= 0) {
        return cartItem.iswishlist
          ? cartService.upsert({
              id: cartItem.id,
              productid: cartItem.productid,
              userid: cartItem.userid,
              quantity: cartItem.quantity,
              iscart: false,
              iswishlist: true,
            })
          : cartService.remove(cartItem.id);
      }

      return cartService.upsert({
        id: cartItem.id,
        productid: cartItem.productid,
        userid: cartItem.userid,
        quantity: nextQuantity,
        iscart: true,
        iswishlist: cartItem.iswishlist || isInWishlist,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
    },
  });

  return (
    <motion.article
      whileHover={{ y: compact ? -3 : -6 }}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition duration-300 hover:shadow-[var(--shadow-hover)]"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      <div className={cn("relative overflow-hidden bg-[var(--color-surface)]", compact ? "aspect-[4/3.1]" : "aspect-[4/3.2]")}>
        <img
          src={getProductImage(product)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {(product.isdealoftheday || hasDiscount) && (
            <span className={cn("rounded-full bg-[var(--color-primary)] font-bold uppercase tracking-wide text-[var(--color-secondary)]", compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]")}>
              {product.isdealoftheday ? "Deal" : "Sale"}
            </span>
          )}
          {product.productstatus === "low_stock" && (
            <span className={cn("rounded-full bg-white font-bold uppercase tracking-wide text-[var(--color-danger)]", compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]")}>
              Low stock
            </span>
          )}
        </div>
        <button
          className={cn(
            "absolute right-3 top-3 grid place-items-center rounded-full shadow-sm transition",
            compact ? "h-8 w-8" : "h-10 w-10",
            isInWishlist
              ? "bg-[var(--color-primary)] text-[var(--color-secondary)] ring-2 ring-[var(--color-secondary)]"
              : "bg-white/90 text-[var(--color-secondary)] hover:bg-[var(--color-primary)]"
          )}
          aria-label={isInWishlist ? `${product.name} is in wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isInWishlist}
          onClick={(event) => {
            event.stopPropagation();
            addItem.mutate("wishlist");
          }}
        >
          <Heart className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", isInWishlist && "fill-[var(--color-secondary)]")} />
        </button>
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "p-3" : "p-4")}>
        <div className={cn("flex items-center justify-between gap-2 text-[var(--color-muted)]", compact ? "mb-1.5 text-[11px]" : "mb-2 text-xs")}>
          <span className="truncate">{formatLabel(product.subcategory)}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[var(--color-primary)] text-[var(--color-primary)]" />
            {rating.toFixed(1)}
          </span>
        </div>

        <h3 className={cn("line-clamp-2 font-semibold text-[var(--color-text)]", compact ? "min-h-9 text-xs leading-[18px]" : "min-h-11 text-sm leading-5")}>
          {product.name}
        </h3>

        {!compact && (
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--color-muted)]">
            {product.shortdescription || product.fulldescription || "Premium Nivaana fragrance crafted for everyday rituals."}
          </p>
        )}

        <div className={cn("flex items-end justify-between gap-2", compact ? "mt-3" : "mt-4 gap-3")}>
          <div>
            <div className={cn("font-bold text-[var(--color-secondary)]", compact ? "text-base" : "text-lg")}>
              Rs. {getFinalPrice(product).toLocaleString("en-IN")}
            </div>
            {hasDiscount && (
              <div className={cn("text-[var(--color-muted)]", compact ? "text-[10px]" : "text-xs")}>
                <span className="line-through">Rs. {product.price.toLocaleString("en-IN")}</span>
                {!compact && <span className="ml-2 text-[var(--color-danger)]">Save Rs. {product.discount}</span>}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {isInCart && (
              <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)]">
                <button
                  type="button"
                  className="grid h-full w-9 place-items-center transition hover:bg-white"
                  aria-label={`Decrease ${product.name} quantity`}
                  disabled={updateCartQuantity.isPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    updateCartQuantity.mutate(cartQuantity - 1);
                  }}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-12 px-2 text-center text-xs font-bold">Qty {cartQuantity}</span>
                <button
                  type="button"
                  className="grid h-full w-9 place-items-center transition hover:bg-white disabled:opacity-40"
                  aria-label={`Increase ${product.name} quantity`}
                  disabled={
                    updateCartQuantity.isPending ||
                    product.productstatus === "out_of_stock" ||
                    cartQuantity >= Math.max(product.availablequantity || 99, 1)
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    updateCartQuantity.mutate(cartQuantity + 1);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <Button
              aria-label={isInCart ? `${product.name} added to cart` : `Add ${product.name} to cart`}
              aria-pressed={isInCart}
              disabled={addItem.isPending || (product.productstatus === "out_of_stock" && !isInCart)}
              className={cn(
                "shrink-0 gap-2 transition-all",
                compact ? "h-9 min-h-9 px-3" : "h-10 min-h-10 px-3",
                isInCart && "bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary)]/90"
              )}
              onClick={(event) => {
                event.stopPropagation();
                if (!isInCart) addItem.mutate("cart");
              }}
            >
              <ShoppingBag className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              {isInCart && !compact && <span className="text-xs font-bold">Added to cart</span>}
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default ProductCard;

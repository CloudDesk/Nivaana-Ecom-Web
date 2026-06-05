import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Heart,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import fallbackProduct from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";
import { cartService } from "../services/cartService";
import { guestStoreService } from "../services/guestStoreService";
import { platformProductService } from "../services/productPlatformService";
import { sessionService } from "../services/sessionService";
import type { Product } from "../types";
import { cn } from "../lib/utils";
import { getAvailableStock, isLowStock, isOutOfStock, stockLimitMessage } from "../lib/stock";

const formatLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Nivaana";

const finalPrice = (product: Product) => Math.max(product.price - product.discount, 0);
const clampQuantity = (quantity: number, availableQuantity: number) =>
  Math.min(Math.max(quantity, 0), Math.max(availableQuantity, 0));

const productImages = (product?: Product) => {
  const images = [
    ...(product?.large ?? []),
    ...(product?.medium ?? []),
    ...(product?.small ?? []),
  ].filter(Boolean);

  return Array.from(new Set(images.length ? images : [fallbackProduct]));
};

const quantityFor = (quantity: unknown) => {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ProductDetails: React.FC = () => {
  const { productId } = useParams();
  const id = Number(productId);
  const queryClient = useQueryClient();
  const session = sessionService.getSession();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [, setGuestStoreVersion] = useState(0);

  const productQuery = useQuery({
    queryKey: ["product", id],
    enabled: Number.isFinite(id),
    queryFn: async () => {
      try {
        const response = await platformProductService.getProduct(id);
        return response.data;
      } catch {
        const response = await platformProductService.getProducts(1, 100);
        const product = response.data.find((item) => item.id === id);
        if (!product) throw new Error("Product not found");
        return product;
      }
    },
  });

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

  const relatedQuery = useQuery({
    queryKey: ["related-products", productQuery.data?.category, id],
    enabled: Boolean(productQuery.data),
    queryFn: () => platformProductService.getProducts(1, 24),
  });

  useEffect(() => {
    const refresh = () => setGuestStoreVersion((version) => version + 1);
    window.addEventListener("nivaana-guest-store-change", refresh);
    window.addEventListener("nivaana-session-change", refresh);
    return () => {
      window.removeEventListener("nivaana-guest-store-change", refresh);
      window.removeEventListener("nivaana-session-change", refresh);
    };
  }, []);

  const product = productQuery.data;
  const images = useMemo(() => productImages(product), [product]);
  const activeImage = images[selectedImage] || fallbackProduct;
  const rating = product?.averagerating ?? 4.7;
  const hasDiscount = Boolean(product && product.discount > 0);
  const availableStock = getAvailableStock(product);
  const productOutOfStock = isOutOfStock(product);
  const productLowStock = isLowStock(product);
  const userCartItem = session ? cartQuery.data?.data.find((item) => item.productid === product?.id && item.iscart) : undefined;
  const userWishlistItem = session
    ? wishlistQuery.data?.data.find((item) => item.productid === product?.id && item.iswishlist)
    : undefined;
  const guestCartItem = !session ? guestStoreService.getCart().find((item) => item.productid === product?.id) : undefined;
  const guestWishlistItem = !session ? guestStoreService.getWishlist().find((item) => item.productid === product?.id) : undefined;
  const cartItem = userCartItem ?? guestCartItem;
  const wishlistItem = userWishlistItem ?? guestWishlistItem;
  const isInWishlist = Boolean(wishlistItem);
  const cartQuantity = quantityFor(cartItem?.quantity);
  const displayedQuantity = cartItem ? cartQuantity : productOutOfStock ? 0 : quantity;
  const maxQuantity = Math.max(availableStock, 0);

  const relatedProducts = useMemo(
    () =>
      (relatedQuery.data?.data ?? [])
        .filter((item) => item.id !== product?.id)
        .filter((item) => !product?.category || item.category === product.category)
        .slice(0, 5),
    [product?.category, product?.id, relatedQuery.data?.data]
  );

  const addToCart = useMutation<string | undefined>({
    mutationFn: async () => {
      if (!product) return;
      setMessage("");
      const quantityToAdd = cartItem ? 1 : quantity;
      const requestedQuantity = Number(userCartItem?.quantity ?? guestCartItem?.quantity ?? 0) + quantityToAdd;

      if (productOutOfStock) {
        throw new Error("This item is currently out of stock. You can save it to wishlist.");
      }

      if (requestedQuantity > availableStock) {
        throw new Error(stockLimitMessage(availableStock));
      }

      if (!session) {
        guestStoreService.addToCart(product.id, quantityToAdd);
        return cartItem ? "Cart quantity updated." : "Added to cart.";
      }

      const nextQuantity = clampQuantity(requestedQuantity, availableStock);
      await cartService.upsert({
        id: userCartItem?.id ?? userWishlistItem?.id,
        productid: product.id,
        userid: session.user.id,
        quantity: nextQuantity,
        iscart: true,
        iswishlist: Boolean(wishlistItem),
      });
      return cartItem ? "Cart quantity updated." : "Added to cart.";
    },
    onSuccess: (successMessage) => {
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
      if (successMessage) setMessage(successMessage);
    },
    onError: (error) => setMessage(error.message),
  });

  const updateCartQuantity = useMutation<string | undefined, Error, number>({
    mutationFn: async (nextQuantityValue: number) => {
      if (!product) return;
      setMessage("");
      const nextQuantity = clampQuantity(nextQuantityValue, availableStock);

      if (nextQuantityValue > displayedQuantity && productOutOfStock) {
        throw new Error("This item is currently out of stock. You can save it to wishlist.");
      }

      if (nextQuantityValue > availableStock) {
        throw new Error(stockLimitMessage(availableStock));
      }

      if (!session) {
        guestStoreService.updateCartQuantity(product.id, nextQuantity);
        return nextQuantity <= 0 ? "Removed from cart." : "Cart quantity updated.";
      }

      if (!userCartItem) {
        if (nextQuantity <= 0) return;
        await cartService.upsert({
          id: userWishlistItem?.id,
          productid: product.id,
          userid: session.user.id,
          quantity: nextQuantity,
          iscart: true,
          iswishlist: Boolean(wishlistItem),
        });
        return "Cart quantity updated.";
      }

      if (nextQuantity <= 0) {
        if (userCartItem.iswishlist || Boolean(wishlistItem)) {
          await cartService.upsert({
            id: userCartItem.id,
            productid: userCartItem.productid,
            userid: userCartItem.userid,
            quantity: Math.max(userCartItem.quantity || 1, 1),
            iscart: false,
            iswishlist: true,
          });
        } else {
          await cartService.remove(userCartItem.id);
        }
        return "Removed from cart.";
      }

      await cartService.upsert({
        id: userCartItem.id,
        productid: userCartItem.productid,
        userid: userCartItem.userid,
        quantity: nextQuantity,
        iscart: true,
        iswishlist: userCartItem.iswishlist || Boolean(wishlistItem),
      });
      return "Cart quantity updated.";
    },
    onSuccess: (successMessage) => {
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
      if (successMessage) setMessage(successMessage);
    },
    onError: (error) => setMessage(error.message),
  });

  const toggleWishlist = useMutation<"added" | "removed" | undefined>({
    mutationFn: async () => {
      if (!product) return;
      setMessage("");

      if (!session) {
        if (isInWishlist) {
          guestStoreService.removeFromWishlist(product.id);
          return "removed";
        } else {
          guestStoreService.addToWishlist(product.id);
          return "added";
        }
      }

      const existing = userWishlistItem ?? userCartItem;
      if (isInWishlist && existing) {
        if (userCartItem) {
          await cartService.upsert({
            id: existing.id,
            productid: product.id,
            userid: session.user.id,
            quantity: Math.max(userCartItem.quantity || 1, 1),
            iscart: true,
            iswishlist: false,
          });
        } else {
          await cartService.remove(existing.id);
        }
        return "removed";
      }

      await cartService.upsert({
        id: existing?.id,
        productid: product.id,
        userid: session.user.id,
        quantity: Math.max(cartItem?.quantity || quantity, 1),
        iscart: Boolean(cartItem),
        iswishlist: true,
      });
      return "added";
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
      if (action) setMessage(action === "removed" ? "Removed from wishlist." : "Saved to wishlist.");
    },
  });

  if (productQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
        <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_460px]">
          <Skeleton className="h-[560px]" />
          <Skeleton className="h-[560px]" />
        </section>
      </main>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-12">
        <section className="mx-auto max-w-lg rounded-[var(--radius-md)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Product not found</h1>
          <Link to="/products" className="mt-6 inline-flex">
            <Button>Back to Products</Button>
          </Link>
        </section>
      </main>
    );
  }

  const price = finalPrice(product);

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 text-sm text-[var(--color-muted)]">
          <Link to="/" className="hover:text-[var(--color-secondary)]">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:text-[var(--color-secondary)]">Products</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-text)]">{product.name}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_470px]">
          <div className="grid gap-4 lg:grid-cols-[92px_1fr]">
            <div className="order-2 flex gap-3 overflow-x-auto lg:order-1 lg:flex-col lg:overflow-visible">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border bg-white",
                    selectedImage === index ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]" : "border-[var(--color-border)]"
                  )}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="order-1 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white lg:order-2">
              <img
                src={activeImage}
                alt={product.name}
                className="h-[360px] w-full object-contain sm:h-[520px] lg:h-[640px]"
                onError={(event) => {
                  event.currentTarget.src = fallbackProduct;
                }}
              />
            </div>
          </div>

          <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-secondary)]">
              <span>{formatLabel(product.subcategory || product.category)}</span>
              {productOutOfStock && <span className="text-[var(--color-danger)]">Out of Stock</span>}
              {productLowStock && <span className="text-[var(--color-danger)]">Low Stock</span>}
            </div>

            <h1 className="mt-3 text-2xl font-extrabold leading-tight text-[var(--color-text)] sm:text-3xl">{product.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-[var(--color-primary)] text-[var(--color-primary)]" />
                {rating.toFixed(1)}
              </span>
              <span>{(product.soldquantity || 0).toLocaleString("en-IN")} sold</span>
              <span>{availableStock} available</span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
              {product.shortdescription || product.fulldescription || "Premium Nivaana fragrance crafted for everyday rituals."}
            </p>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <span className="text-3xl font-extrabold text-[var(--color-secondary)]">Rs. {price.toLocaleString("en-IN")}</span>
              {hasDiscount && (
                <>
                  <span className="pb-1 text-sm text-[var(--color-muted)] line-through">Rs. {product.price.toLocaleString("en-IN")}</span>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-[var(--color-danger)]">
                    Save Rs. {product.discount.toLocaleString("en-IN")}
                  </span>
                </>
              )}
            </div>

            <div className="mt-5 rounded-[var(--radius-sm)] border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 p-4">
              <p className="text-sm font-bold text-[var(--color-text)]">Offers</p>
              <ul className="mt-2 space-y-2 text-sm text-[var(--color-muted)]">
                <li>Instant savings shown in product price.</li>
                <li>Login before checkout to sync cart and wishlist.</li>
                <li>Fresh Nivaana picks for home, prayer spaces, and travel.</li>
              </ul>
            </div>

            <div className="mt-5">
              {productOutOfStock && (
                <p className="mb-3 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                  This item is currently out of stock. Add it to wishlist and check back later.
                </p>
              )}
              <p className="text-sm font-bold text-[var(--color-text)]">Choose quantity</p>
              <div className="mt-3 inline-flex h-11 items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
                <button
                  type="button"
                  className="grid h-full w-11 place-items-center transition hover:bg-white disabled:opacity-40"
                  onClick={() => {
                    if (cartItem) {
                      updateCartQuantity.mutate(cartQuantity - 1);
                    } else {
                      setQuantity((value) => Math.max(value - 1, 1));
                    }
                  }}
                  disabled={cartItem ? updateCartQuantity.isPending : quantity <= 1}
                  aria-label={cartItem && cartQuantity <= 1 ? "Remove from cart" : "Decrease quantity"}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-16 px-3 text-center text-sm font-bold">Qty {displayedQuantity}</span>
                <button
                  type="button"
                  className="grid h-full w-11 place-items-center transition hover:bg-white disabled:opacity-40"
                  onClick={() => {
                    if (cartItem) {
                      updateCartQuantity.mutate(cartQuantity + 1);
                    } else {
                      setQuantity((value) => Math.min(value + 1, maxQuantity));
                    }
                  }}
                  disabled={
                    updateCartQuantity.isPending ||
                    productOutOfStock ||
                    displayedQuantity >= maxQuantity
                  }
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Button
                className="h-12 gap-2"
                disabled={productOutOfStock || addToCart.isPending || (Boolean(cartItem) && cartQuantity >= maxQuantity)}
                onClick={() => addToCart.mutate()}
              >
                <ShoppingBag className="h-4 w-4" />
                {productOutOfStock ? "Out of Stock" : cartItem ? "Add More" : "Add to Cart"}
              </Button>
              <Button
                variant="secondary"
                className="h-12 gap-2"
                disabled={toggleWishlist.isPending}
                onClick={() => toggleWishlist.mutate()}
              >
                <Heart className={cn("h-4 w-4", isInWishlist && "fill-[var(--color-secondary)]")} />
                {isInWishlist ? "Saved" : "Wishlist"}
              </Button>
            </div>

            {message && <p className="mt-3 text-sm font-semibold text-green-700">{message}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                [Truck, "Free delivery checks at checkout"],
                [ShieldCheck, "Secure payment"],
                [RefreshCw, "Replacement support"],
                [Package, "Packed with care"],
              ].map(([Icon, label]) => (
                <div key={label as string} className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-3 text-xs font-semibold text-[var(--color-secondary)]">
                  <Icon className="h-4 w-4" />
                  <span>{label as string}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <InfoPanel title="Overview" icon={<Sparkles className="h-5 w-5" />}>
            <p>{product.fulldescription || product.shortdescription || "A premium Nivaana product made to add calm, freshness, and a refined ritual feel to everyday spaces."}</p>
          </InfoPanel>
          <InfoPanel title="How to Use" icon={<CheckCircle className="h-5 w-5" />}>
            <p>Place or use the product in a clean, dry space. Keep away from direct heat, children, and pets unless the product instructions say otherwise.</p>
          </InfoPanel>
          <InfoPanel title="Details" icon={<Package className="h-5 w-5" />}>
            <ul className="space-y-2">
              <li>Category: {formatLabel(product.category)}</li>
              <li>Subcategory: {formatLabel(product.subcategory)}</li>
              {product.fragnancetype && <li>Fragrance: {formatLabel(product.fragnancetype)}</li>}
              {product.pack && <li>Pack: {product.pack}</li>}
              <li>PUC: {product.puc}</li>
            </ul>
          </InfoPanel>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-secondary)]">More recommendations</p>
                <h2 className="mt-2 text-2xl font-bold text-[var(--color-text)]">You may also like</h2>
              </div>
              <Link to="/products" className="text-sm font-bold text-[var(--color-secondary)] hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {relatedProducts.map((item) => (
                <ProductCard key={item.id} product={item} compact />
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
};

function InfoPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 text-sm leading-7 text-[var(--color-muted)] shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2 text-[var(--color-secondary)]">
        {icon}
        <h2 className="text-base font-bold text-[var(--color-text)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default ProductDetails;

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Trash2 } from "lucide-react";
import { cartService } from "../services/cartService";
import { platformProductService } from "../services/productPlatformService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { Button } from "../components/ui/button";
import { toast } from "../components/toastApi";
import fallbackProduct from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";
import type { Product } from "../types";
import { getProductDisplayName } from "../lib/productDisplay";
import { isOutOfStock } from "../lib/stock";
import { friendlyNotificationMessage } from "../lib/notificationMessages";

const imageFor = (product?: { medium: string[] | null; small: string[] | null; large: string[] | null }) =>
  product?.medium?.[0] || product?.small?.[0] || product?.large?.[0] || fallbackProduct;

type MoveToCartInput = {
  itemId: number;
  productid: number;
  product?: Product;
};

const Wishlist: React.FC = () => {
  const queryClient = useQueryClient();
  const session = sessionService.getSession();
  const [, setGuestVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setGuestVersion((version) => version + 1);
    window.addEventListener("nivaana-guest-store-change", refresh);
    return () => window.removeEventListener("nivaana-guest-store-change", refresh);
  }, []);

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", session?.user.id],
    queryFn: () => cartService.getWishlist(session!.user.id),
    enabled: Boolean(session),
  });

  const productsQuery = useQuery({
    queryKey: ["wishlist-products"],
    queryFn: () => platformProductService.getProducts(1, 100),
  });

  const moveToCart = useMutation<unknown, Error, MoveToCartInput>({
    mutationFn: ({ itemId, productid, product }) => {
      if (!product) {
        return Promise.reject(new Error("Product details are not available yet."));
      }

      if (isOutOfStock(product)) {
        return Promise.reject(new Error("This item is currently out of stock."));
      }

      if (!session) {
        guestStoreService.addToCart(productid);
        guestStoreService.removeFromWishlist(productid);
        return Promise.resolve();
      }

      const item = wishlistQuery.data?.data.find((row) => row.id === itemId);
      if (!item) {
        return Promise.reject(new Error("Wishlist item not found."));
      }

      return cartService.upsert({
        id: item.id,
        productid: item.productid,
        userid: item.userid,
        quantity: Math.max(item.quantity || 1, 1),
        iscart: true,
        iswishlist: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      toast.success("Moved to cart.");
    },
    onError: (error) => toast.error(friendlyNotificationMessage(error.message)),
  });

  const remove = useMutation<unknown, Error, number>({
    mutationFn: (id: number) => {
      if (!session) {
        guestStoreService.removeFromWishlist(id);
        return Promise.resolve();
      }

      const item = wishlistQuery.data?.data.find((row) => row.id === id);
      if (!item) {
        return Promise.reject(new Error("Wishlist item not found."));
      }

      return item.iscart
        ? cartService.upsert({
            id: item.id,
            productid: item.productid,
            userid: item.userid,
            quantity: Math.max(item.quantity || 1, 1),
            iscart: true,
            iswishlist: false,
          })
        : cartService.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      toast.success("Removed from wishlist.");
    },
    onError: (error) => toast.error(friendlyNotificationMessage(error.message)),
  });

  const products = productsQuery.data?.data ?? [];
  const items = session ? wishlistQuery.data?.data ?? [] : guestStoreService.getWishlist();
  const wishlistProducts = items.map((item) => ({
    item,
    apiId: "id" in item && typeof item.id === "number" ? item.id : undefined,
    product: products.find((product) => product.id === item.productid),
  }));

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">Wishlist</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {items.length} saved items{session ? "" : " as guest"}
        </p>
        {!session && items.length > 0 && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-muted)]">
            Login to move these saved products into your account wishlist.
            <Link to="/login?redirect=/wishlist" className="ml-2 font-bold text-[var(--color-secondary)]">Login</Link>
          </div>
        )}

        {session && wishlistQuery.isLoading ? (
          <div className="mt-8 rounded-[var(--radius-md)] bg-white p-8 text-sm text-[var(--color-muted)]">Loading wishlist...</div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-md)] bg-white p-10 text-center shadow-[var(--shadow-card)]">
            <h2 className="text-xl font-bold">No wishlist items yet</h2>
            <Link to="/products" className="mt-5 inline-flex"><Button>Explore Products</Button></Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {wishlistProducts.map(({ apiId, item, product }) => {
              const displayName = getProductDisplayName(product, `Product #${item.productid}`);
              const price = product ? Math.max(product.price - product.discount, 0) : 0;
              const productMissing = !productsQuery.isLoading && !product;
              const outOfStock = Boolean(product) && isOutOfStock(product);
              const cannotAddToCart = productsQuery.isLoading || productMissing || outOfStock;

              return (
                <article
                  key={`${item.productid}-${apiId ?? "guest"}`}
                  className="relative flex gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]"
                >
                  <Link
                    to={`/products/${item.productid}`}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface)]"
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
                  <div className="min-w-0 flex-1 pr-16">
                    <Link
                      to={`/products/${item.productid}`}
                      className="line-clamp-2 text-base font-bold text-[var(--color-text)] hover:text-[var(--color-secondary)]"
                    >
                      {displayName}
                    </Link>
                    {product?.shortdescription && (
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">{product.shortdescription}</p>
                    )}
                    {outOfStock && (
                      <p className="mt-3 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                        <span className="sm:hidden">Out of Stock</span>
                        <span className="hidden sm:inline">This item is currently out of stock.</span>
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        className="h-9 w-9 !border !border-[var(--color-border)] !bg-white px-0 !text-[var(--color-text)] hover:!border-[var(--color-primary)] hover:!bg-[var(--color-primary)]/15 sm:w-auto sm:px-4"
                        disabled={moveToCart.isPending || cannotAddToCart}
                        onClick={() => moveToCart.mutate({ itemId: apiId ?? item.productid, productid: item.productid, product })}
                        aria-label={`Add ${displayName} to cart`}
                      >
                        <ShoppingBag className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Add to Cart</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 w-9 !border !border-[var(--color-border)] !bg-white px-0 !text-red-600 hover:!border-red-200 hover:!bg-red-50 sm:px-3"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(apiId ?? item.productid)}
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="absolute right-4 top-4 text-right text-sm font-bold text-[var(--color-secondary)]">
                    Rs. {price.toLocaleString("en-IN")}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Wishlist;

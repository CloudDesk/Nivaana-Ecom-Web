import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Trash2 } from "lucide-react";
import { cartService } from "../services/cartService";
import { platformProductService } from "../services/productPlatformService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { Button } from "../components/ui/button";
import { PageSkeleton } from "../components/PageSkeleton";
import { toast } from "../components/toastApi";
import { productFallback as fallbackProduct } from "../assets/config.js";
import type { Product } from "../types";
import { getProductDisplayName } from "../lib/productDisplay";
import { isOutOfStock } from "../lib/stock";
import { friendlyNotificationMessage } from "../lib/notificationMessages";
import { RichTextContent } from "../components/RichTextContent";
import { AccountPageHeader } from "../components/AccountPageHeader";
import { ACCOUNT_PAGE_CONTAINER, ACCOUNT_PAGE_MAIN } from "../lib/accountLayout";

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
  // Cards need the product catalogue for name/image/price, so hold the skeleton
  // until it arrives too — otherwise "Product #id", the fallback image and Rs. 0 flash first.
  const isLoading = (session && wishlistQuery.isLoading) || (items.length > 0 && productsQuery.isLoading);

  return (
    <main className={ACCOUNT_PAGE_MAIN}>
      <section className={ACCOUNT_PAGE_CONTAINER}>
        <AccountPageHeader
          currentPage="Wishlist"
          title="Wishlist"
          subtitle={session && wishlistQuery.isLoading ? "Loading saved items…" : `${items.length} saved ${items.length === 1 ? "item" : "items"}${session ? "" : " as guest"}`}
        />
        {!session && items.length > 0 && (
          <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-muted)]">
            Login to move these saved products into your account wishlist.
            <Link to="/login?redirect=/wishlist" className="ml-2 font-bold text-[var(--color-secondary)]">Login</Link>
          </div>
        )}

        {isLoading ? (
          <div className="mt-8">
            <PageSkeleton variant="wishlist" count={Math.min(items.length || 4, 6)} hideHeader />
          </div>
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
              const hasDiscount = Boolean(product && product.discount > 0);
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
                      className={`h-full w-full object-cover ${outOfStock ? "opacity-70 grayscale" : ""}`}
                      onError={(event) => {
                        event.currentTarget.src = fallbackProduct;
                      }}
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      to={`/products/${item.productid}`}
                      className="line-clamp-2 text-base font-bold text-[var(--color-text)] hover:text-[var(--color-secondary)]"
                    >
                      {displayName}
                    </Link>
                    {product?.shortdescription && (
                      // Same sanitised HTML rendering as Product Details; capped at two
                      // lines (clamp + max height) so the card never grows.
                      <RichTextContent
                        content={product.shortdescription}
                        className="mt-2 line-clamp-2 max-h-12 overflow-hidden text-sm leading-6 text-[var(--color-muted)] [&_blockquote]:my-0 [&_h2]:my-0 [&_h2]:text-sm [&_h3]:my-0 [&_h3]:text-sm [&_li]:my-0 [&_ol]:my-0 [&_p]:my-0 [&_ul]:my-0"
                      />
                    )}
                    {/* Price on the left, actions on the right, pinned to the card bottom. */}
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[var(--color-text)]">Rs. {price.toLocaleString("en-IN")}</p>
                        {hasDiscount && product && (
                          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-[var(--color-muted)]">
                            <span className="line-through">Rs. {product.price.toLocaleString("en-IN")}</span>
                            <span className="font-semibold text-[var(--color-danger)]">Save Rs. {product.discount.toLocaleString("en-IN")}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {outOfStock ? (
                          // Status label, not a button: replaces Add to Cart so it can't be clicked.
                          <span className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-red-50 px-3 text-sm font-semibold text-red-600 sm:px-4">
                            Out of Stock
                          </span>
                        ) : (
                          <Button
                            className="h-10 gap-2 px-3 shadow-none hover:translate-y-0 hover:shadow-none sm:px-4"
                            disabled={moveToCart.isPending || cannotAddToCart}
                            onClick={() => moveToCart.mutate({ itemId: apiId ?? item.productid, productid: item.productid, product })}
                            aria-label={`Add ${displayName} to cart`}
                          >
                            <ShoppingBag className="h-4 w-4" />
                            <span className="hidden sm:inline">Add to Cart</span>
                          </Button>
                        )}
                        <button
                          type="button"
                          className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white text-[var(--color-muted)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(apiId ?? item.productid)}
                          aria-label={`Remove ${displayName} from wishlist`}
                          title="Remove from wishlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
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

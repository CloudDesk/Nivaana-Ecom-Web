import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import { cartService } from "../services/cartService";
import { platformProductService } from "../services/productPlatformService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { Button } from "../components/ui/button";
import fallbackProduct from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";

const imageFor = (product?: { medium: string[] | null; small: string[] | null; large: string[] | null }) =>
  product?.medium?.[0] || product?.small?.[0] || product?.large?.[0] || fallbackProduct;

const Cart: React.FC = () => {
  const queryClient = useQueryClient();
  const session = sessionService.getSession();
  const [, setGuestVersion] = useState(0);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const refresh = () => setGuestVersion((version) => version + 1);
    window.addEventListener("nivaana-guest-store-change", refresh);
    return () => window.removeEventListener("nivaana-guest-store-change", refresh);
  }, []);

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
    { id?: number; productid: number; userid?: number; quantity: number; iswishlist?: boolean }
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] }),
    onError: () => setActionError("Could not update cart. Please try again."),
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
    apiId: "id" in item && typeof item.id === "number" ? item.id : undefined,
    product: products.find((product) => product.id === item.productid),
  }));
  const total = enriched.reduce((sum, row) => {
    const price = row.product ? Math.max(row.product.price - row.product.discount, 0) : 0;
    return sum + price * row.item.quantity;
  }, 0);

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
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {enriched.map(({ apiId, item, product }) => (
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
                    <p className="mt-1 text-sm text-[var(--color-muted)]">Qty: {item.quantity}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        className="h-9 px-3"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({
                            id: apiId,
                            productid: item.productid,
                            userid: session?.user.id,
                            quantity: item.quantity - 1,
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
                          mutation.mutate({
                            id: apiId,
                            productid: item.productid,
                            userid: session?.user.id,
                            quantity: item.quantity + 1,
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
                            quantity: item.quantity,
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
                          mutation.mutate({
                            id: apiId,
                            productid: item.productid,
                            userid: session?.user.id,
                            quantity: 0,
                            iswishlist: item.iswishlist,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold text-[var(--color-secondary)]">
                    Rs. {product ? Math.max(product.price - product.discount, 0).toLocaleString("en-IN") : 0}
                  </div>
                </article>
              ))}
            </div>
            <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Order Summary</h2>
              <div className="mt-4 flex justify-between text-sm">
                <span>Total</span>
                <strong>Rs. {total.toLocaleString("en-IN")}</strong>
              </div>
              {session ? (
                <Button className="mt-5 w-full">Checkout</Button>
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

function EmptyState({ title }: { title: string }) {
  return (
    <div className="mt-8 rounded-[var(--radius-md)] bg-white p-10 text-center shadow-[var(--shadow-card)]">
      <h2 className="text-xl font-bold">{title}</h2>
      <Link to="/products" className="mt-5 inline-flex"><Button>Shop Products</Button></Link>
    </div>
  );
}

export default Cart;

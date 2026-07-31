import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  Heart,
  IndianRupee,
  Leaf,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  WandSparkles,
  X,
} from "lucide-react";
import CategoryNavigationRail from "../components/CategoryNavigationRail";
import {
  buildChildCategoryItems,
  buildTopCategoryItems,
  matchesProductCategory,
  resolveActiveCategory,
  resolveActiveChildKey,
  resolveProductListingParams,
  type CategoryNavChildItem,
  type CategoryNavTopItem,
} from "../components/categoryNavigationData";
import CategoryShowcaseBanner from "../components/CategoryShowcaseBanner";
import ProductCard from "../components/ProductCard";
import RecentProductRail from "../components/RecentProductRail";
import { toast } from "../components/toastApi";
import { friendlyNotificationMessage } from "../lib/notificationMessages";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { productFallback as fallbackProduct } from "../assets/config.js";
import { cartService } from "../services/cartService";
import { guestStoreService } from "../services/guestStoreService";
import { platformProductService } from "../services/productPlatformService";
import { promotionService, type Promotion } from "../services/promotionService";
import { ratingService } from "../services/ratingService";
import { sessionService } from "../services/sessionService";
import type { Product, Rating } from "../types";
import { cn } from "../lib/utils";
import { getProductDisplayName } from "../lib/productDisplay";
import { saveRecentlyViewedProductId } from "../lib/recentlyViewed";
import { getAvailableStock, isLowStock, isOutOfStock, stockLimitMessage, stockStatusLabel } from "../lib/stock";

const formatLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Nivaana";

const finalPrice = (product: Product) => Math.max(product.price - product.discount, 0);
const clampQuantity = (quantity: number, availableQuantity: number) =>
  Math.min(Math.max(quantity, 0), Math.max(availableQuantity, 0));
const fiveCardProductRailItem =
  "w-[72vw] min-w-[210px] max-w-[280px] flex-none snap-start sm:w-[38vw] sm:max-w-[320px] md:w-[30vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_4rem)/5)]";

const isAuthExpiredError = (error: Error) =>
  (error as Error & { statusCode?: number }).statusCode === 401 || /invalid or expired token|unauthorized/i.test(error.message);

const isWarningMessage = (message: string) =>
  /out of stock|available stock|only \d+ item|currently available|quantity/i.test(message);

const splitDescriptionPoints = (product: Product) => {
  const source = product.fulldescription || product.shortdescription || product.name;
  const chunks = source
    .split(/[.|]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 18);

  const fallback = [
    "Premium fragrance crafted for everyday rituals",
    "Designed for calm homes and mindful spaces",
    "Easy to place, use, and enjoy daily",
  ];

  return (chunks.length ? chunks : fallback).slice(0, 3);
};

const productOfferItems = (product: Product, promotions: Promotion[] = []) => {
  if (promotions.length > 0) {
    const offerLines = promotions.map((promotion) => {
      const name = promotion.name?.trim() || "Offer";
      const description = promotion.description?.trim();
      const hasUniqueDescription = description && description.toLowerCase() !== name.toLowerCase();
      const code = promotion.code ? ` Use code ${promotion.code}.` : "";
      return `${name}${hasUniqueDescription ? ` - ${description}` : "."}${code}`;
    });

    return Array.from(new Set(offerLines)).slice(0, 4);
  }

  const price = finalPrice(product);
  const items = [];

  if (product.discount > 0) {
    items.push(`Save Rs. ${product.discount.toLocaleString("en-IN")} on this product.`);
    items.push(`Offer price: Rs. ${price.toLocaleString("en-IN")} instead of Rs. ${product.price.toLocaleString("en-IN")}.`);
  } else {
    items.push(`Available at Rs. ${price.toLocaleString("en-IN")}.`);
  }

  if (product.isdealoftheday) {
    items.push("Deal of the Day pricing is active for this product.");
  }

  items.push("Add to cart to apply eligible checkout offers.");

  return items.slice(0, 4);
};

const reviewAuthor = (review: Rating) => review.usermail || (review.userid ? `Customer #${review.userid}` : "Customer");

const formatReviewDate = (value?: number | null) => {
  if (!value) return "";
  const timestamp = value > 0 && value < 1_000_000_000_000 ? value * 1000 : value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp);
};

const productImages = (product?: Product) => {
  const images = product?.large?.length
    ? product.large
    : product?.medium?.length
      ? product.medium
      : product?.small ?? [];

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
  const navigate = useNavigate();
  const session = sessionService.getSession();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);
  const [, setGuestStoreVersion] = useState(0);
  const [mainImageDragOffset, setMainImageDragOffset] = useState(0);
  const thumbnailScrollerRef = React.useRef<HTMLDivElement | null>(null);
  const thumbnailButtonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const mainImageSwipeRef = React.useRef({ startX: 0, startY: 0, tracking: false });
  const mainImageWheelLockRef = React.useRef(false);

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

  const categoryNavProductsQuery = useQuery({
    queryKey: ["category-navigation-products"],
    queryFn: () => platformProductService.getProducts(1, 1000),
    staleTime: 1000 * 60,
  });

  const categoryTreeQuery = useQuery({
    queryKey: ["product-category-tree", "sortorder-v3"],
    queryFn: () => platformProductService.getCategoryTree(),
    staleTime: 1000 * 60,
  });

  const publicPromotionsQuery = useQuery({
    queryKey: ["detail-public-promotions", session?.user.id],
    queryFn: () => promotionService.mine("web"),
    enabled: Boolean(session),
    staleTime: 1000 * 60 * 5,
  });

  const ratingsQuery = useQuery({
    queryKey: ["product-ratings", productQuery.data?.id],
    queryFn: () => ratingService.getRatings(1, 100),
    enabled: Boolean(productQuery.data?.id),
    staleTime: 1000 * 60 * 5,
  });

  const recentlyViewedQuery = useQuery({
    queryKey: ["recently-viewed-products"],
    queryFn: () => platformProductService.getProducts(1, 100),
    enabled: recentlyViewedIds.length > 0,
    staleTime: 1000 * 60 * 5,
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
  const categoryTree = categoryTreeQuery.data?.data;
  const categoryNavProducts = useMemo(() => {
    const catalogProducts = categoryNavProductsQuery.data?.data ?? [];
    if (!product) return catalogProducts;
    return [product, ...catalogProducts.filter((item) => item.id !== product.id)];
  }, [categoryNavProductsQuery.data?.data, product]);
  const displayName = getProductDisplayName(product);
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
  const displayedQuantity = cartItem ? cartQuantity : 0;
  const maxQuantity = Math.max(availableStock, 0);
  const productListingParams = useMemo(() => resolveProductListingParams(product), [product]);
  const activeCategoryKey = useMemo(
    () =>
      productListingParams.category ??
      resolveActiveCategory({ tree: categoryTree, products: categoryNavProducts }),
    [categoryNavProducts, categoryTree, productListingParams.category]
  );
  const categoryNavTopItems = useMemo(() => buildTopCategoryItems(categoryTree), [categoryTree]);
  const categoryNavChildItems = useMemo(
    () => buildChildCategoryItems(categoryNavProducts, categoryTree, activeCategoryKey),
    [activeCategoryKey, categoryNavProducts, categoryTree]
  );
  const activeCategoryChildKey = useMemo(
    () =>
      resolveActiveChildKey({
        childItems: categoryNavChildItems,
        product,
      }),
    [categoryNavChildItems, product]
  );

  useEffect(() => {
    if (!product?.id) return;
    setRecentlyViewedIds(saveRecentlyViewedProductId(product.id));
  }, [product?.id]);

  const scrollThumbnails = (direction: number) => {
    const scroller = thumbnailScrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.75, 160),
      behavior: "smooth",
    });
  };

  const moveMainImage = (direction: number) => {
    if (images.length <= 1) return;
    setSelectedImage((currentIndex) => (currentIndex + direction + images.length) % images.length);
  };

  const resetMainImageDrag = () => {
    mainImageSwipeRef.current.tracking = false;
    setMainImageDragOffset(0);
  };

  useEffect(() => {
    setSelectedImage(0);
  }, [product?.id]);

  useEffect(() => {
    const activeThumbnail = thumbnailButtonRefs.current[selectedImage];
    if (!activeThumbnail) return;

    activeThumbnail.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedImage]);

  const relatedProducts = useMemo(
    () =>
      (relatedQuery.data?.data ?? [])
        .filter((item) => item.id !== product?.id)
        .filter((item) => !activeCategoryKey || matchesProductCategory(item, activeCategoryKey))
        .slice(0, 5),
    [activeCategoryKey, product?.id, relatedQuery.data?.data]
  );
  const availablePromotions = publicPromotionsQuery.data?.data ?? [];
  const productReviews = useMemo(
    () =>
      (ratingsQuery.data?.data ?? [])
        .filter((review) => review.productid === product?.id)
        .sort((a, b) => (b.createddate ?? 0) - (a.createddate ?? 0)),
    [product?.id, ratingsQuery.data?.data]
  );
  const recentlyViewedProducts = useMemo(() => {
    const currentProductId = product?.id;
    const recentlyViewedSet = new Set(recentlyViewedIds.filter((itemId) => itemId !== currentProductId));
    const productsById = new Map((recentlyViewedQuery.data?.data ?? []).map((item) => [item.id, item]));

    return Array.from(recentlyViewedSet)
      .map((itemId) => productsById.get(itemId))
      .filter((item): item is Product => Boolean(item))
      .slice(0, 10);
  }, [product?.id, recentlyViewedIds, recentlyViewedQuery.data?.data]);
  const recentContextProducts = useMemo(() => {
    const source = [product, ...relatedProducts, ...recentlyViewedProducts].filter(
      (item, index, array): item is Product =>
        Boolean(item) && array.findIndex((candidate) => candidate?.id === item?.id) === index
    );

    return source.slice(0, 4);
  }, [product, relatedProducts, recentlyViewedProducts]);

  const handleMutationError = (error: Error) => {
    if (isAuthExpiredError(error)) {
      sessionService.clearSession();
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    const message = friendlyNotificationMessage(error.message);

    if (isWarningMessage(message)) {
      toast.warning(message);
    } else {
      toast.error(message);
    }
  };

  const ensureProductInCart = async (incrementExisting: boolean) => {
    if (!product) return;
    const currentQuantity = Number(userCartItem?.quantity ?? guestCartItem?.quantity ?? 0);
    const quantityToAdd = incrementExisting || currentQuantity <= 0 ? 1 : 0;
    const requestedQuantity = currentQuantity + quantityToAdd;

    if (productOutOfStock) {
      throw new Error("This item is currently out of stock. You can save it to wishlist.");
    }

    if (requestedQuantity > availableStock) {
      throw new Error(stockLimitMessage(availableStock));
    }

    if (!session) {
      if (quantityToAdd > 0) {
        guestStoreService.addToCart(product.id, quantityToAdd);
      }
      return cartItem || quantityToAdd === 0 ? "Cart quantity updated." : "Added to cart.";
    }

    await cartService.upsert({
      id: userCartItem?.id ?? userWishlistItem?.id,
      productid: product.id,
      userid: session.user.id,
      quantity: clampQuantity(requestedQuantity, availableStock),
      iscart: true,
      iswishlist: Boolean(wishlistItem),
    });

    return cartItem || quantityToAdd === 0 ? "Cart quantity updated." : "Added to cart.";
  };

  const addToCart = useMutation<string | undefined>({
    mutationFn: () => ensureProductInCart(true),
    onSuccess: (successMessage) => {
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
      if (successMessage) toast.success(successMessage);
    },
    onError: handleMutationError,
  });

  const checkoutProduct = useMutation<string | undefined, Error, "checkout" | "buy-now">({
    mutationFn: async (action) => {
      if (action === "checkout") {
        return ensureProductInCart(false);
      }

      if (!product) return;

      if (productOutOfStock) {
        throw new Error("This item is currently out of stock. You can save it to wishlist.");
      }

      if (availableStock < 1) {
        throw new Error(stockLimitMessage(availableStock));
      }

      return "Ready for checkout.";
    },
    onSuccess: (_, action) => {
      if (action === "checkout") {
        queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
        queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
      }
      if (action === "buy-now") {
        toast.success("Ready for checkout.");
      }
      const checkoutPath = `/checkout?buyNow=${product?.id}`;
      if (session) {
        navigate(checkoutPath);
      } else {
        navigate(`/login?redirect=${encodeURIComponent(checkoutPath)}`);
      }
    },
    onError: handleMutationError,
  });

  const updateCartQuantity = useMutation<string | undefined, Error, number>({
    mutationFn: async (nextQuantityValue: number) => {
      if (!product) return;
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
      if (successMessage) toast.success(successMessage);
    },
    onError: handleMutationError,
  });

  const toggleWishlist = useMutation<"added" | "removed" | undefined>({
    mutationFn: async () => {
      if (!product) return;

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
        quantity: Math.max(cartItem?.quantity || 1, 1),
        iscart: Boolean(cartItem),
        iswishlist: true,
      });
      return "added";
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] });
      if (action) toast.success(action === "removed" ? "Removed from wishlist." : "Saved to wishlist.");
    },
    onError: handleMutationError,
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
  const promotionItems = [
    hasDiscount ? `Save Rs. ${product.discount.toLocaleString("en-IN")} today` : "Fresh Nivaana picks",
    "Buy more, save more",
    "Free delivery checks at checkout",
    productLowStock ? "Low stock available" : "Secure payment",
  ];
  const navigateToCategory = (item: CategoryNavTopItem) => {
    navigate(`/products?category=${encodeURIComponent(item.value)}`);
  };
  const navigateToChildCategory = (item: CategoryNavChildItem) => {
    const params = new URLSearchParams(item.queryParams);
    navigate(`/products?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 pb-8 pt-0 sm:px-6 lg:px-8">
      <section className="min-w-0 w-full">
        <CategoryNavigationRail
          topItems={categoryNavTopItems}
          childItems={categoryNavChildItems}
          activeTopKey={activeCategoryKey}
          activeChildKey={activeCategoryChildKey}
          onTopSelect={navigateToCategory}
          onChildSelect={navigateToChildCategory}
          childRailRounded
        />
        <PromotionRail items={promotionItems} />

        <div className="mb-5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--color-muted)]">
          <Link to="/" className="hover:text-[var(--color-secondary)]">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-[var(--color-secondary)]">Products</Link>
          {activeCategoryKey && (
            <>
              <span>/</span>
              <Link to={`/products?category=${encodeURIComponent(activeCategoryKey)}`} className="hover:text-[var(--color-secondary)]">
                {formatLabel(activeCategoryKey)}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="min-w-0 break-words text-[var(--color-text)]">{displayName}</span>
        </div>

        <div className="relative mx-auto grid w-full min-w-0 max-w-[1440px] grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(480px,0.92fr)_minmax(560px,0.78fr)] lg:items-start xl:grid-cols-[minmax(560px,0.88fr)_minmax(620px,0.82fr)]">
          <div className="min-w-0 self-start">
            <div className="lg:mx-auto lg:w-full lg:max-w-[560px] xl:max-w-[620px]">
              <div
                className="min-w-0 cursor-grab touch-pan-y select-none overflow-hidden bg-white active:cursor-grabbing"
              onWheel={(event) => {
                if (images.length <= 1 || mainImageWheelLockRef.current) return;
                if (Math.abs(event.deltaX) < 28 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.2) return;

                event.preventDefault();
                mainImageWheelLockRef.current = true;
                moveMainImage(event.deltaX > 0 ? 1 : -1);
                window.setTimeout(() => {
                  mainImageWheelLockRef.current = false;
                }, 420);
              }}
              onPointerDown={(event) => {
                if (images.length <= 1) return;

                mainImageSwipeRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  tracking: true,
                };
                setMainImageDragOffset(0);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!mainImageSwipeRef.current.tracking) return;

                const distanceX = event.clientX - mainImageSwipeRef.current.startX;
                const distanceY = event.clientY - mainImageSwipeRef.current.startY;

                if (Math.abs(distanceX) > 10 && Math.abs(distanceX) > Math.abs(distanceY) * 1.2) {
                  event.preventDefault();
                  setMainImageDragOffset(Math.max(Math.min(distanceX, 96), -96));
                }
              }}
              onPointerUp={(event) => {
                if (!mainImageSwipeRef.current.tracking) return;

                const distanceX = event.clientX - mainImageSwipeRef.current.startX;
                const distanceY = event.clientY - mainImageSwipeRef.current.startY;

                resetMainImageDrag();

                if (Math.abs(distanceX) > 56 && Math.abs(distanceX) > Math.abs(distanceY) * 1.25) {
                  moveMainImage(distanceX < 0 ? 1 : -1);
                }
              }}
              onPointerCancel={resetMainImageDrag}
              onPointerLeave={(event) => {
                if (event.pointerType !== "touch" && mainImageSwipeRef.current.tracking) resetMainImageDrag();
              }}
            >
              <motion.img
                src={activeImage}
                alt={displayName}
                draggable={false}
                animate={{ x: mainImageDragOffset }}
                transition={mainImageDragOffset === 0 ? { type: "spring", stiffness: 260, damping: 28 } : { duration: 0 }}
                className="pointer-events-none block h-[360px] w-full max-w-full bg-white object-contain sm:h-[520px] lg:h-[520px] xl:h-[560px]"
                onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
                  event.currentTarget.src = fallbackProduct;
                }}
              />
            </div>
            {images.length > 1 && (
              <div className="relative mt-4 lg:shrink-0">
                {images.length > 4 && (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollThumbnails(-1)}
                      className="absolute left-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-white/95 text-[var(--color-secondary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-primary)]"
                      aria-label="Previous product images"
                    >
                      <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollThumbnails(1)}
                      className="absolute right-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-white/95 text-[var(--color-secondary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-primary)]"
                      aria-label="Next product images"
                    >
                      <ChevronRight className="h-5 w-5 stroke-[2.4]" />
                    </button>
                  </>
                )}
                <div
                  ref={thumbnailScrollerRef}
                  className="flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-1 scrollbar-hide"
                >
                  {images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      ref={(element) => {
                        thumbnailButtonRefs.current[index] = element;
                      }}
                      onClick={() => setSelectedImage(index)}
                      className={cn(
                        "h-16 w-16 shrink-0 snap-start overflow-hidden rounded-2xl border bg-white p-1 sm:h-20 sm:w-20 sm:p-1.5 xl:h-24 xl:w-24",
                        selectedImage === index
                          ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-primary)]/70"
                      )}
                    >
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full rounded-xl object-contain object-center"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>

          <aside className="min-w-0 pb-8 lg:pr-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-secondary)]">
              <span>{formatLabel(product.subcategory || product.category)}</span>
              {productOutOfStock && <span className="text-[var(--color-danger)]">Out of Stock</span>}
              {productLowStock && <span className="text-[var(--color-danger)]">Low Stock</span>}
            </div>

            <h1 className="mt-3 break-words text-2xl font-extrabold leading-tight text-[var(--color-text)] sm:text-3xl">{displayName}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-[var(--color-primary)] text-[var(--color-primary)]" />
                {rating.toFixed(1)}
              </span>
              <span>{stockStatusLabel(product)}</span>
            </div>

            <div className="mt-4 min-w-0 break-words text-sm leading-7 text-[var(--color-muted)]">
              <p>
                {product.shortdescription || product.fulldescription || "Premium Nivaana fragrance crafted for everyday rituals."}
              </p>
            </div>

            <div className="mt-5">
              <p className="text-sm font-bold text-[var(--color-text)]">Offers</p>
              <div className="mt-2 min-w-0 break-words text-sm leading-6 text-[var(--color-muted)]">
                <ul className="space-y-2">
                  {publicPromotionsQuery.isLoading ? (
                    <li>Checking available promotions...</li>
                  ) : (
                    productOfferItems(product, availablePromotions).map((offer) => (
                      <li key={offer}>{offer}</li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {productOutOfStock && (
              <p className="mt-5 text-sm font-semibold text-red-600">
                This item is currently out of stock. Add it to wishlist and check back later.
              </p>
            )}

            <div className="mt-5 flex min-w-0 items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xl font-extrabold leading-tight text-[var(--color-secondary)] sm:text-2xl">
                  Rs. {price.toLocaleString("en-IN")}
                </div>
                {hasDiscount && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-tight text-[var(--color-muted)] sm:text-xs">
                    <span className="line-through">Rs. {product.price.toLocaleString("en-IN")}</span>
                    <span className="font-bold text-[var(--color-danger)]">Save Rs. {product.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {cartItem ? (
                  <div className="inline-flex h-11 w-[124px] items-center justify-between overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] sm:w-[150px]">
                    <button
                      type="button"
                      className="grid h-full w-10 place-items-center transition hover:bg-white disabled:opacity-40 sm:w-12"
                      onClick={() => updateCartQuantity.mutate(cartQuantity - 1)}
                      disabled={updateCartQuantity.isPending || displayedQuantity < 1}
                      aria-label={cartQuantity <= 1 ? "Remove from cart" : "Decrease quantity"}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-10 px-1 text-center text-sm font-bold sm:min-w-14">{displayedQuantity}</span>
                    <button
                      type="button"
                      className="grid h-full w-10 place-items-center transition hover:bg-white disabled:opacity-40 sm:w-12"
                      onClick={() => updateCartQuantity.mutate(cartQuantity + 1)}
                      disabled={updateCartQuantity.isPending || productOutOfStock || displayedQuantity >= maxQuantity}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    className="h-11 w-11 gap-2 px-0 sm:w-auto sm:px-4"
                    disabled={productOutOfStock || addToCart.isPending}
                    onClick={() => addToCart.mutate()}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span className="hidden sm:inline">{productOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
                  </Button>
                )}
                <Button
                  className="h-11 w-11 gap-2 px-0 sm:w-auto sm:px-4"
                  disabled={productOutOfStock || checkoutProduct.isPending || addToCart.isPending}
                  onClick={() => checkoutProduct.mutate("buy-now")}
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Buy Now</span>
                </Button>
                <Button
                  variant="secondary"
                  className="h-11 w-11 gap-2 px-0 sm:w-auto sm:px-4"
                  disabled={toggleWishlist.isPending}
                  onClick={() => toggleWishlist.mutate()}
                >
                  <Heart className={cn("h-4 w-4", isInWishlist && "fill-[var(--color-secondary)]")} />
                  <span className="hidden sm:inline">{isInWishlist ? "Saved" : "Wishlist"}</span>
                </Button>
              </div>
            </div>

            <ProductHighlights product={product} />

            <div className="mt-6 hidden grid-cols-2 gap-3 sm:grid">
              {[
                [Truck, "Free delivery checks at checkout"],
                [ShieldCheck, "Secure payment"],
                [RefreshCw, "Replacement support"],
                [Package, "Packed with care"],
              ].map(([Icon, label]) => (
                <div key={label as string} className="flex items-center gap-2 text-xs font-semibold text-[var(--color-secondary)]">
                  <Icon className="h-4 w-4" />
                  <span>{label as string}</span>
                </div>
              ))}
            </div>

            <ProductInsights product={product} hasReviews={productReviews.length > 0} />
          </aside>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-12 min-w-0">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-secondary)]">More recommendations</p>
                <h2 className="mt-2 text-2xl font-bold text-[var(--color-text)]">You may also like</h2>
              </div>
              <Link to="/products" className="text-sm font-bold text-[var(--color-secondary)] hover:underline">View all</Link>
            </div>
            <div className="-mx-4 flex max-w-[calc(100%+2rem)] snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-3 scrollbar-hide sm:-mx-6 sm:max-w-[calc(100%+3rem)] sm:scroll-px-6 sm:px-6 lg:mx-0 lg:max-w-full lg:scroll-px-0 lg:px-0">
              {relatedProducts.map((item) => (
                <div key={item.id} className={fiveCardProductRailItem}>
                  <ProductCard product={item} compact />
                </div>
              ))}
            </div>
          </section>
        )}

        <CategoryShowcaseBanner
          eyebrow={`${formatLabel(product.subsubcategory || product.subcategory || activeCategoryKey)} spotlight`}
          title={`More from ${formatLabel(product.subsubcategory || product.subcategory || activeCategoryKey)}`}
          description={`Stay in the same fragrance story with nearby picks from ${formatLabel(product.subcategory || product.category)}. These are a good next step if you want similar mood, format, or ritual fit before moving on.`}
          ctaLabel="See matching products"
          ctaTo={`/products?${new URLSearchParams(
            product.subsubcategory
              ? { category: activeCategoryKey || product.category, subsubcategory: product.subsubcategory }
              : product.subcategory
                ? { subcategory: product.subcategory }
                : { category: activeCategoryKey || product.category }
          ).toString()}`}
          products={recentContextProducts}
        />

        <RecentProductRail
          eyebrow="Recently viewed"
          title="Continue where you left off"
          products={recentlyViewedProducts}
        />

        {productReviews.length > 0 && (
          <ProductReviewSection
            product={product}
            reviews={productReviews}
            reviewsLoading={ratingsQuery.isLoading}
            onWriteReview={() => setIsReviewModalOpen(true)}
          />
        )}
      </section>
      <WriteReviewModal
        activeImage={activeImage}
        isOpen={isReviewModalOpen}
        product={product}
        onClose={() => setIsReviewModalOpen(false)}
      />
    </main>
  );
};

function PromotionRail({ items }: { items: string[] }) {
  const feedItems = [...items, ...items, ...items, ...items];

  return (
    <div className="relative left-1/2 mb-5 w-screen -translate-x-1/2 overflow-hidden bg-[var(--color-primary)]">
      <div className="flex w-max animate-[marquee_24s_linear_infinite] gap-8 whitespace-nowrap px-4 py-2.5 text-xs font-extrabold text-[var(--color-text)] hover:[animation-play-state:paused] sm:text-sm">
        {feedItems.map((item, index) => (
          <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
            {index % 2 === 0 ? <IndianRupee className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProductHighlights({ product }: { product: Product }) {
  const points = [
    ...splitDescriptionPoints(product),
    "Long-lasting freshness",
    "Refill, reuse, and enjoy daily",
  ].slice(0, 6);
  const icons = [WandSparkles, Leaf, ShieldCheck, Repeat2, Sparkles, Package];

  return (
    <div className="mt-5 border-t border-[var(--color-border)] pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {points.map((point, index) => {
          const Icon = icons[index % icons.length];

          return (
            <div key={`${point}-${index}`} className="flex min-w-0 items-center gap-3 text-sm font-medium text-[var(--color-text)]">
              <span className="grid h-8 w-8 shrink-0 place-items-center text-[var(--color-secondary)]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 break-words line-clamp-2">{point}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductInsights({ product, hasReviews }: { product: Product; hasReviews: boolean }) {
  return (
    <section className="mt-9 space-y-8 border-t border-[var(--color-border)] pt-6">
      <nav className="flex flex-wrap gap-8 border-b border-[var(--color-border)] pb-3 text-base font-extrabold text-[var(--color-muted)]">
        <a href="#overview" className="text-[var(--color-text)] hover:text-[var(--color-secondary)]">
          Overview
        </a>
        <a href="#how-to-use" className="hover:text-[var(--color-secondary)]">
          How to Use
        </a>
        {hasReviews && (
          <a href="#reviews" className="hover:text-[var(--color-secondary)]">
            Review
          </a>
        )}
      </nav>

      <div id="overview" className="scroll-mt-28 sm:scroll-mt-32 lg:scroll-mt-36">
        <p className="mt-4 break-words text-sm leading-7 text-[var(--color-muted)] sm:text-base sm:leading-8">
          {product.fulldescription || product.shortdescription || "A premium Nivaana product made to add calm, freshness, and a refined ritual feel to everyday spaces."}
        </p>
      </div>

      <div id="how-to-use" className="scroll-mt-28 sm:scroll-mt-32 lg:scroll-mt-36">
        <h2 className="text-base font-extrabold text-[var(--color-text)]">How to Use</h2>
        <div className="mt-4 grid min-w-0 gap-4 text-sm leading-7 text-[var(--color-muted)] sm:text-base sm:leading-8 lg:grid-cols-3">
          {[
            "Place or use the product in a clean, dry space.",
            "Keep away from direct heat, children, and pets unless product instructions say otherwise.",
            "Use regularly in your preferred room, car, or ritual space for a consistent fragrance experience.",
          ].map((step, index) => (
            <div key={step} className="flex min-w-0 items-start gap-3 break-words">
              <span className="w-5 shrink-0 text-sm font-extrabold text-[var(--color-secondary)] sm:w-6">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function ProductReviewSection({
  product,
  reviews,
  reviewsLoading,
  onWriteReview,
}: {
  product: Product;
  reviews: Rating[];
  reviewsLoading: boolean;
  onWriteReview: () => void;
}) {
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.starrating || 0), 0) / reviews.length
      : product.averagerating ?? 0;

  return (
    <section id="reviews" className="mt-12 min-w-0 scroll-mt-28 sm:scroll-mt-32 lg:scroll-mt-36">
      <div className="flex flex-col gap-5 border-b border-[var(--color-border)] pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-secondary)]">Customer reviews</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--color-text)]">Ratings & reviews</h2>
        </div>
        <Button className="h-11 gap-2" onClick={onWriteReview}>
          <Star className="h-4 w-4" />
          Write a Review
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="text-center">
          <div className="text-5xl font-extrabold text-[var(--color-text)]">{Number(averageRating || 0).toFixed(1)}</div>
          <div className="mt-3 flex justify-center gap-1 text-[var(--color-primary)]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className={cn("h-5 w-5", index < Math.round(averageRating || 0) && "fill-current")} />
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-[var(--color-muted)]">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
        </div>

        {reviewsLoading ? (
          <p className="text-sm font-semibold text-[var(--color-muted)]">Loading customer reviews...</p>
        ) : reviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--color-text)]">{reviewAuthor(review)}</p>
                    {formatReviewDate(review.createddate) && (
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">{formatReviewDate(review.createddate)}</p>
                    )}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface)] px-2 py-1 text-xs font-bold text-[var(--color-secondary)]">
                    <Star className="h-3.5 w-3.5 fill-[var(--color-primary)] text-[var(--color-primary)]" />
                    {Number(review.starrating || 0).toFixed(1)}
                  </span>
                </div>
                {review.comments?.trim() ? (
                  <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{review.comments}</p>
                ) : (
                  <p className="mt-3 text-sm italic leading-6 text-[var(--color-muted)]">No written comment provided.</p>
                )}
                {review.url && review.url.filter(Boolean).length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {review.url.filter(Boolean).map((image, index) => (
                      <img
                        key={`${image}-${index}`}
                        src={image}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--color-muted)]">
            No customer reviews have been added for this product yet.
          </div>
        )}
      </div>
    </section>
  );
}

function WriteReviewModal({
  activeImage,
  isOpen,
  product,
  onClose,
}: {
  activeImage: string;
  isOpen: boolean;
  product: Product;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setRating(0);
      setComment("");
      setEmail("");
      setDisplayName("");
      setAnonymous(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const submitReview = () => {
    toast.success("Review submitted. Thank you for sharing your experience.");
    onClose();
  };
  const productDisplayName = getProductDisplayName(product);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 px-4 py-6">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white p-6 shadow-[var(--shadow-hover)] sm:p-10">
        <button
          type="button"
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
          onClick={onClose}
          aria-label="Close review modal"
        >
          <X className="h-6 w-6" />
        </button>

        {step === 1 && (
          <div className="text-center">
            <h2 className="pr-8 text-2xl font-bold text-[var(--color-text)] sm:text-3xl">How would you rate this product?</h2>
            <p className="mt-3 text-sm text-[var(--color-muted)] sm:text-base">We would love it if you shared a bit about your experience.</p>
            <img src={activeImage} alt={productDisplayName} className="mx-auto mt-8 h-36 w-36 rounded-2xl object-cover sm:h-44 sm:w-44" />
            <p className="mx-auto mt-6 max-w-xl text-lg font-bold text-[var(--color-text)]">{productDisplayName}</p>
            <div className="mt-8 flex justify-center gap-3">
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;
                return (
                  <button key={value} type="button" onClick={() => setRating(value)} aria-label={`Rate ${value} stars`}>
                    <Star className={cn("h-10 w-10 text-[var(--color-text)] sm:h-14 sm:w-14", value <= rating && "fill-[var(--color-text)]")} />
                  </button>
                );
              })}
            </div>
            <div className="mx-auto mt-2 flex max-w-[320px] justify-between text-xs font-bold text-[var(--color-text)]">
              <span>Poor</span>
              <span>Great</span>
            </div>
            <div className="mt-8 flex justify-end">
              <Button disabled={rating <= 0} onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-center text-xl font-bold text-[var(--color-text)] sm:text-2xl">{productDisplayName}</h2>
            <div className="mt-5 flex justify-center gap-2 text-[var(--color-text)]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className={cn("h-8 w-8 sm:h-11 sm:w-11", index < rating && "fill-current")} />
              ))}
            </div>
            <label className="mt-8 block text-sm font-semibold text-[var(--color-text)]" htmlFor="review-content">
              Review content (Required)
            </label>
            <textarea
              id="review-content"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Start writing here..."
              className="mt-3 min-h-48 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 text-sm outline-none focus:border-[var(--color-secondary)]"
            />
            <p className="mt-4 text-center text-xs leading-5 text-[var(--color-muted)]">
              We will only contact you about your review if necessary.
            </p>
            <div className="mt-8 flex items-center justify-between gap-4">
              <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <Button disabled={!comment.trim()} onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-center text-2xl font-bold text-[var(--color-text)] sm:text-3xl">About you</h2>
            <p className="mt-3 text-center text-sm text-[var(--color-muted)] sm:text-base">Please tell us more about you.</p>
            <div className="mt-10 grid gap-5">
              <label className="block text-sm font-semibold text-[var(--color-text)]">
                Email address (Required)
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Your email address"
                  className="mt-3 h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 text-sm outline-none focus:border-[var(--color-secondary)]"
                />
                <span className="mt-2 block text-xs font-normal text-[var(--color-muted)]">We respect your privacy.</span>
              </label>
              <label className="block text-sm font-semibold text-[var(--color-text)]">
                Display name (Required)
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Display name"
                  className="mt-3 h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 text-sm outline-none focus:border-[var(--color-secondary)]"
                />
              </label>
              <label className="inline-flex items-center gap-3 text-sm text-[var(--color-text)]">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(event) => setAnonymous(event.target.checked)}
                  className="h-5 w-5 rounded border-[var(--color-border)]"
                />
                Post review as anonymous
              </label>
            </div>
            <div className="mt-8 flex items-center justify-between gap-4">
              <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <Button disabled={!email.trim() || (!anonymous && !displayName.trim())} onClick={submitReview}>
                Submit Review
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetails;

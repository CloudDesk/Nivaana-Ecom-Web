import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import type { Product } from "../types";
import { platformProductService } from "../services/productPlatformService";
import { useCart } from "../contexts/cartContextCore";
import { useWishlist } from "../contexts/wishlistContextCore";

const rupeeSymbol = "\u20B9";

const formatLabel = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getDiscountedPrice = (product: Product) =>
  Math.max(product.price - (product.discount || 0), 0);

const getAvailableQuantity = (product: Product) =>
  product.availablequantity || product.ecompublishedquantity || 0;

const getGalleryImages = (product: Product) => {
  const images = [
    ...(product.large || []),
    ...(product.medium || []),
    ...(product.small || []),
  ].filter(Boolean);

  return Array.from(new Set(images));
};

const renderStars = (rating: number | null) => {
  const effectiveRating = rating || 0;

  return (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, index) => (
        <svg
          key={index}
          className={`h-5 w-5 ${
            index < Math.floor(effectiveRating)
              ? "fill-current text-primary-gold"
              : "text-secondary-light-gray"
          }`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            stroke="currentColor"
            strokeWidth="1"
            fill={index < Math.floor(effectiveRating) ? "currentColor" : "none"}
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
    </div>
  );
};

const EmptyImagePlaceholder: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center bg-secondary-light-gray/40 text-secondary-medium-gray">
    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-secondary-light-gray bg-white/70">
      <svg
        className="h-11 w-11"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V6.75Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4.5 16.5 3.1-3.1a1.5 1.5 0 0 1 2.12 0l1.03 1.03 2.85-2.85a1.5 1.5 0 0 1 2.12 0l3.78 3.78M8.25 8.25h.01"
        />
      </svg>
    </div>
  </div>
);

const ProductDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, updateQuantity, cartItems, isInCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const productId = Number(id);
  const galleryImages = useMemo(
    () => (product ? getGalleryImages(product) : []),
    [product],
  );
  const availableQuantity = product ? getAvailableQuantity(product) : 0;
  const productInCart = product ? isInCart(product.id) : false;
  const productInWishlist = product ? isInWishlist(product.id) : false;
  const cartItem = product
    ? cartItems.find((item) => item.id === product.id)
    : undefined;
  const currentQuantity = productInCart ? cartItem?.quantity || 1 : quantity;

  useEffect(() => {
    let cancelled = false;

    const fetchProduct = async () => {
      if (!productId) {
        setError("Invalid product id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setRelatedProducts([]);
        const response =
          await platformProductService.getProductForPlatform(productId);

        if (!cancelled) {
          if (response.success) {
            setProduct(response.data);
            setActiveImage(0);
            setDescriptionExpanded(false);
          } else {
            setError("Product could not be loaded.");
          }
        }
      } catch (productError) {
        console.error("Error fetching product:", productError);
        if (!cancelled) {
          setError("Product could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    let cancelled = false;

    const fetchRelatedProducts = async () => {
      if (!product) {
        return;
      }

      try {
        const response = await platformProductService.getProducts(undefined, 12, {
          category: product.category || undefined,
          subcategory: product.subcategory || undefined,
        });

        if (!cancelled && response.success) {
          setRelatedProducts(
            response.data
              .filter((relatedProduct) => relatedProduct.id !== product.id)
              .slice(0, 8),
          );
        }
      } catch (relatedError) {
        console.error("Error fetching related products:", relatedError);
        if (!cancelled) {
          setRelatedProducts([]);
        }
      }
    };

    void fetchRelatedProducts();

    return () => {
      cancelled = true;
    };
  }, [product]);

  const handleQuantityChange = async (nextQuantity: number) => {
    if (!product) {
      return;
    }

    setMessage("");

    if (!productInCart) {
      const boundedQuantity = Math.min(
        Math.max(nextQuantity, 1),
        availableQuantity || nextQuantity,
      );
      setQuantity(boundedQuantity);
      return;
    }

    const boundedQuantity = Math.min(
      Math.max(nextQuantity, 0),
      availableQuantity || nextQuantity,
    );

    setActionLoading(true);

    try {
      await updateQuantity(product.id, boundedQuantity);
      if (boundedQuantity <= 0) {
        setQuantity(1);
        setMessage("Removed from cart");
      } else {
        setMessage("Cart updated");
      }
    } catch (cartError) {
      setError(
        cartError instanceof Error ? cartError.message : "Failed to update cart.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product || productInCart) {
      return;
    }

    setMessage("");
    setError(null);
    setActionLoading(true);

    try {
      await addToCart(product, quantity);
      setMessage("Added to cart");
    } catch (cartError) {
      setError(
        cartError instanceof Error
          ? cartError.message
          : "Failed to add item to cart.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) {
      return;
    }

    setMessage("");
    setError(null);
    setBuyNowLoading(true);

    try {
      if (!productInCart) {
        await addToCart(product, quantity);
      }

      navigate("/cart");
    } catch (cartError) {
      setError(
        cartError instanceof Error
          ? cartError.message
          : "Failed to start checkout.",
      );
    } finally {
      setBuyNowLoading(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!product || wishlistLoading) {
      return;
    }

    setMessage("");
    setError(null);
    setWishlistLoading(true);

    try {
      if (productInWishlist) {
        await removeFromWishlist(product.id);
        setMessage("Removed from wishlist");
      } else {
        await addToWishlist(product);
        setMessage("Added to wishlist");
      }
    } catch (wishlistError) {
      setError(
        wishlistError instanceof Error
          ? wishlistError.message
          : "Failed to update wishlist.",
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  const showPreviousImage = () => {
    setActiveImage((currentImage) =>
      currentImage === 0 ? galleryImages.length - 1 : currentImage - 1,
    );
  };

  const showNextImage = () => {
    setActiveImage((currentImage) =>
      currentImage === galleryImages.length - 1 ? 0 : currentImage + 1,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-extra-light-gray px-4 py-16">
        <div className="mx-auto max-w-6xl text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-gold" />
          <p className="text-secondary-medium-gray">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-secondary-extra-light-gray px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 text-center shadow-md">
          <h1 className="mb-3 text-2xl font-bold text-secondary-dark-gray">
            Product Not Found
          </h1>
          <p className="mb-6 text-secondary-medium-gray">{error}</p>
          <button type="button" onClick={() => navigate("/products")} className="btn-primary">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const activeGalleryImage = galleryImages[activeImage];
  const formattedCategory = formatLabel(product.category);
  const formattedSubcategory = formatLabel(product.subcategory);
  const formattedFragrance = formatLabel(product.fragnancetype);
  const productDescription = product.fulldescription || product.shortdescription || "";
  const canToggleDescription = productDescription.length > 180;
  const isUnavailable = product.productstatus === "out_of_stock";
  const detailItems = [
    { label: "Category", value: formattedCategory },
    { label: "Subcategory", value: formattedSubcategory },
    { label: "Fragrance Type", value: formattedFragrance },
    { label: "Brand", value: product.brand || "" },
    { label: "Pack", value: product.pack || "" },
  ].filter((item) => item.value);

  return (
    <div className="min-h-screen bg-secondary-extra-light-gray">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-5 lg:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-secondary-medium-gray">
          <Link to="/products" className="font-semibold text-primary-blue hover:text-primary-gold">
            Products
          </Link>
          <span>/</span>
          {formattedCategory && (
            <>
              <Link
                to={`/products?category=${encodeURIComponent(product.category)}`}
                className="font-semibold text-primary-blue hover:text-primary-gold"
              >
                {formattedCategory}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-secondary-dark-gray">{product.name}</span>
        </div>

        <div className="grid gap-8 rounded-lg bg-white p-4 shadow-md lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] lg:p-6">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary-extra-light-gray">
              {activeGalleryImage ? (
                <img
                  src={activeGalleryImage}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <EmptyImagePlaceholder />
              )}

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-primary-blue/80 text-primary-gold shadow-lg transition hover:bg-primary-blue"
                    aria-label="Previous product image"
                    title="Previous image"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-primary-blue/80 text-primary-gold shadow-lg transition hover:bg-primary-blue"
                    aria-label="Next product image"
                    title="Next image"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {galleryImages.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-secondary-extra-light-gray transition ${
                      activeImage === index
                        ? "border-primary-gold"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`View product image ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                {formattedCategory && (
                  <span className="rounded-full bg-primary-gold/20 px-3 py-1 text-xs font-semibold text-primary-blue">
                    {formattedCategory}
                  </span>
                )}
                {formattedSubcategory && (
                  <span className="rounded-full bg-secondary-extra-light-gray px-3 py-1 text-xs font-semibold text-secondary-medium-gray">
                    {formattedSubcategory}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold leading-tight text-secondary-dark-gray md:text-3xl">
                {product.name}
              </h1>
              <p className="mt-2 text-sm text-secondary-medium-gray">
                Product Code: {product.puc}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {renderStars(product.averagerating)}
              <span className="text-sm text-secondary-medium-gray">
                {product.averagerating
                  ? `${product.averagerating.toFixed(1)} rating`
                  : "No ratings"}
              </span>
            </div>

            <div className="border-y border-secondary-light-gray/70 py-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-4xl font-bold text-primary-gold">
                  {rupeeSymbol}{getDiscountedPrice(product).toFixed(0)}
                </span>
                {product.discount > 0 && (
                  <>
                    <span className="text-xl text-secondary-medium-gray line-through">
                      {rupeeSymbol}{product.price}
                    </span>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600">
                      {rupeeSymbol}{product.discount} OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            {productDescription && (
              <div className="space-y-2 text-secondary-medium-gray">
                <p
                  className={`leading-7 ${
                    descriptionExpanded ? "" : "line-clamp-3"
                  }`}
                >
                  {productDescription}
                </p>
                {canToggleDescription && (
                  <button
                    type="button"
                    onClick={() =>
                      setDescriptionExpanded((currentState) => !currentState)
                    }
                    className="text-sm font-semibold text-primary-blue hover:text-primary-gold"
                    aria-expanded={descriptionExpanded}
                  >
                    {descriptionExpanded ? "Less" : "More"}
                  </button>
                )}
              </div>
            )}

            {detailItems.length > 0 && (
              <div>
                <h2 className="mb-3 text-base font-semibold text-secondary-dark-gray">
                  Product Details
                </h2>
                <div className="grid border-y border-secondary-light-gray/70 sm:grid-cols-2">
                  {detailItems.map((item) => (
                    <div
                      key={item.label}
                      className="border-b border-secondary-light-gray/70 py-3 sm:border-b-0 sm:border-r sm:pr-5 sm:even:border-r-0 sm:even:pl-5"
                    >
                      <p className="text-xs font-semibold uppercase text-secondary-medium-gray">
                        {item.label}
                      </p>
                      <p className="mt-1 font-semibold text-secondary-dark-gray">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  product.productstatus === "in_stock"
                    ? "bg-green-100 text-green-800"
                    : product.productstatus === "low_stock"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {product.productstatus.replace("_", " ").toUpperCase()}
              </span>
              <span className="text-sm text-secondary-medium-gray">
                {availableQuantity} units available
              </span>
            </div>

            <div className="sticky bottom-0 z-30 -mx-4 mt-auto border-t border-secondary-light-gray/70 bg-white/95 px-4 py-3 shadow-[0_-10px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {productInCart ? (
                  <div className="inline-flex w-40 shrink-0 items-center justify-between overflow-hidden rounded-lg border border-primary-gold bg-white">
                    <button
                      type="button"
                      onClick={() =>
                        void handleQuantityChange(currentQuantity - 1)
                      }
                      disabled={actionLoading || currentQuantity <= 0}
                      className="h-12 w-10 text-lg font-semibold text-primary-blue hover:bg-primary-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Decrease ${product.name} quantity`}
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-semibold text-primary-blue">
                      {currentQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void handleQuantityChange(currentQuantity + 1)
                      }
                      disabled={
                        actionLoading ||
                        (availableQuantity > 0 &&
                          currentQuantity >= availableQuantity)
                      }
                      className="h-12 w-10 text-lg font-semibold text-primary-blue hover:bg-primary-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Increase ${product.name} quantity`}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleAddToCart()}
                    disabled={isUnavailable || actionLoading || buyNowLoading}
                    className={`btn-primary min-w-0 flex-1 whitespace-nowrap px-4 ${
                      isUnavailable || actionLoading || buyNowLoading
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    {isUnavailable
                      ? "Out of Stock"
                      : actionLoading
                        ? "Adding..."
                        : "Add to Cart"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void handleBuyNow()}
                  disabled={isUnavailable || actionLoading || buyNowLoading}
                  className={`min-w-0 flex-1 whitespace-nowrap rounded-lg bg-primary-blue px-4 py-3 font-semibold text-primary-gold shadow-md transition-all duration-200 hover:bg-primary-blue/95 hover:shadow-lg ${
                    isUnavailable || actionLoading || buyNowLoading
                      ? "cursor-not-allowed opacity-50"
                      : ""
                  }`}
                >
                  {buyNowLoading ? "Opening Cart..." : "Buy Now"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleWishlistToggle()}
                  disabled={wishlistLoading}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-secondary-light-gray bg-white transition ${
                    productInWishlist
                      ? "text-red-500"
                      : "text-secondary-medium-gray hover:text-red-500"
                  } disabled:opacity-60`}
                  aria-label={
                    productInWishlist
                      ? "Remove from wishlist"
                      : "Add to wishlist"
                  }
                  title={
                    productInWishlist
                      ? "Remove from wishlist"
                      : "Add to wishlist"
                  }
                >
                  <svg
                    className="h-6 w-6"
                    fill={productInWishlist ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733C11.285 4.876 9.623 3.75 7.688 3.75 5.098 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {(message || error) && (
              <p
                className={`text-sm ${
                  error ? "text-red-600" : "text-green-700"
                }`}
              >
                {error || message}
              </p>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-6 rounded-lg bg-white p-4 shadow-md lg:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-secondary-dark-gray">
                  Related Products
                </h2>
                <p className="mt-1 text-sm text-secondary-medium-gray">
                  Suggestions from{" "}
                  {formattedSubcategory || formattedCategory || "this category"}
                </p>
              </div>
              {(product.category || product.subcategory) && (
                <Link
                  to={`/products?category=${encodeURIComponent(product.category)}${
                    product.subcategory
                      ? `&subcategory=${encodeURIComponent(product.subcategory)}`
                      : ""
                  }`}
                  className="text-sm font-semibold text-primary-blue hover:text-primary-gold"
                >
                  View all
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  compact
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;

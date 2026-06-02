import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/cartContextCore';
import { useWishlist } from '../contexts/wishlistContextCore';
import type { Product } from '../types';

const getProductImage = (product: Product) => {
  if (product.medium?.length) {
    return product.medium[0];
  }
  if (product.small?.length) {
    return product.small[0];
  }
  if (product.large?.length) {
    return product.large[0];
  }
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop';
};

const getDescription = (product: Product) =>
  product.shortdescription || product.fulldescription || 'No description available';

const getDiscountedPrice = (product: Product) =>
  Math.max(product.price - (product.discount || 0), 0);

const getAvailableQuantity = (product: Product) =>
  product.availablequantity || product.ecompublishedquantity || 0;

const formatLabel = (value: string | null | undefined, fallback: string) =>
  (value || fallback)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getSectionTitle = (product: Product) => {
  const category = formatLabel(product.category, 'Other');
  const subcategory = formatLabel(product.subcategory, 'General');

  return `${category} - ${subcategory}`;
};

const Wishlist: React.FC = () => {
  const navigate = useNavigate();
  const {
    wishlistItems,
    isLoading,
    error,
    removeFromWishlist,
    clearWishlist,
  } = useWishlist();
  const { addToCart, isInCart } = useCart();
  const [removingItems, setRemovingItems] = useState<Set<number>>(new Set());
  const [movingItems, setMovingItems] = useState<Set<number>>(new Set());
  const [actionError, setActionError] = useState('');

  const groupedWishlist = useMemo(() => {
    const grouped = wishlistItems.reduce<Record<string, Product[]>>(
      (sections, item) => {
        const sectionTitle = getSectionTitle(item);
        return {
          ...sections,
          [sectionTitle]: [...(sections[sectionTitle] || []), item],
        };
      },
      {},
    );

    return Object.entries(grouped)
      .sort(([firstTitle], [secondTitle]) => firstTitle.localeCompare(secondTitle))
      .map(([title, items]) => ({
        title,
        items: items.sort((first, second) =>
          first.name.localeCompare(second.name),
        ),
      }));
  }, [wishlistItems]);

  const handleRemove = async (productId: number) => {
    if (removingItems.has(productId)) {
      return;
    }

    setActionError('');
    setRemovingItems((current) => new Set(current).add(productId));

    try {
      await removeFromWishlist(productId);
    } catch {
      setActionError('Failed to remove item from wishlist.');
    } finally {
      setRemovingItems((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleMoveToCart = async (product: Product) => {
    if (movingItems.has(product.id)) {
      return;
    }

    if (isInCart(product.id)) {
      navigate('/cart');
      return;
    }

    if (product.productstatus === 'out_of_stock' || getAvailableQuantity(product) <= 0) {
      setActionError('This product is currently out of stock.');
      return;
    }

    setActionError('');
    setMovingItems((current) => new Set(current).add(product.id));

    try {
      await addToCart(product, 1);
      await removeFromWishlist(product.id);
    } catch (moveError) {
      setActionError(
        moveError instanceof Error
          ? moveError.message
          : 'Failed to move item to cart.',
      );
    } finally {
      setMovingItems((current) => {
        const next = new Set(current);
        next.delete(product.id);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-extra-light-gray py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-gold mx-auto mb-4"></div>
          <p className="text-secondary-medium-gray">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-extra-light-gray">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark-gray mb-2">
                Wishlist
              </h1>
              <p className="text-lg text-secondary-medium-gray">
                {wishlistItems.length > 0
                  ? `${wishlistItems.length} saved item${
                      wishlistItems.length === 1 ? '' : 's'
                    }`
                  : 'Save your favourite Nivaana products here.'}
              </p>
            </div>

            {wishlistItems.length > 0 && (
              <button
                type="button"
                onClick={() => void clearWishlist()}
                className="w-fit rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors duration-200 hover:bg-red-50"
              >
                Clear Wishlist
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(error || actionError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{actionError || error}</p>
          </div>
        )}

        {wishlistItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-secondary-extra-light-gray text-secondary-light-gray">
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733C11.285 4.876 9.623 3.75 7.688 3.75 5.098 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-secondary-dark-gray mb-3">
              Your wishlist is empty
            </h2>
            <p className="text-secondary-medium-gray mb-6">
              Browse products and tap the heart to save favourites for later.
            </p>
            <Link to="/products" className="btn-primary inline-block">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedWishlist.map((section) => (
              <section key={section.title}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-secondary-dark-gray">
                    {section.title}
                  </h2>
                  <p className="text-sm text-secondary-medium-gray">
                    {section.items.length} item
                    {section.items.length === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {section.items.map((product) => {
                    const isRemoving = removingItems.has(product.id);
                    const isMoving = movingItems.has(product.id);
                    const isOutOfStock =
                      product.productstatus === 'out_of_stock' ||
                      getAvailableQuantity(product) <= 0;
                    const productInCart = isInCart(product.id);

                    return (
                      <article
                        key={product.id}
                        className="bg-white rounded-lg shadow-md p-4"
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          <img
                            src={getProductImage(product)}
                            alt={product.name}
                            className="h-40 w-full rounded-lg bg-secondary-extra-light-gray object-cover sm:h-32 sm:w-32"
                          />

                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-secondary-dark-gray line-clamp-2">
                                  {product.name}
                                </h3>
                                <p className="mt-2 text-sm text-secondary-medium-gray line-clamp-2">
                                  {getDescription(product)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => void handleRemove(product.id)}
                                disabled={isRemoving}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-secondary-medium-gray transition-colors duration-200 hover:bg-secondary-extra-light-gray hover:text-red-600 disabled:opacity-50"
                                aria-label={`Remove ${product.name} from wishlist`}
                                title="Remove"
                              >
                                <span className="text-2xl leading-none">
                                  &times;
                                </span>
                              </button>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-primary-gold">
                                    ₹{getDiscountedPrice(product).toFixed(0)}
                                  </span>
                                  {product.discount > 0 && (
                                    <span className="text-base text-secondary-medium-gray line-through">
                                      ₹{product.price}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-secondary-medium-gray">
                                  Product Code: {product.puc}
                                </p>
                              </div>

                              {isOutOfStock ? (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 opacity-80"
                                >
                                  Out of Stock
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleMoveToCart(product)}
                                  disabled={isMoving}
                                  className="btn-primary text-sm px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {isMoving
                                    ? 'Moving...'
                                    : productInCart
                                      ? 'In Cart'
                                      : 'Move to Cart'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../types';
import { useCart } from '../contexts/cartContextCore';
import { useWishlist } from '../contexts/wishlistContextCore';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  layout?: 'grid' | 'list';
}

const EmptyImagePlaceholder: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    className={`${className} flex items-center justify-center bg-secondary-extra-light-gray text-secondary-medium-gray`}
  >
    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-secondary-light-gray bg-white/70">
      <svg
        className="h-8 w-8"
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

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  compact = false,
  layout = 'grid',
}) => {
  const navigate = useNavigate();
  const { addToCart, cartItems, isInCart, updateQuantity } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWishlistUpdating, setIsWishlistUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const productInCart = isInCart(product.id);
  const productInWishlist = isInWishlist(product.id);
  const cartItem = cartItems.find((item) => item.id === product.id);
  const cartQuantity = cartItem?.quantity || 0;
  const rupeeSymbol = '\u20B9';

  const renderStars = (rating: number | null) => {
    if (!rating) {
      return (
        <div className="flex items-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-4 h-4 text-secondary-light-gray" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeWidth="1" fill="none" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      );
    }

    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="w-4 h-4 text-primary-gold fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-4 h-4 text-primary-gold fill-current" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path fill="url(#half-star)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-4 h-4 text-secondary-light-gray" viewBox="0 0 20 20">
          <path stroke="currentColor" strokeWidth="1" fill="none" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    return stars;
  };

  // Get the best available image
  const getProductImage = () => {
    if (product.medium && product.medium.length > 0) {
      return product.medium[0];
    }
    if (product.small && product.small.length > 0) {
      return product.small[0];
    }
    if (product.large && product.large.length > 0) {
      return product.large[0];
    }
    return null;
  };

  const formatLabel = (value: string) => {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formattedCategory = formatLabel(product.category);
  const formattedSubcategory = product.subcategory
    ? formatLabel(product.subcategory)
    : "";

  // Get stock status color
  const getStockStatusColor = () => {
    switch (product.productstatus) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate discounted price (discount is in rupees, not percentage)
  const getDiscountedPrice = () => {
    if (product.discount > 0) {
      return product.price - product.discount;
    }
    return product.price;
  };

  const handleAddToCart = async () => {
    setMessage('');
    setError('');

    if (productInCart) {
      return;
    }

    setIsAdding(true);

    try {
      await addToCart(product, 1);
      setMessage('Added to cart');
    } catch (cartError) {
      setError(
        cartError instanceof Error
          ? cartError.message
          : 'Failed to add item to cart.',
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuantityChange = async (nextQuantity: number) => {
    setMessage('');
    setError('');
    setIsUpdating(true);

    try {
      await updateQuantity(product.id, nextQuantity);
      if (nextQuantity <= 0) {
        setMessage('Removed from cart');
      }
    } catch (cartError) {
      setError(
        cartError instanceof Error
          ? cartError.message
          : 'Failed to update cart item.',
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (isWishlistUpdating) {
      return;
    }

    setMessage('');
    setError('');
    setIsWishlistUpdating(true);

    try {
      if (productInWishlist) {
        await removeFromWishlist(product.id);
        setMessage('Removed from wishlist');
      } else {
        await addToWishlist(product);
        setMessage('Added to wishlist');
      }
    } catch (wishlistError) {
      setError(
        wishlistError instanceof Error
          ? wishlistError.message
          : 'Failed to update wishlist.',
      );
    } finally {
      setIsWishlistUpdating(false);
    }
  };

  const cardClassName = compact
    ? 'group rounded-lg bg-white p-3 shadow-md transition-all duration-300 hover:shadow-xl sm:p-4 sm:hover:scale-[1.02]'
    : 'group rounded-xl bg-white p-3 shadow-md transition-all duration-300 hover:shadow-xl sm:p-6 sm:hover:scale-105';

  const imageClassName = compact
    ? 'h-28 w-full object-cover transition-transform duration-300 group-hover:scale-110 sm:h-40'
    : 'h-32 w-full object-cover transition-transform duration-300 group-hover:scale-110 sm:h-48';

  const titleClassName = compact
    ? 'line-clamp-2 text-sm font-semibold text-secondary-dark-gray transition-colors duration-200 group-hover:text-primary-blue sm:text-base'
    : 'line-clamp-2 text-sm font-semibold text-secondary-dark-gray transition-colors duration-200 group-hover:text-primary-blue sm:text-lg';

  const priceClassName = compact
    ? 'text-lg font-bold text-primary-gold sm:text-xl'
    : 'text-lg font-bold text-primary-gold sm:text-2xl';

  const productImage = getProductImage();

  const navigateToDetails = () => {
    navigate(`/products/${product.id}`);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateToDetails();
    }
  };

  if (layout === 'list') {
    return (
      <div
        className="cursor-pointer rounded-lg bg-white p-4 shadow-md transition-all duration-300 hover:shadow-lg"
        onClick={navigateToDetails}
        onKeyDown={handleCardKeyDown}
        role="link"
        tabIndex={0}
        aria-label={`View details for ${product.name}`}
      >
        <div className="flex flex-col md:flex-row gap-5">
          <div className="relative md:w-56 lg:w-60 shrink-0 overflow-hidden rounded-lg bg-secondary-extra-light-gray">
            {productImage ? (
              <img
                src={productImage}
                alt={product.name}
                className="h-56 w-full object-cover md:h-full"
              />
            ) : (
              <EmptyImagePlaceholder className="h-56 w-full md:h-full" />
            )}
            {product.isdealoftheday && (
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                Deal of the Day
              </div>
            )}
            {product.discount > 0 && (
              <div className="absolute bottom-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                {rupeeSymbol}{product.discount} OFF
              </div>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleWishlistToggle();
              }}
              disabled={isWishlistUpdating}
              className={`absolute bottom-2 left-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md transition-colors duration-200 ${
                productInWishlist
                  ? 'text-red-500'
                  : 'text-secondary-medium-gray hover:text-red-500'
              } disabled:opacity-60`}
              aria-label={
                productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'
              }
              title={productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <svg
                className="h-5 w-5"
                fill={productInWishlist ? 'currentColor' : 'none'}
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

          <div className="flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-secondary-dark-gray">
                {product.name}
              </h3>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {renderStars(product.averagerating)}
                </div>
                <span className="text-sm text-secondary-medium-gray">
                  {product.averagerating
                    ? `${product.averagerating.toFixed(1)} rating`
                    : 'No ratings'}
                </span>
              </div>

              <p className="text-sm font-semibold text-secondary-medium-gray">
                {formattedCategory}
              </p>
              {formattedSubcategory && (
                <p className="text-sm text-secondary-medium-gray">
                  {formattedSubcategory}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStockStatusColor()}`}>
                  {product.productstatus.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-sm text-secondary-medium-gray">
                  {product.availablequantity} available
                </span>
                <span className="text-xs text-secondary-medium-gray">
                  Product Code: {product.puc}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center space-x-2">
                {product.discount > 0 ? (
                  <>
                    <span className="text-2xl font-bold text-primary-gold">
                      {rupeeSymbol}{getDiscountedPrice().toFixed(0)}
                    </span>
                    <span className="text-lg text-secondary-medium-gray line-through">
                      {rupeeSymbol}{product.price}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-primary-gold">
                    {rupeeSymbol}{product.price}
                  </span>
                )}
              </div>

              {productInCart ? (
                <div className="inline-flex w-fit items-center border border-primary-gold rounded-lg overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleQuantityChange(cartQuantity - 1);
                    }}
                    disabled={isUpdating}
                    className="w-9 h-10 text-primary-blue hover:bg-primary-gold/20 disabled:opacity-50"
                    aria-label={`Decrease ${product.name} quantity`}
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-semibold text-primary-blue">
                    {cartQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleQuantityChange(cartQuantity + 1);
                    }}
                    disabled={isUpdating}
                    className="w-9 h-10 text-primary-blue hover:bg-primary-gold/20 disabled:opacity-50"
                    aria-label={`Increase ${product.name} quantity`}
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleAddToCart();
                  }}
                  className={`btn-primary text-sm px-4 py-2 ${
                    product.productstatus === 'out_of_stock' || isAdding
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  disabled={product.productstatus === 'out_of_stock' || isAdding}
                >
                  {product.productstatus === 'out_of_stock'
                    ? 'Out of Stock'
                    : isAdding
                      ? 'Adding...'
                      : 'Add to Cart'}
                </button>
              )}
            </div>

            {(message || error || productInCart) && (
              <div className="text-sm">
                {error ? (
                  <p className="text-red-600">{error}</p>
                ) : (
                  <p className="text-green-700">
                    {message || `In cart: ${cartQuantity}`}
                    {productInCart && (
                      <>
                        {' '}
                        <Link
                          to="/cart"
                          onClick={(event) => event.stopPropagation()}
                          className="font-semibold underline"
                        >
                          View cart
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${cardClassName} cursor-pointer`}
      onClick={navigateToDetails}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`View details for ${product.name}`}
    >
      {/* Product Image */}
      <div className={`relative overflow-hidden rounded-lg ${compact ? 'mb-3' : 'mb-4'}`}>
        {productImage ? (
          <img
            src={productImage}
            alt={product.name}
            className={imageClassName}
          />
        ) : (
          <EmptyImagePlaceholder className={imageClassName} />
        )}
        {product.isdealoftheday && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            Deal of the Day
          </div>
        )}
        {product.discount > 0 && (
          <div className="absolute bottom-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            {rupeeSymbol}{product.discount} OFF
          </div>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void handleWishlistToggle();
          }}
          disabled={isWishlistUpdating}
          className={`absolute bottom-2 left-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md transition-colors duration-200 ${
            productInWishlist
              ? 'text-red-500'
              : 'text-secondary-medium-gray hover:text-red-500'
          } disabled:opacity-60`}
          aria-label={
            productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'
          }
          title={productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            className="h-5 w-5"
            fill={productInWishlist ? 'currentColor' : 'none'}
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

      {/* Product Info */}
      <div className={compact ? 'space-y-2' : 'space-y-2 sm:space-y-3'}>
        {/* Rating */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <div className="flex items-center space-x-1">
            {renderStars(product.averagerating)}
          </div>
          <span className="text-xs text-secondary-medium-gray sm:text-sm">
            {product.averagerating ? `${product.averagerating.toFixed(1)} rating` : 'No ratings'}
          </span>
        </div>

        <p className="text-xs font-semibold text-secondary-medium-gray sm:text-sm">
          {formattedCategory}
        </p>
        {formattedSubcategory && (
          <p className="text-xs text-secondary-medium-gray sm:text-sm">
            {formattedSubcategory}
          </p>
        )}

        <h3 className={titleClassName}>
          {product.name}
        </h3>

        {/* Stock Status */}
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold sm:text-xs ${getStockStatusColor()}`}>
            {product.productstatus.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-xs text-secondary-medium-gray sm:text-sm">
            {product.availablequantity} available
          </span>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {product.discount > 0 ? (
              <>
                <span className={priceClassName}>
                  {rupeeSymbol}{getDiscountedPrice().toFixed(0)}
                </span>
                <span className="text-sm text-secondary-medium-gray line-through sm:text-lg">
                  {rupeeSymbol}{product.price}
                </span>
              </>
            ) : (
              <span className={priceClassName}>
                {rupeeSymbol}{product.price}
              </span>
            )}
          </div>
          {productInCart ? (
            <div className="inline-flex w-full items-center justify-center overflow-hidden rounded-lg border border-primary-gold bg-white sm:w-auto">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleQuantityChange(cartQuantity - 1);
                }}
                disabled={isUpdating}
                className="h-9 w-8 text-primary-blue hover:bg-primary-gold/20 disabled:opacity-50 sm:h-10 sm:w-9"
                aria-label={`Decrease ${product.name} quantity`}
              >
                -
              </button>
              <span className="w-8 text-center font-semibold text-primary-blue sm:w-10">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleQuantityChange(cartQuantity + 1);
                }}
                disabled={isUpdating}
                className="h-9 w-8 text-primary-blue hover:bg-primary-gold/20 disabled:opacity-50 sm:h-10 sm:w-9"
                aria-label={`Increase ${product.name} quantity`}
              >
                +
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleAddToCart();
              }}
              className={`btn-primary w-full px-2 py-2 text-xs sm:w-auto ${
                compact ? 'sm:px-3' : 'sm:px-4 sm:text-sm'
              } ${
                product.productstatus === 'out_of_stock' || isAdding
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
              }`}
              disabled={product.productstatus === 'out_of_stock' || isAdding}
            >
              {product.productstatus === 'out_of_stock'
                ? 'Out of Stock'
                : isAdding
                  ? 'Adding...'
                  : 'Add to Cart'}
            </button>
          )}
        </div>

        {(message || error || productInCart) && (
          <div className="text-sm">
            {error ? (
              <p className="text-red-600">{error}</p>
            ) : (
              <p className="text-green-700">
                {message || `In cart: ${cartQuantity}`}
                {productInCart && (
                  <>
                    {' '}
                    <Link
                      to="/cart"
                      onClick={(event) => event.stopPropagation()}
                      className="font-semibold underline"
                    >
                      View cart
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {/* Product Code */}
        <div className="hidden text-xs text-secondary-medium-gray sm:block">
          Product Code: {product.puc}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

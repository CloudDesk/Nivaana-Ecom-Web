import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { useCart } from '../contexts/cartContextCore';
import { useWishlist } from '../contexts/wishlistContextCore';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  layout?: 'grid' | 'list';
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  compact = false,
  layout = 'grid',
}) => {
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
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'; // fallback image
  };

  // Get product description
  const getDescription = () => {
    return product.shortdescription || product.fulldescription || 'No description available';
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
    ? 'bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-4 group hover:scale-[1.02] transform'
    : 'card group hover:scale-105 transform transition-all duration-300';

  const imageClassName = compact
    ? 'w-full h-40 object-cover group-hover:scale-110 transition-transform duration-300'
    : 'w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300';

  const titleClassName = compact
    ? 'text-base font-semibold text-secondary-dark-gray group-hover:text-primary-blue transition-colors duration-200 line-clamp-2'
    : 'text-lg font-semibold text-secondary-dark-gray group-hover:text-primary-blue transition-colors duration-200';

  const priceClassName = compact
    ? 'text-xl font-bold text-primary-gold'
    : 'text-2xl font-bold text-primary-gold';

  if (layout === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-4">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="relative md:w-56 lg:w-60 shrink-0 overflow-hidden rounded-lg bg-secondary-extra-light-gray">
            <img
              src={getProductImage()}
              alt={product.name}
              className="h-56 w-full object-cover md:h-full"
            />
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
              onClick={handleWishlistToggle}
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
              <p className="text-secondary-medium-gray text-sm line-clamp-2">
                {getDescription()}
              </p>

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
                    onClick={() => handleQuantityChange(cartQuantity - 1)}
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
                    onClick={() => handleQuantityChange(cartQuantity + 1)}
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
                  onClick={handleAddToCart}
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
                        <Link to="/cart" className="font-semibold underline">
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
    <div className={cardClassName}>
      {/* Product Image */}
      <div className={`relative overflow-hidden rounded-lg ${compact ? 'mb-3' : 'mb-4'}`}>
        <img
          src={getProductImage()}
          alt={product.name}
          className={imageClassName}
        />
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
          onClick={handleWishlistToggle}
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
      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        {/* Rating */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {renderStars(product.averagerating)}
          </div>
          <span className="text-sm text-secondary-medium-gray">
            {product.averagerating ? `${product.averagerating.toFixed(1)} rating` : 'No ratings'}
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

        <h3 className={titleClassName}>
          {product.name}
        </h3>
        
        <p className={`text-secondary-medium-gray text-sm ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
          {getDescription()}
        </p>

        {/* Stock Status */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStockStatusColor()}`}>
            {product.productstatus.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-sm text-secondary-medium-gray">
            {product.availablequantity} available
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {product.discount > 0 ? (
              <>
                <span className={priceClassName}>
                  {rupeeSymbol}{getDiscountedPrice().toFixed(0)}
                </span>
                <span className="text-lg text-secondary-medium-gray line-through">
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
            <div className="inline-flex items-center border border-primary-gold rounded-lg overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => handleQuantityChange(cartQuantity - 1)}
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
                onClick={() => handleQuantityChange(cartQuantity + 1)}
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
              onClick={handleAddToCart}
              className={`btn-primary ${compact ? 'text-xs px-3 py-2' : 'text-sm px-4 py-2'} ${
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
                    <Link to="/cart" className="font-semibold underline">
                      View cart
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {/* Product Code */}
        <div className="text-xs text-secondary-medium-gray">
          Product Code: {product.puc}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

import React from 'react';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
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

  return (
    <div className="card group hover:scale-105 transform transition-all duration-300">
      {/* Product Image */}
      <div className="relative overflow-hidden rounded-lg mb-4">
        <img
          src={getProductImage()}
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 bg-primary-gold text-primary-blue px-2 py-1 rounded-full text-xs font-semibold">
          {product.category}
        </div>
        {product.isdealoftheday && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            Deal of the Day
          </div>
        )}
        {product.discount > 0 && (
          <div className="absolute bottom-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            ₹{product.discount} OFF
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-secondary-dark-gray group-hover:text-primary-blue transition-colors duration-200">
          {product.name}
        </h3>
        
        <p className="text-secondary-medium-gray text-sm line-clamp-2">
          {getDescription()}
        </p>

        {/* Rating */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {renderStars(product.averagerating)}
          </div>
          <span className="text-sm text-secondary-medium-gray">
            {product.averagerating ? `${product.averagerating.toFixed(1)} rating` : 'No ratings'}
          </span>
        </div>

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
                <span className="text-2xl font-bold text-primary-gold">
                  ₹{getDiscountedPrice().toFixed(0)}
                </span>
                <span className="text-lg text-secondary-medium-gray line-through">
                  ₹{product.price}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-primary-gold">
                ₹{product.price}
              </span>
            )}
          </div>
          <button 
            className={`btn-primary text-sm px-4 py-2 ${
              product.productstatus === 'out_of_stock' 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
            disabled={product.productstatus === 'out_of_stock'}
          >
            {product.productstatus === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>

        {/* Product Code */}
        <div className="text-xs text-secondary-medium-gray">
          Product Code: {product.puc}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

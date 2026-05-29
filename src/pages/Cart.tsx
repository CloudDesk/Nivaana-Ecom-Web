import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/authContextCore';
import { useCart } from '../contexts/cartContextCore';
import type { CartItem } from '../types';

const getProductImage = (item: CartItem) => {
  if (item.medium?.length) {
    return item.medium[0];
  }

  if (item.small?.length) {
    return item.small[0];
  }

  if (item.large?.length) {
    return item.large[0];
  }

  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop';
};

const getDiscountedPrice = (item: CartItem) =>
  Math.max(item.price - (item.discount || 0), 0);

const getLineTotal = (item: CartItem) => getDiscountedPrice(item) * item.quantity;

const Cart: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const {
    cartItems,
    isLoading,
    error,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartCount,
    getCartTotal,
  } = useCart();
  const [actionError, setActionError] = useState('');
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(null);

  const handleQuantityChange = async (productId: number, quantity: number) => {
    setActionError('');
    setUpdatingProductId(productId);

    try {
      await updateQuantity(productId, quantity);
    } catch (quantityError) {
      setActionError(
        quantityError instanceof Error
          ? quantityError.message
          : 'Failed to update cart item.',
      );
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleRemove = async (productId: number) => {
    setActionError('');
    setUpdatingProductId(productId);

    try {
      await removeFromCart(productId);
    } catch {
      setActionError('Failed to remove item from cart.');
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleClearCart = async () => {
    setActionError('');

    try {
      await clearCart();
    } catch {
      setActionError('Failed to clear cart.');
    }
  };

  return (
    <div className="min-h-screen bg-secondary-extra-light-gray">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark-gray mb-2">
            Cart
          </h1>
          <p className="text-lg text-secondary-medium-gray">
            {isAuthenticated
              ? 'Your cart is saved with your account.'
              : 'Your guest cart is saved on this device.'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(error || actionError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{actionError || error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-gold mx-auto mb-4"></div>
            <p className="text-secondary-medium-gray">Loading cart...</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-semibold text-secondary-dark-gray mb-3">
              Your cart is empty
            </h2>
            <p className="text-secondary-medium-gray mb-6">
              Add products to your cart and they will stay here while you browse.
            </p>
            <Link to="/products" className="btn-primary inline-block">
              Shop Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-secondary-medium-gray">
                  {getCartCount()} item{getCartCount() === 1 ? '' : 's'}
                </p>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  Clear Cart
                </button>
              </div>

              {cartItems.map((item) => {
                const isUpdating = updatingProductId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-md p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <img
                        src={getProductImage(item)}
                        alt={item.name}
                        className="w-full sm:w-32 h-32 object-cover rounded-lg bg-secondary-extra-light-gray"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-semibold text-secondary-dark-gray">
                              {item.name}
                            </h2>
                            <p className="text-sm text-secondary-medium-gray">
                              Product Code: {item.puc}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-xl font-bold text-primary-gold">
                              Rs {getLineTotal(item).toFixed(0)}
                            </p>
                            <p className="text-sm text-secondary-medium-gray">
                              Rs {getDiscountedPrice(item).toFixed(0)} each
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <div className="inline-flex items-center border border-secondary-light-gray rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity - 1)
                              }
                              disabled={isUpdating}
                              className="w-10 h-10 text-primary-blue hover:bg-secondary-extra-light-gray disabled:opacity-50"
                              aria-label={`Decrease ${item.name} quantity`}
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-semibold text-secondary-dark-gray">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity + 1)
                              }
                              disabled={isUpdating}
                              className="w-10 h-10 text-primary-blue hover:bg-secondary-extra-light-gray disabled:opacity-50"
                              aria-label={`Increase ${item.name} quantity`}
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            disabled={isUpdating}
                            className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="bg-white rounded-lg shadow-md p-6 h-fit">
              <h2 className="text-xl font-semibold text-secondary-dark-gray mb-5">
                Order Summary
              </h2>

              <div className="space-y-3 pb-5 border-b border-secondary-light-gray">
                <div className="flex justify-between text-secondary-medium-gray">
                  <span>Subtotal</span>
                  <span>Rs {getCartTotal().toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-secondary-medium-gray">
                  <span>Shipping</span>
                  <span>Calculated later</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold text-secondary-dark-gray py-5">
                <span>Total</span>
                <span>Rs {getCartTotal().toFixed(0)}</span>
              </div>

              {isAuthenticated ? (
                <button type="button" className="w-full btn-primary">
                  Proceed to Checkout
                </button>
              ) : (
                <Link
                  to="/login?redirect=/cart"
                  className="w-full btn-primary inline-block text-center"
                >
                  Login to Checkout
                </Link>
              )}

              <Link
                to="/products"
                className="mt-4 w-full btn-secondary inline-block text-center"
              >
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;

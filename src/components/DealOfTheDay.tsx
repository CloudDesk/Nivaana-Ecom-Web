import React from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import ProductCard from './ProductCard';

interface DealOfTheDayProps {
  products: Product[];
  loading: boolean;
  error: string | null;
}

const DealOfTheDay: React.FC<DealOfTheDayProps> = ({
  products,
  loading,
  error,
}) => {
  const visibleProducts = products.slice(0, 4);

  if (!loading && !error && products.length === 0) {
    return null;
  }

  return (
    <section className="py-14 bg-white border-b border-secondary-light-gray/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-blue mb-2">
              Limited Time Offers
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-dark-gray">
              Deal of the Day
            </h2>
            <p className="text-secondary-medium-gray max-w-2xl mt-3">
              Today&apos;s best Nivaana picks, selected from products marked as
              deal of the day in the catalogue.
            </p>
          </div>

          <Link
            to="/products"
            className="btn-secondary inline-flex items-center justify-center w-fit"
          >
            View All Products
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="bg-secondary-extra-light-gray rounded-lg p-4 animate-pulse"
              >
                <div className="h-40 bg-secondary-light-gray rounded-lg mb-3"></div>
                <div className="h-5 bg-secondary-light-gray rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-secondary-light-gray rounded w-full mb-2"></div>
                <div className="h-4 bg-secondary-light-gray rounded w-2/3 mb-5"></div>
                <div className="h-10 bg-secondary-light-gray rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DealOfTheDay;

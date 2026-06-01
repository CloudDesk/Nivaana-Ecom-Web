import React, { useState, useEffect } from "react";
import Banner from "../components/Banner";
import ProductCard from "../components/ProductCard";
import DealOfTheDay from "../components/DealOfTheDay";
import { bannerItems } from "../data/sampleData";
import type { Product } from "../types";
import { platformProductService } from "../services/productPlatformService";

const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dealLoading, setDealLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dealError, setDealError] = useState<string | null>(null);

  // Fetch featured products on component mount
  useEffect(() => {
    const fetchHomeProducts = async () => {
      try {
        setLoading(true);
        setDealLoading(true);
        setError(null);
        setDealError(null);

        const [featuredResponse, dealResponse] = await Promise.all([
          platformProductService.getFeaturedProducts(),
          platformProductService.getDealOfTheDayProducts(),
        ]);

        if (featuredResponse.success) {
          // Show only first 4 products on home page
          setFeaturedProducts(featuredResponse.data.slice(0, 4));
        } else {
          setError("Failed to fetch featured products");
        }

        if (dealResponse.success) {
          const uniqueDeals = dealResponse.data.filter(
            (product, index, products) =>
              index === products.findIndex((item) => item.id === product.id),
          );
          setDealProducts(uniqueDeals);
        } else {
          setDealError("Failed to fetch deal of the day");
        }
      } catch (err) {
        setError("Failed to fetch featured products");
        setDealError("Failed to fetch deal of the day");
        console.error("Error fetching home content:", err);
      } finally {
        setLoading(false);
        setDealLoading(false);
      }
    };

    fetchHomeProducts();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <Banner items={bannerItems} />

      <DealOfTheDay
        products={dealProducts}
        loading={dealLoading}
        error={dealError}
      />

      {/* Featured Products Section */}
      <section className="py-16 bg-secondary-extra-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-dark-gray mb-4">
              Featured Products
            </h2>
            <p className="text-lg text-secondary-medium-gray max-w-2xl mx-auto">
              Discover our premium collection of incense sticks, essential oils,
              and spiritual home decor for your sacred space.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-gold mx-auto mb-4"></div>
              <p className="text-secondary-medium-gray">
                Loading featured products...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-red-500 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-secondary-dark-gray mb-2">
                Error Loading Products
              </h3>
              <p className="text-secondary-medium-gray mb-4">{error}</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-secondary-medium-gray">
                No featured products available
              </p>
            </div>
          )}

          <div className="text-center mt-12">
            <a href="/products" className="btn-primary text-lg px-8 py-4">
              View All Products
            </a>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-dark-gray mb-4">
              Why Choose Nivaana?
            </h2>
            <p className="text-lg text-secondary-medium-gray max-w-2xl mx-auto">
              We're committed to bringing you authentic spiritual products for
              your wellness journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Natural Ingredients */}
            <div className="text-center">
              <div className="bg-primary-gold/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-gold"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-dark-gray mb-2">
                Natural Ingredients
              </h3>
              <p className="text-secondary-medium-gray">
                All our incense and essential oils are made from pure, natural
                ingredients sourced ethically.
              </p>
            </div>

            {/* Spiritual Wellness */}
            <div className="text-center">
              <div className="bg-primary-gold/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-gold"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-dark-gray mb-2">
                Spiritual Wellness
              </h3>
              <p className="text-secondary-medium-gray">
                Enhance your meditation, prayer, and spiritual practices with
                our carefully curated products.
              </p>
            </div>

            {/* Handcrafted Quality */}
            <div className="text-center">
              <div className="bg-primary-gold/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-gold"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-dark-gray mb-2">
                Handcrafted Excellence
              </h3>
              <p className="text-secondary-medium-gray">
                Each product is carefully handcrafted using traditional methods
                passed down through generations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-primary-blue">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-gold mb-4">
            Breathe in Bliss
          </h2>
          <p className="text-lg text-primary-gold/80 mb-8">
            Subscribe to our newsletter and discover new incense fragrances,
            essential oil blends, and spiritual decor for your sacred space.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-primary-gold focus:outline-none"
            />
            <button className="btn-primary px-6 py-3">Subscribe</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

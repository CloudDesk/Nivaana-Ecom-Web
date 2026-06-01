import React from "react";
import { Link } from "react-router-dom";
import type { Category } from "../types";

interface CategoryStripProps {
  categories: Category[];
  loading: boolean;
  activeCategoryId?: string;
  activeCategoryName?: string;
  subcategories?: Category[];
  subcategoryLoading?: boolean;
  activeSubcategoryId?: string;
  dealsOnly?: boolean;
}

const pillClassName =
  "inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold leading-tight transition-all duration-200";

const getPillClassName = (active: boolean) =>
  active
    ? `${pillClassName} border-primary-blue bg-primary-blue text-primary-gold shadow-sm`
    : `${pillClassName} border-secondary-light-gray bg-white text-primary-blue hover:-translate-y-0.5 hover:border-primary-gold hover:bg-primary-gold/15`;

const CategoryStrip: React.FC<CategoryStripProps> = ({
  categories,
  loading,
  activeCategoryId,
  activeCategoryName,
  subcategories = [],
  subcategoryLoading = false,
  activeSubcategoryId,
  dealsOnly = false,
}) => {
  if (!loading && categories.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-4 border-b border-secondary-light-gray/60">
      <div className="w-full px-4 sm:px-5 lg:px-6">
        <h2 className="text-xl font-semibold text-primary-blue mb-3">
          Categories
        </h2>

        <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            to="/products"
            className={`${getPillClassName(!activeCategoryId && !dealsOnly)} hover:-translate-y-0.5 hover:shadow-md`}
            aria-label="View all products"
          >
            All Products
          </Link>

          <Link
            to="/products?deals=true"
            className={`${getPillClassName(dealsOnly)} hover:-translate-y-0.5 hover:shadow-md`}
            aria-label="View all deals"
          >
            All Deals
          </Link>

          {loading
            ? [1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-10 w-32 shrink-0 animate-pulse rounded-full bg-secondary-light-gray"
                />
              ))
            : categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${encodeURIComponent(category.id)}`}
                  className={getPillClassName(
                    activeCategoryId === category.id && !activeSubcategoryId,
                  )}
                  aria-label={`View ${category.name}`}
                >
                  {category.name}
                </Link>
              ))}
        </div>

        {activeCategoryId && !dealsOnly && (
          <div className="mt-4 border-t border-secondary-light-gray/70 pt-4">
            <h3 className="text-sm font-semibold uppercase text-secondary-medium-gray mb-3">
              Subcategories
            </h3>
            <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link
                to={`/products?category=${encodeURIComponent(activeCategoryId)}`}
                className={getPillClassName(!activeSubcategoryId)}
                aria-label={`View all ${activeCategoryName || "category"} products`}
              >
                All {activeCategoryName || "Products"}
              </Link>

              {subcategoryLoading
                ? [1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-10 w-32 shrink-0 animate-pulse rounded-full bg-secondary-light-gray"
                    />
                  ))
                : subcategories.map((subcategory) => (
                    <Link
                      key={subcategory.id}
                      to={`/products?category=${encodeURIComponent(activeCategoryId)}&subcategory=${encodeURIComponent(subcategory.id)}`}
                      className={getPillClassName(activeSubcategoryId === subcategory.id)}
                      aria-label={`View ${subcategory.name}`}
                    >
                      {subcategory.name}
                    </Link>
                  ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryStrip;

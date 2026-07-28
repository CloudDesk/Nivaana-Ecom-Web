import {
  Flame,
  Flower2,
  Gift,
  HeartHandshake,
  Home,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import fallbackProduct from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";
import type {
  Product,
  ProductCategoryCount,
  ProductCategoryTree,
  ProductSubcategoryCount,
} from "../types";

const normalizeFilterKey = (value?: string | null) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");

const valuesMatch = (left?: string | null, right?: string | null) =>
  Boolean(left && right) && normalizeFilterKey(left) === normalizeFilterKey(right);

const firstProductImage = (product?: Product) =>
  product?.large?.[0] || product?.medium?.[0] || product?.small?.[0] || fallbackProduct;

const categoryIcons: LucideIcon[] = [Flame, Home, Sparkles, Flower2, HeartHandshake, Gift];

const visibleCategories = (tree?: ProductCategoryTree | null) =>
  (tree?.categories ?? []).filter((category) => category.id && category.label);

const categoryForValue = (tree?: ProductCategoryTree | null, value?: string | null) =>
  visibleCategories(tree).find((category) => valuesMatch(category.id, value));

const subcategoryForValue = (
  tree?: ProductCategoryTree | null,
  categoryValue?: string | null,
  subcategoryValue?: string | null
) =>
  categoryForValue(tree, categoryValue)?.subcategories.find(
    (subcategory) => valuesMatch(subcategory.id, subcategoryValue)
  );

const productForTaxonomy = (
  products: Product[],
  category?: string | null,
  subcategory?: string | null,
  subsubcategory?: string | null
) =>
  products.find(
    (product) =>
      (!category || valuesMatch(product.category, category)) &&
      (!subcategory || valuesMatch(product.subcategory, subcategory)) &&
      (!subsubcategory || valuesMatch(product.subsubcategory, subsubcategory))
  );

export type CategoryNavParam = "subcategory" | "subsubcategory";

export interface CategoryNavTopItem {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface CategoryNavChildItem {
  key: string;
  label: string;
  value: string;
  param: CategoryNavParam;
  queryParams: Partial<Record<"category" | CategoryNavParam, string>>;
  imageSrc: string;
}

export const buildTopCategoryItems = (tree?: ProductCategoryTree | null): CategoryNavTopItem[] =>
  visibleCategories(tree).map(({ id, label }, index) => ({
    key: id,
    value: id,
    label,
    icon: categoryIcons[index % categoryIcons.length],
  }));

export const buildCategoryGroups = (tree?: ProductCategoryTree | null) =>
  visibleCategories(tree).map((category) => ({
    heading: category.label,
    to: `/products?category=${encodeURIComponent(category.id)}`,
    links: category.subcategories
      .filter((subcategory) => subcategory.id && subcategory.label)
      .map((subcategory) => ({
        label: subcategory.label,
        to: `/products?category=${encodeURIComponent(category.id)}&subcategory=${encodeURIComponent(subcategory.id)}`,
        children: subcategory.subsubcategories
          .filter((item) => item.id && item.label)
          .map((item) => ({
            label: item.label,
            to: `/products?category=${encodeURIComponent(category.id)}&subcategory=${encodeURIComponent(
              subcategory.id
            )}&subsubcategory=${encodeURIComponent(item.id)}`,
          })),
      })),
  }));

export const matchesProductCategory = (product: Product, categoryValue?: string | null) =>
  valuesMatch(product.category, categoryValue);

export const matchesProductChildCategory = (
  product: Product,
  childValue?: string | null,
  categoryValue?: string | null
) =>
  (!categoryValue || matchesProductCategory(product, categoryValue)) &&
  (valuesMatch(product.subcategory, childValue) || valuesMatch(product.subsubcategory, childValue));

export const resolveProductListingParams = (product?: Product | null) => ({
  category: product?.category || null,
  subcategory: product?.subcategory || null,
  subsubcategory: product?.subsubcategory || null,
});

export const resolveActiveCategory = ({
  tree,
  products,
  category,
  subcategory,
  subsubcategory,
}: {
  tree?: ProductCategoryTree | null;
  products: Product[];
  category?: string | null;
  subcategory?: string | null;
  subsubcategory?: string | null;
}) => {
  const directCategory = categoryForValue(tree, category);
  if (directCategory) return directCategory.id;

  const taxonomyCategory = visibleCategories(tree).find((candidate) =>
    candidate.subcategories.some(
      (child) =>
        valuesMatch(child.id, subcategory) ||
        child.subsubcategories.some((nested) => valuesMatch(nested.id, subsubcategory || subcategory))
    )
  );
  if (taxonomyCategory) return taxonomyCategory.id;

  const matchedProduct = products.find(
    (product) =>
      valuesMatch(product.subcategory, subcategory) ||
      valuesMatch(product.subsubcategory, subsubcategory || subcategory)
  );
  return matchedProduct?.category || category || null;
};

const childItem = (
  products: Product[],
  category: ProductCategoryCount,
  subcategory: ProductSubcategoryCount
): CategoryNavChildItem => ({
  key: `subcategory:${normalizeFilterKey(subcategory.id)}`,
  label: subcategory.label,
  value: subcategory.id,
  param: "subcategory",
  queryParams: { category: category.id, subcategory: subcategory.id },
  imageSrc: firstProductImage(productForTaxonomy(products, category.id, subcategory.id)),
});

export const buildChildCategoryItems = (
  products: Product[],
  tree?: ProductCategoryTree | null,
  activeCategory?: string | null
): CategoryNavChildItem[] => {
  const category = categoryForValue(tree, activeCategory);
  if (!category) return [];

  return category.subcategories
    .filter((subcategory) => subcategory.id && subcategory.label)
    .map((subcategory) => childItem(products, category, subcategory));
};

export const buildNestedCategoryItems = (
  products: Product[],
  tree?: ProductCategoryTree | null,
  activeCategory?: string | null,
  activeChildValue?: string | null
): CategoryNavChildItem[] => {
  const category = categoryForValue(tree, activeCategory);
  const subcategory = subcategoryForValue(tree, activeCategory, activeChildValue);
  if (!category || !subcategory) return [];

  return subcategory.subsubcategories
    .filter((item) => item.id && item.label)
    .map((item) => ({
      key: `subsubcategory:${normalizeFilterKey(subcategory.id)}:${normalizeFilterKey(item.id)}`,
      label: item.label,
      value: item.id,
      param: "subsubcategory" as const,
      queryParams: {
        category: category.id,
        subcategory: subcategory.id,
        subsubcategory: item.id,
      },
      imageSrc: firstProductImage(productForTaxonomy(products, category.id, subcategory.id, item.id)),
    }));
};

export const resolveActiveChildKey = ({
  childItems,
  product,
  subcategory,
  subsubcategory,
}: {
  childItems: CategoryNavChildItem[];
  product?: Product | null;
  subcategory?: string | null;
  subsubcategory?: string | null;
}) => {
  const activeValue = subsubcategory || subcategory || product?.subsubcategory || product?.subcategory;
  return childItems.find((item) => valuesMatch(item.value, activeValue))?.key || null;
};

export const isKnownCategoryChildValue = (
  tree?: ProductCategoryTree | null,
  value?: string | null,
  categoryValue?: string | null
) => {
  if (!value) return false;
  const categories = categoryValue ? [categoryForValue(tree, categoryValue)].filter(Boolean) : visibleCategories(tree);

  return categories.some((category) =>
    category!.subcategories.some(
      (subcategory) =>
        valuesMatch(subcategory.id, value) ||
        subcategory.subsubcategories.some((nested) => valuesMatch(nested.id, value))
    )
  );
};

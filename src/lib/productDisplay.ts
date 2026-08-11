import type { Product } from "../types";

type ProductDisplayFields = Pick<Product, "name" | "shortname" | "brand">;

const normalizeBrand = (value?: string | null) =>
  value
    ?.replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() || "";

const knownBrands = new Set(["nivaana", "aurora", "auora", "kraftella"]);
const leadingBrandPattern = /^\s*([^-–—]+?)\s*[-–—]\s*/;

export const getProductDisplayName = (product?: ProductDisplayFields | null, fallback = "Product") => {
  const shortName = product?.shortname?.trim();
  if (shortName) return shortName;
  if (!product?.name) return fallback;

  const match = product.name.match(leadingBrandPattern);
  if (!match) return product.name.trim();

  const leadingSegment = normalizeBrand(match[1]);
  const productBrand = normalizeBrand(product.brand);
  const shouldRemoveBrand = leadingSegment === productBrand || knownBrands.has(leadingSegment);

  if (!shouldRemoveBrand) return product.name.trim();

  return product.name.replace(leadingBrandPattern, "").trim() || product.name.trim();
};

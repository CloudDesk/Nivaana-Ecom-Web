import type { Product } from "../types";

export const LOW_STOCK_THRESHOLD = 30;

export const getAvailableStock = (product?: Product | null) => {
  if (!product) return 0;

  return Math.max(
    Number(product.availablequantity ?? product.ecompublishedquantity ?? product.quantity ?? 0),
    0
  );
};

export const isOutOfStock = (product?: Product | null) =>
  !product || product.productstatus === "out_of_stock" || getAvailableStock(product) <= 0;

export const isLowStock = (product?: Product | null) =>
  Boolean(product) && !isOutOfStock(product) && getAvailableStock(product) < LOW_STOCK_THRESHOLD;

export const stockStatusLabel = (product?: Product | null) => {
  if (isOutOfStock(product)) return "Out of Stock";
  return isLowStock(product) ? "Low Stock" : "Available";
};

export const stockLimitMessage = (stock: number) =>
  stock <= 0
    ? "This item is currently out of stock."
    : "Requested quantity exceeds the available stock.";

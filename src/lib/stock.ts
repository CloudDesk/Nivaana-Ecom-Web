import type { Product } from "../types";

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
  Boolean(product) && !isOutOfStock(product) && product?.productstatus === "low_stock";

export const stockLimitMessage = (stock: number) =>
  stock <= 0
    ? "This item is currently out of stock."
    : `Only ${stock} item${stock === 1 ? "" : "s"} available in stock.`;

import type { Product } from "../types";

export const LOW_STOCK_THRESHOLD = 30;

export const getComboAvailableStock = (product?: Product | null) => {
  if (!product?.iscombo || !product.components?.length) return 0;

  return Math.max(
    Math.min(
      ...product.components.map((component) => {
        const requiredQuantity = Number(component.requiredqty);
        if (!Number.isFinite(requiredQuantity) || requiredQuantity <= 0) return 0;

        const componentStock = Number(
          component.platformStock?.availableqty ?? component.availablequantity ?? 0
        );
        const availableQuantity = Number.isFinite(componentStock)
          ? Math.max(componentStock, 0)
          : 0;

        return Math.floor(availableQuantity / requiredQuantity);
      })
    ),
    0
  );
};

export const getAvailableStock = (product?: Product | null) => {
  if (!product) return 0;
  if (product.iscombo) return getComboAvailableStock(product);

  return Math.max(
    Number(
      product.platformStock?.availableqty ??
        product.availablequantity ??
        product.ecompublishedquantity ??
        product.quantity ??
        0
    ),
    0
  );
};

export const isOutOfStock = (product?: Product | null) =>
  !product ||
  getAvailableStock(product) <= 0 ||
  (!product.iscombo && product.productstatus === "out_of_stock");

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

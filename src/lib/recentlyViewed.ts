const RECENTLY_VIEWED_PRODUCT_IDS = "nivaana-recently-viewed-product-ids";
const MAX_RECENTLY_VIEWED_PRODUCTS = 12;

export const readRecentlyViewedProductIds = () => {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(RECENTLY_VIEWED_PRODUCT_IDS);
    const parsed = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsed)
      ? parsed.map(Number).filter((value) => Number.isFinite(value) && value > 0)
      : [];
  } catch {
    return [];
  }
};

export const saveRecentlyViewedProductId = (productId: number) => {
  if (typeof window === "undefined") return [];

  const nextIds = [
    productId,
    ...readRecentlyViewedProductIds().filter((storedId) => storedId !== productId),
  ].slice(0, MAX_RECENTLY_VIEWED_PRODUCTS);

  window.localStorage.setItem(RECENTLY_VIEWED_PRODUCT_IDS, JSON.stringify(nextIds));
  return nextIds;
};

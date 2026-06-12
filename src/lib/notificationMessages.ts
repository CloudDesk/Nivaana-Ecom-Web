export const friendlyNotificationMessage = (message?: string | null) => {
  const fallback = "Something went wrong. Please try again.";
  const text = String(message || "").trim();
  if (!text) return fallback;

  const normalized = text.toLowerCase();

  if (normalized.includes("iscart") && normalized.includes("iswishlist") && normalized.includes("cannot both be true")) {
    return "This item cannot stay in both cart and wishlist at the same time. Please try again.";
  }

  if (normalized.includes("currently out of stock")) {
    return "This item is currently out of stock. Save it to wishlist and check back later.";
  }

  if (normalized.includes("invalid or expired token") || normalized.includes("unauthorized")) {
    return "Your session has expired. Please log in again.";
  }

  return text.replace(/\biscart\b/gi, "cart").replace(/\biswishlist\b/gi, "wishlist");
};

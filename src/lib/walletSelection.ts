const key = (userId?: number) => `nivaana-wallet-applied-${userId || "guest"}`;

export const readWalletApplied = (userId?: number) => {
  if (!userId) return false;
  return window.localStorage.getItem(key(userId)) === "true";
};

export const saveWalletApplied = (userId: number | undefined, applied: boolean) => {
  if (!userId) return;
  if (applied) window.localStorage.setItem(key(userId), "true");
  else window.localStorage.removeItem(key(userId));
};

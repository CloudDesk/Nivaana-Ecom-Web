type ToastType = "success" | "error" | "warning";

type ToastPayload = {
  message: string;
  type?: ToastType;
};

export const toastListeners = new Set<(payload: ToastPayload) => void>();

const notify = (payload: ToastPayload) => {
  toastListeners.forEach((listener) => listener(payload));
};

export const toast = {
  success: (message: string) => notify({ message, type: "success" }),
  error: (message: string) => notify({ message, type: "error" }),
  warning: (message: string) => notify({ message, type: "warning" }),
};

export type { ToastPayload, ToastType };

import React, { useEffect, useState } from "react";
import { CheckCircle, Info, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/utils";

type ToastType = "success" | "error" | "warning";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastPayload = {
  message: string;
  type?: ToastType;
};

const toastListeners = new Set<(payload: ToastPayload) => void>();

const notify = (payload: ToastPayload) => {
  toastListeners.forEach((listener) => listener(payload));
};

export const toast = {
  success: (message: string) => notify({ message, type: "success" }),
  error: (message: string) => notify({ message, type: "error" }),
  warning: (message: string) => notify({ message, type: "warning" }),
};

const toastStyles: Record<ToastType, { text: string; icon: React.ElementType }> = {
  success: { text: "text-green-700", icon: CheckCircle },
  error: { text: "text-red-600", icon: XCircle },
  warning: { text: "text-[#b77900]", icon: Info },
};

export function ToastProvider() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const addToast = (payload: ToastPayload) => {
      const id = Date.now() + Math.random();
      setItems((current) => [...current, { id, message: payload.message, type: payload.type ?? "success" }].slice(-4));
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, 3200);
    };

    toastListeners.add(addToast);

    return () => {
      toastListeners.delete(addToast);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-[80] flex w-[calc(100vw-2rem)] max-w-[300px] -translate-x-1/2 flex-col items-center gap-3 sm:top-24 sm:max-w-xs">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const style = toastStyles[item.type];
          const Icon = style.icon;

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.94, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, scale: 0.96, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
              className={cn(
                "pointer-events-auto flex w-full items-center gap-2 rounded-3xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm font-semibold shadow-[var(--shadow-hover)]",
                style.text
              )}
              role="status"
            >
              <motion.span
                initial={{ scale: 0.6, rotate: -18 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 24, delay: 0.05 }}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </motion.span>
              <p className="min-w-0 flex-1 truncate">{item.message}</p>
              <button
                type="button"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-surface)]"
                onClick={() => setItems((current) => current.filter((toastItem) => toastItem.id !== item.id))}
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

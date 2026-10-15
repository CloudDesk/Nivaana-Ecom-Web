import { Lock } from "lucide-react";

/**
 * An offer that misses only its minimum quantity (PLAN-2026-10-15-116):
 * shown with "Add 1 more Incense item to get 25% off" instead of hidden.
 */
export default function LockedOfferCard({ name, message }: { name: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e8c46a] bg-[#fffaf0] px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#26344f]">
        <Lock className="h-3.5 w-3.5 shrink-0 text-[#b7791f]" aria-hidden="true" />
        <span className="min-w-0 truncate">{name}</span>
      </p>
      <p className="mt-1 pl-5 text-xs font-semibold text-[#8a5a00]">{message}</p>
    </div>
  );
}

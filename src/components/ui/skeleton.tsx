import { cn } from "../../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        // Shimmer (index.css). The previous "bg-[var(--color-border)]/70" rendered
        // transparent: Tailwind 3 cannot apply "/70" to a CSS-variable colour.
        "skeleton-shimmer rounded-[var(--radius-md)]",
        className
      )}
    />
  );
}

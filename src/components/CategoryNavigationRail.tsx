import {
  AnimatePresence,
  motion,
} from "framer-motion";
import fallbackProduct from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";
import type {
  CategoryNavChildItem,
  CategoryNavTopItem,
} from "./categoryNavigationData";
import { cn } from "../lib/utils";

interface CategoryNavigationRailProps {
  topItems: CategoryNavTopItem[];
  childItems: CategoryNavChildItem[];
  activeTopKey?: string | null;
  activeChildKey?: string | null;
  onTopSelect: (item: CategoryNavTopItem) => void;
  onChildSelect: (item: CategoryNavChildItem) => void;
  className?: string;
  childRailRounded?: boolean;
}

export default function CategoryNavigationRail({
  topItems,
  childItems,
  activeTopKey,
  activeChildKey,
  onTopSelect,
  onChildSelect,
  className,
  childRailRounded = false,
}: CategoryNavigationRailProps) {
  if (!topItems.length) return null;

  return (
    <div className={cn("relative border-b border-[#e7e3db] bg-white", className)}>
      <div className="w-full">
        <div className="overflow-x-auto px-4 pb-0 pt-3 scrollbar-hide sm:px-6 lg:px-8">
          <div className="relative flex w-max min-w-full snap-x justify-center gap-2 sm:gap-3">
            {topItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTopKey === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onTopSelect(item)}
                aria-pressed={isActive}
                className={cn(
                  "group relative overflow-visible flex min-w-[88px] snap-start flex-col items-center gap-1.5 px-3 pb-4 pt-2 text-center transition sm:min-w-[104px] sm:px-4",
                  isActive
                    ? "z-10 rounded-t-[1.15rem] bg-[#f1efea]"
                    : "rounded-[1.15rem] bg-white hover:bg-[#faf8f4]"
                )}
              >
                <span
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-full border bg-white transition sm:h-[56px] sm:w-[56px]",
                    isActive
                      ? "border-[#1f2430] bg-white text-[#1f2430]"
                      : "border-[#d8d3ca] text-[#5f6775] group-hover:border-[#1f2430] group-hover:text-[#1f2430]"
                  )}
                >
                  <Icon className="h-5 w-5 stroke-[1.9] sm:h-6 sm:w-6" />
                </span>
                <span
                  className={cn(
                    "max-w-[8.5rem] text-[11px] font-semibold leading-tight sm:text-[13px]",
                    isActive ? "text-[#13161d]" : "text-[#6e6e73] group-hover:text-[#13161d]"
                  )}
                >
                  {item.label}
                </span>
                {isActive && (
                  <>
                    <span
                      className="pointer-events-none absolute -bottom-[2px] -left-[23px] h-[27px] w-[27px]"
                      aria-hidden="true"
                      style={{
                        background:
                          "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='25'%20height='25'%20viewBox='0%200%2025%2025'%20fill='none'%3E%3Cpath%20d='M0%2025V0C2.1%2013.2%209%2021.5%2025%2025H0Z'%20fill='%23f1efea'/%3E%3C/svg%3E\") no-repeat center center",
                        backgroundSize: "100% 100%",
                        transform: "scaleX(-1)",
                      }}
                    />
                    <span
                      className="pointer-events-none absolute -bottom-[2px] -right-[23px] h-[27px] w-[27px]"
                      aria-hidden="true"
                      style={{
                        background:
                          "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='25'%20height='25'%20viewBox='0%200%2025%2025'%20fill='none'%3E%3Cpath%20d='M0%2025V0C2.1%2013.2%209%2021.5%2025%2025H0Z'%20fill='%23f1efea'/%3E%3C/svg%3E\") no-repeat center center",
                        backgroundSize: "100% 100%",
                      }}
                    />
                  </>
                )}
              </button>
            );
          })}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {childItems.length > 0 && (
            <motion.div
              key={activeTopKey || "category-rail"}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn(
                "relative -mt-1 overflow-hidden bg-[#f1efea]",
                childRailRounded && "rounded-[0.85rem]"
              )}
            >
              <div className="overflow-x-auto px-4 py-3 scrollbar-hide sm:px-6 lg:px-8">
                <div className="flex w-max min-w-full snap-x justify-center gap-2 sm:gap-3">
                  {childItems.map((item) => {
                  const isActive = activeChildKey === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onChildSelect(item)}
                      aria-pressed={isActive}
                      className={cn(
                        "inline-flex min-h-10 min-w-fit snap-start items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition",
                        isActive
                          ? "border-[#fbbc05] bg-[#fbbc05] text-[#1f2430]"
                          : "border-[#ece6da] bg-white text-[#555b66] hover:border-[#ddd4c7] hover:bg-white"
                      )}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#ece8e1]">
                        <img
                          src={item.imageSrc}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = fallbackProduct;
                          }}
                        />
                      </span>
                      <span className="whitespace-nowrap text-xs font-semibold sm:text-sm">{item.label}</span>
                    </button>
                  );
                })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

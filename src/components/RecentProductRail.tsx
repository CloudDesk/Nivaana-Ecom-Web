import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import type { Product } from "../types";

const railItemClass =
  "w-[66vw] min-w-[190px] max-w-[250px] flex-none snap-start sm:w-[34vw] sm:max-w-[280px] md:w-[27vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_4rem)/5)]";

interface RecentProductRailProps {
  eyebrow: string;
  title: string;
  products: Product[];
  viewAllTo?: string;
}

export default function RecentProductRail({
  eyebrow,
  title,
  products,
  viewAllTo = "/products",
}: RecentProductRailProps) {
  if (!products.length) return null;

  return (
    <section className="mt-12 min-w-0">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-secondary)]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--color-text)]">{title}</h2>
        </div>
        <Link to={viewAllTo} className="shrink-0 text-sm font-bold text-[var(--color-secondary)] hover:underline">
          View all
        </Link>
      </div>

      <div className="-mx-4 flex max-w-[calc(100%+2rem)] snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-3 scrollbar-hide sm:-mx-6 sm:max-w-[calc(100%+3rem)] sm:scroll-px-6 sm:px-6 lg:mx-0 lg:max-w-full lg:scroll-px-0 lg:px-0">
        {products.map((item) => (
          <div key={item.id} className={railItemClass}>
            <ProductCard product={item} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

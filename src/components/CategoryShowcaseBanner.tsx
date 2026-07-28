import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { productFallback as fallbackProduct } from "../assets/config.js";
import type { Product } from "../types";

interface CategoryShowcaseBannerProps {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
  products: Product[];
}

const productImage = (product?: Product) =>
  product?.large?.[0] || product?.medium?.[0] || product?.small?.[0] || fallbackProduct;

const productLabel = (product?: Product) =>
  product?.name || product?.subcategory || product?.category || "Nivaana";

export default function CategoryShowcaseBanner({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaTo,
  products,
}: CategoryShowcaseBannerProps) {
  const [heroProduct, ...accentProducts] = products;
  const bannerProducts = accentProducts.slice(0, 3);

  if (!heroProduct) return null;

  return (
    <section className="relative mb-10 mt-10 w-full overflow-hidden rounded-[2.25rem] bg-[#efe4d3] sm:rounded-[2.5rem] lg:rounded-[3rem]">
      <div className="absolute inset-0">
        <img
          src={productImage(heroProduct)}
          alt=""
          className="h-full w-full object-cover opacity-18 blur-[2px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,243,234,0.985)_0%,rgba(241,232,215,0.94)_42%,rgba(78,57,34,0.26)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_22%),radial-gradient(circle_at_82%_24%,rgba(255,245,222,0.34),transparent_20%),radial-gradient(circle_at_12%_88%,rgba(255,255,255,0.45),transparent_18%)]" />
      </div>

      <div className="relative grid gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(420px,0.92fr)] lg:px-8 lg:py-14">
        <div className="z-10 max-w-[42rem] self-center rounded-[1.75rem] bg-[rgba(255,250,242,0.74)] p-5 shadow-[0_20px_60px_rgba(110,82,45,0.08)] backdrop-blur-[6px] sm:p-6 lg:mr-6 lg:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f6a35] sm:text-sm">{eyebrow}</p>
          <h2 className="mt-3 max-w-[11ch] text-[2.3rem] font-extrabold leading-[0.96] text-[#2c2419] sm:text-[3rem] lg:text-[3.35rem]">
            {title}
          </h2>
          <p className="mt-4 max-w-[34rem] text-sm leading-7 text-[#5f4b35] sm:text-base">
            {description}
          </p>
          {ctaLabel && ctaTo && (
            <Link
              to={ctaTo}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#8f6a35]/20 bg-[#fffaf2] px-5 py-3 text-sm font-bold text-[#2c2419] transition hover:border-[#8f6a35]/40"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]">
          <div className="absolute bottom-0 left-6 right-6 h-24 rounded-full bg-white/35 blur-3xl sm:left-10 sm:right-10" />
          <div className="absolute left-1/2 top-4 w-[48vw] max-w-[240px] -translate-x-1/2 rotate-[-9deg] overflow-hidden rounded-[2rem] border border-white/55 bg-white/82 p-4 shadow-[0_28px_80px_rgba(56,38,18,0.22)] backdrop-blur sm:top-8 sm:max-w-[300px] lg:max-w-[340px]">
            <img
              src={productImage(heroProduct)}
              alt={productLabel(heroProduct)}
              className="aspect-[4/5] w-full rounded-[1.4rem] object-contain"
            />
          </div>

          {bannerProducts.map((product, index) => {
            const positions = [
              "left-[6%] top-[12%] w-[27vw] max-w-[150px] rotate-[-10deg] sm:max-w-[180px]",
              "right-[6%] top-[16%] w-[24vw] max-w-[138px] rotate-[9deg] sm:max-w-[170px]",
              "right-[18%] bottom-[4%] w-[22vw] max-w-[128px] rotate-[-12deg] sm:max-w-[152px]",
            ];

            return (
              <div
                key={product.id}
                className={`absolute overflow-hidden rounded-[1.6rem] border border-white/45 bg-white/75 p-3 shadow-[0_18px_50px_rgba(56,38,18,0.18)] backdrop-blur ${positions[index] || ""}`}
              >
                <img
                  src={productImage(product)}
                  alt={productLabel(product)}
                  className="aspect-[4/5] w-full rounded-[1.15rem] object-contain"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  HeartHandshake,
  Sparkles,
  Star,
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { theme } from "../config/theme.config";
import { cn } from "../lib/utils";
import { platformProductService } from "../services/productPlatformService";
import type { Product } from "../types";
import heroOne from "../assets/Gemini_Generated_Image_3h8ozb3h8ozb3h8o.png";
import heroTwo from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";
import fallbackProduct from "../assets/Gemini_Generated_Image_3h8ozb3h8ozb3h8o.png";
import heroVideoOne from "../assets/i_need_a_video_for_the_hero_co.mp4";
import heroVideoTwo from "../assets/I_need_a_video_with_insence_st.mp4";
import heroVideoThree from "../assets/I_need_togenrate_a_video_for_t.mp4";
import heroVideoFour from "../assets/Need_to_genarate_a_video_in_la.mp4";

const heroSlides = [
  {
    eyebrow: "Up to 35% Off",
    title: "Discover Your Perfect Ritual",
    text: "Premium incense, oils, and fresheners curated for calm homes, focused workdays, and sacred everyday moments.",
    video: heroVideoOne,
    poster: heroOne,
    fit: "cover",
  },
  {
    eyebrow: "New Fragrance Edits",
    title: "A Room That Feels Like Stillness",
    text: "Layer warm woods, florals, and clean aromatics across your home with Nivaana's signature blends.",
    video: heroVideoTwo,
    poster: heroTwo,
    fit: "cover",
  },
  {
    eyebrow: "Deal of the Day",
    title: "Bring Home Daily Serenity",
    text: "Shop limited-time offers across incense sticks, car fresheners, fragrance sachets, and wellness blends.",
    video: heroVideoThree,
    poster: heroOne,
    fit: "contain",
  },
  {
    eyebrow: "Luxury Home Rituals",
    title: "Let Fragrance Move Through The Space",
    text: "A cinematic Nivaana edit for incense, candles, oils, and quiet moments that make a room feel complete.",
    video: heroVideoFour,
    poster: heroTwo,
    fit: "cover",
  },
];

const categoryFallbacks = [
  "Incense",
  "Car Fresheners",
  "Fragrance Blends",
  "Havan Cups",
  "Fragrance Sachets",
  "Home Decor",
];

const testimonials = [
  "The fragrance is gentle but stays in the room beautifully.",
  "Nivaana incense has become part of my evening prayer routine.",
  "The car freshener feels premium and not overpowering.",
];

const brandPartners = ["NIVAANA", "KRAFTELLA", "AUORA", "AROMAHPURE", "RITUAL EDITS"];

const formatLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Nivaana";

const productImage = (product?: Product) =>
  product?.medium?.[0] || product?.small?.[0] || product?.large?.[0] || fallbackProduct;

const wrapIndex = (index: number, length: number) => (index + length) % length;

const Home: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeDeal, setActiveDeal] = useState(0);
  const fragranceScrollerRef = useRef<HTMLDivElement | null>(null);
  const newArrivalsScrollerRef = useRef<HTMLDivElement | null>(null);
  const newArrivalsDragRef = useRef({ startX: 0, scrollLeft: 0, dragging: false });
  const newArrivalsDragDistanceRef = useRef(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["home-products"],
    queryFn: () => platformProductService.getProducts(1, 24),
  });

  const products = useMemo(() => data?.data ?? [], [data?.data]);

  const dealProducts = useMemo(() => {
    const deals = products.filter((product) => product.isdealoftheday || product.discount > 0);
    return (deals.length ? deals : products).slice(0, 4);
  }, [products]);

  const bestSellers = useMemo(
    () => [...products].sort((a, b) => (b.soldquantity ?? 0) - (a.soldquantity ?? 0)).slice(0, 8),
    [products]
  );

  const newArrivals = useMemo(
    () => [...products].sort((a, b) => b.createddate - a.createddate).slice(0, 10),
    [products]
  );

  const categories = useMemo(() => {
    const fragranceTypes = Array.from(
      new Set(
        products.flatMap((product) =>
          (product.fragnancetype || "")
            .split(",")
            .map((fragrance) => fragrance.trim())
            .filter(Boolean)
        )
      )
    ).slice(0, 6);

    if (fragranceTypes.length) {
      return fragranceTypes.map((fragrance, index) => {
        const matchingProducts = products.filter((product) =>
          (product.fragnancetype || "")
            .split(",")
            .map((value) => value.trim())
            .includes(fragrance)
        );

        return {
          name: formatLabel(fragrance),
          image: productImage(matchingProducts[0]),
          count: matchingProducts.length || index + 1,
          to: `/products?subcategory=${encodeURIComponent(fragrance)}`,
        };
      });
    }

    const fromApi = Array.from(new Set(products.map((product) => product.subcategory || product.category)))
      .filter(Boolean)
      .slice(0, 6);

    return (fromApi.length ? fromApi : categoryFallbacks).map((category, index) => ({
      name: formatLabel(category),
      image: productImage(products.find((product) => (product.subcategory || product.category) === category)),
      count: products.filter((product) => (product.subcategory || product.category) === category).length || index + 3,
      to: `/products?subcategory=${encodeURIComponent(String(category))}`,
    }));
  }, [products]);

  const slide = heroSlides[activeSlide];

  const scrollFragrances = (direction: number) => {
    fragranceScrollerRef.current?.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    });
  };

  const scrollNewArrivals = (direction: number) => {
    const scroller = newArrivalsScrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.9, 320),
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <section className="bg-[var(--color-surface)] pb-3 pt-4 sm:pb-4 sm:pt-6 lg:pb-5 lg:pt-7">
        <div className="mx-auto w-full max-w-[1840px] px-2 sm:px-4 lg:px-6">
          <div className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
            <div className="relative h-[420px] sm:h-[520px] lg:h-[640px]">
              <motion.div
                className="flex h-full cursor-grab active:cursor-grabbing"
                animate={{ x: `-${activeSlide * 100}%` }}
                transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70) {
                    setActiveSlide((activeSlide + 1) % heroSlides.length);
                  }
                  if (info.offset.x > 70) {
                    setActiveSlide((activeSlide + heroSlides.length - 1) % heroSlides.length);
                  }
                }}
              >
                {heroSlides.map((item, index) => (
                  <div key={item.title} className="relative h-full min-w-full overflow-hidden">
                    <img
                      src={item.poster}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-105 object-cover blur-2xl"
                    />
                    <video
                      poster={item.poster}
                      src={item.video}
                      aria-hidden="true"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload={index === 0 ? "auto" : "metadata"}
                      className={cn(
                        "absolute inset-0 h-full w-full",
                        item.fit === "cover" ? "object-cover" : "object-contain"
                      )}
                    />
                    <div className="absolute inset-0" style={{ background: theme.overlays.hero }} />
                  </div>
                ))}
              </motion.div>

              <div className="pointer-events-none absolute inset-0 flex items-center">
                <div className="w-full px-6 sm:px-10 lg:px-16">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={slide.title}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.45 }}
                      className="pointer-events-auto max-w-xl text-white"
                    >
                      <p className="text-lg font-semibold text-white sm:text-2xl">{slide.eyebrow}</p>
                      <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-7xl">
                        {slide.title}
                      </h1>
                      <p className="mt-4 max-w-lg text-sm leading-7 text-white/86 sm:text-base">
                        {slide.text}
                      </p>
                      <Link to="/products" className="mt-7 inline-flex">
                        <Button className="rounded-full bg-[var(--color-text)] px-8 text-white hover:bg-[var(--color-secondary)]">
                          Shop Now
                        </Button>
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between sm:left-10 sm:right-10 lg:left-16 lg:right-16">
                <div className="flex items-center gap-4">
                  {heroSlides.map((item, index) => (
                    <button
                      key={item.title}
                      className={cn(
                        "h-3 w-3 rounded-full border-2 border-white transition",
                        activeSlide === index ? "bg-white ring-2 ring-white/50" : "bg-[var(--color-text)]"
                      )}
                      onClick={() => setActiveSlide(index)}
                      aria-label={`Show ${item.title}`}
                    />
                  ))}
                </div>
                <div className="hidden gap-2 sm:flex">
                  <Button
                    variant="icon"
                    aria-label="Previous hero slide"
                    onClick={() => setActiveSlide((activeSlide + heroSlides.length - 1) % heroSlides.length)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="icon"
                    aria-label="Next hero slide"
                    onClick={() => setActiveSlide((activeSlide + 1) % heroSlides.length)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-surface)] py-5 sm:py-6 lg:py-7">
        <div className={theme.layout.container}>
          <SectionHeader eyebrow="Deal of the day" title="Limited-time Nivaana picks" linkText="Shop deals" />
          <DealTripleSlider
            activeIndex={activeDeal}
            error={isError}
            loading={isLoading}
            products={dealProducts}
            setActiveIndex={setActiveDeal}
          />
        </div>
      </section>

      <section className="bg-[var(--color-surface)] pb-8 pt-0 sm:pb-10 lg:pb-12">
        <div className={theme.layout.container}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-secondary)]">Shop by fragrance</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--color-text)] sm:text-3xl">Fragrance for every space</h2>
            </div>
            <Link to="/products" className="hidden text-sm font-bold text-[var(--color-secondary)] hover:underline sm:inline-flex">
              View all
            </Link>
          </div>

          <div className="relative">
            <button
              className="absolute -left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-primary)] md:grid"
              onClick={() => scrollFragrances(-1)}
              aria-label="Previous fragrances"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div
              ref={fragranceScrollerRef}
              className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 scrollbar-hide sm:gap-5"
            >
              {categories.map((category) => (
                <Link
                  to={category.to}
                  key={category.name}
                  className="group min-w-[180px] snap-start overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] sm:min-w-[210px] lg:min-w-[220px]"
                >
                  <div className="aspect-square overflow-hidden bg-[var(--color-surface)]">
                    <img
                      src={category.image}
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-1 text-sm font-bold text-[var(--color-text)]">{category.name}</h3>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{category.count} products</p>
                  </div>
                </Link>
              ))}
            </div>

            <button
              className="absolute -right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-primary)] md:grid"
              onClick={() => scrollFragrances(1)}
              aria-label="Next fragrances"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className={cn(theme.layout.section, "bg-[var(--color-surface)]")}>
        <div className={theme.layout.container}>
          <SectionHeader eyebrow="Best sellers" title="Loved across daily rituals" linkText="View products" />
          <ProductGrid products={bestSellers} loading={isLoading} error={isError} />
        </div>
      </section>

      <section className={cn(theme.layout.compactSection, "bg-[var(--color-surface)]")}>
        <div className={theme.layout.container}>
          <div className="grid overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] lg:grid-cols-2">
            <div className="p-6 sm:p-10 lg:p-14">
              <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-secondary)]">Bundle and save</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--color-text)] sm:text-4xl">
                Curate a calm home with incense, oils, and room fragrance.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                Build a daily ritual kit for prayer corners, bedrooms, work desks, and cars with premium Nivaana selections.
              </p>
              <Link to="/products" className="mt-7 inline-flex">
                <Button>Build your bundle</Button>
              </Link>
            </div>
            <img src={heroTwo} alt="Nivaana fragrance ritual products" loading="lazy" className="h-full min-h-[320px] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className={cn(theme.layout.section, "bg-[var(--color-surface)]")}>
        <div className={theme.layout.container}>
          <SectionHeader eyebrow="New arrivals" title="Freshly added to Nivaana" linkText="Browse new" />

          <div className="relative">
            <button
              className="absolute -left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-primary)] lg:grid"
              onClick={() => scrollNewArrivals(-1)}
              aria-label="Previous new arrivals"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div
              ref={newArrivalsScrollerRef}
              className="-mx-4 flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide touch-pan-x active:cursor-grabbing sm:gap-4"
              onClickCapture={(event) => {
                if (newArrivalsDragDistanceRef.current > 8) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onPointerDown={(event) => {
                newArrivalsDragRef.current = {
                  startX: event.clientX,
                  scrollLeft: event.currentTarget.scrollLeft,
                  dragging: true,
                };
                newArrivalsDragDistanceRef.current = 0;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!newArrivalsDragRef.current.dragging) return;

                const distance = event.clientX - newArrivalsDragRef.current.startX;
                newArrivalsDragDistanceRef.current = Math.abs(distance);
                event.currentTarget.scrollLeft = newArrivalsDragRef.current.scrollLeft - distance;
              }}
              onPointerUp={() => {
                newArrivalsDragRef.current.dragging = false;
              }}
              onPointerCancel={() => {
                newArrivalsDragRef.current.dragging = false;
              }}
            >
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-[300px] min-w-[170px] flex-none snap-start sm:min-w-[190px] lg:basis-[calc((100%-5rem)/6)]"
                    />
                  ))
                : newArrivals.map((product) => (
                    <div
                      key={product.id}
                      className="min-w-[170px] flex-none snap-start sm:min-w-[190px] lg:min-w-0 lg:basis-[calc((100%-5rem)/6)]"
                    >
                      <ProductCard product={product} compact />
                    </div>
                  ))}
            </div>

            <button
              className="absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-primary)] lg:grid"
              onClick={() => scrollNewArrivals(1)}
              aria-label="Next new arrivals"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className={cn(theme.layout.section, "bg-[var(--color-surface)]")}>
        <div className={theme.layout.container}>
          <SectionHeader eyebrow="Why choose us" title="A premium store built for trust" />
          <div className={cn("grid md:grid-cols-3", theme.layout.gridGap)}>
            {[
              ["Verified catalog", "Only platform-published inventory is shown on the homepage."],
              ["Ritual-first curation", "Products are grouped by space, fragrance family, and everyday use."],
              ["Quiet premium feel", "White space, restrained gold accents, and clear product hierarchy."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
                <Sparkles className="h-6 w-6 text-[var(--color-secondary)]" />
                <h3 className="mt-5 text-lg font-bold text-[var(--color-text)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cn(theme.layout.section, "bg-[var(--color-surface)]")}>
        <div className={theme.layout.container}>
          <SectionHeader eyebrow="Testimonials" title="What customers notice first" />
          <div className={cn("grid md:grid-cols-3", theme.layout.gridGap)}>
            {testimonials.map((quote, index) => (
              <div key={quote} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
                <div className="mb-4 flex gap-1 text-[var(--color-primary)]">
                  {Array.from({ length: 5 }).map((_, star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-[var(--color-text)]">"{quote}"</p>
                <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">Nivaana customer {index + 1}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-surface)] py-5">
        <div className="flex w-max animate-[marquee_26s_linear_infinite] gap-10 whitespace-nowrap text-sm font-bold tracking-[0.2em] text-[var(--color-secondary)] hover:[animation-play-state:paused]">
          {[...brandPartners, ...brandPartners, ...brandPartners].map((brand, index) => (
            <span key={`${brand}-${index}`}>{brand}</span>
          ))}
        </div>
      </section>

      <section className={cn(theme.layout.section, "bg-[var(--color-surface)]")}>
        <div className={theme.layout.container}>
          <div className="mx-auto max-w-3xl text-center">
            <HeartHandshake className="mx-auto h-8 w-8 text-[var(--color-secondary)]" />
            <h2 className="mt-4 text-3xl font-bold text-[var(--color-text)] sm:text-4xl">Join the Nivaana ritual list</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)] sm:text-base">
              Get product drops, festive offers, and fragrance notes for calmer everyday spaces.
            </p>
            <form className="mx-auto mt-7 flex max-w-lg flex-col gap-3 sm:flex-row">
              <input
                type="email"
                aria-label="Email address"
                placeholder="Enter your email"
                className="h-12 flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 text-sm outline-none focus:border-[var(--color-secondary)]"
              />
              <Button type="submit">Subscribe</Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

function SectionHeader({ eyebrow, title, linkText }: { eyebrow: string; title: string; linkText?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-secondary)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--color-text)] sm:text-3xl">{title}</h2>
      </div>
      {linkText && (
        <Link to="/products" className="hidden text-sm font-bold text-[var(--color-secondary)] hover:underline sm:inline-flex">
          {linkText}
        </Link>
      )}
    </div>
  );
}

function DealTripleSlider({
  activeIndex,
  error,
  loading,
  products,
  setActiveIndex,
}: {
  activeIndex: number;
  error: boolean;
  loading: boolean;
  products: Product[];
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const dragStartRef = useRef<number | null>(null);
  const lastDragDistanceRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  if (loading) {
    return <Skeleton className="h-[260px] rounded-[28px] sm:h-[310px]" />;
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
        Product deals could not be loaded right now.
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
        No deals available right now.
      </div>
    );
  }

  const move = (direction: number) => {
    setActiveIndex((current) => current + direction);
  };

  const positions = [-1, 0, 1];
  const cardThemes = [
    "bg-[#edf7f1]",
    "bg-[#f7efe7]",
    "bg-[#f4edf8]",
    "bg-[#eef4f7]",
  ];

  return (
    <div className="relative -mx-4 overflow-hidden px-4 py-2 sm:-mx-8 sm:px-8 lg:py-3">
      <button
        className="absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-primary)] sm:left-4"
        onClick={() => move(-1)}
        aria-label="Previous deal"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <motion.div
        className="relative h-[250px] cursor-grab select-none touch-pan-y [perspective:1400px] active:cursor-grabbing sm:h-[300px] lg:h-[340px]"
        onClickCapture={(event) => {
          if (lastDragDistanceRef.current > 8) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerDown={(event) => {
          dragStartRef.current = event.clientX;
          lastDragDistanceRef.current = 0;
          setIsDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStartRef.current === null) return;
          const distance = event.clientX - dragStartRef.current;
          lastDragDistanceRef.current = Math.abs(distance);
          setDragOffset(Math.max(Math.min(distance, 220), -220));
        }}
        onPointerUp={(event) => {
          if (dragStartRef.current === null) return;
          const distance = event.clientX - dragStartRef.current;
          if (distance < -70) move(1);
          if (distance > 70) move(-1);
          dragStartRef.current = null;
          setDragOffset(0);
          setIsDragging(false);
        }}
        onPointerCancel={() => {
          dragStartRef.current = null;
          setDragOffset(0);
          setIsDragging(false);
        }}
      >
        {positions.map((position) => {
          const product = products[wrapIndex(activeIndex + position, products.length)];
          const isCenter = position === 0;
          const price = Math.max(product.price - product.discount, 0);
          const cardX = position === -1 ? "-118%" : position === 1 ? "18%" : "-50%";
          const normalizedIndex = wrapIndex(activeIndex + position, products.length);

          return (
            <motion.article
              key={product.id}
              onClick={() => {
                if (!isCenter) {
                  setActiveIndex((current) => current + position);
                }
              }}
              initial={false}
              animate={{
                x: isDragging ? `calc(${cardX} + ${dragOffset}px)` : cardX,
                y: isCenter ? 0 : 14,
                rotateY: isCenter ? 0 : position === -1 ? 5 : -5,
                scale: isCenter ? 1 : 0.88,
                opacity: isCenter ? 1 : 0.62,
              }}
              transition={
                isDragging
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 170,
                      damping: 24,
                      mass: 0.95,
                    }
              }
              className={cn(
                "absolute left-1/2 top-0 h-[238px] w-[86vw] max-w-[660px] overflow-hidden rounded-[28px] border border-[var(--color-border)] shadow-[var(--shadow-card)] [backface-visibility:hidden] [transform-style:preserve-3d] sm:h-[286px] sm:w-[72vw] lg:h-[320px] lg:w-[48vw]",
                cardThemes[normalizedIndex % cardThemes.length],
                isCenter
                  ? "z-10 shadow-[0_24px_70px_rgba(17,24,39,0.16)]"
                  : "z-0 shadow-[0_12px_34px_rgba(17,24,39,0.08)]"
              )}
            >
              <motion.img
                src={productImage(product)}
                alt=""
                aria-hidden="true"
                loading="lazy"
                animate={{ scale: isCenter ? 1.04 : 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 right-0 h-full w-[62%] object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/94 via-45% to-white/10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_25%,rgba(255,255,255,0.55),transparent_32%)]" />
              <div className="relative flex h-full max-w-[58%] flex-col justify-center p-5 sm:p-7 lg:p-8">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-secondary)] sm:text-sm">
                  {product.isdealoftheday ? "Deal of the Day" : "Limited Offer"}
                </p>
                <h3 className="mt-2 line-clamp-3 text-xl font-extrabold leading-tight text-[var(--color-text)] sm:text-3xl">
                  {formatLabel(product.fragnancetype || product.subcategory)}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[var(--color-muted)]">
                  {product.shortdescription || "Refresh your ritual with premium Nivaana fragrance."}
                </p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="text-xl font-extrabold text-[var(--color-text)] sm:text-2xl">
                    Rs. {price.toLocaleString("en-IN")}
                  </span>
                  {product.discount > 0 && (
                    <span className="pb-1 text-sm text-[var(--color-muted)] line-through">
                      Rs. {product.price.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <Link to="/products" className="mt-4 inline-flex">
                  <Button className="rounded-full bg-[var(--color-text)] px-5 text-white hover:bg-[var(--color-secondary)]">
                    Explore Now <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="pointer-events-none absolute bottom-4 right-5 hidden rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[var(--color-secondary)] shadow-sm sm:block">
                {formatLabel(product.category)}
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      <button
        className="absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-primary)] sm:right-4"
        onClick={() => move(1)}
        aria-label="Next deal"
      >
        <ArrowRight className="h-5 w-5" />
      </button>

      <div className="mt-2 flex justify-center gap-2">
        {products.map((product, index) => (
          <button
            key={product.id}
            className={cn(
              "h-2.5 rounded-full transition-all",
              wrapIndex(activeIndex, products.length) === index
                ? "w-9 bg-[var(--color-secondary)]"
                : "w-2.5 bg-[var(--color-border)]"
            )}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show deal ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function ProductGrid({ products, loading, error }: { products: Product[]; loading: boolean; error: boolean }) {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5", theme.layout.gridGap)}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[360px]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
        Product data could not be loaded right now.
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5", theme.layout.gridGap)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default Home;

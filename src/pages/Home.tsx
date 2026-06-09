import React, { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { theme } from "../config/theme.config";
import { cn } from "../lib/utils";
import { platformProductService } from "../services/productPlatformService";
import { ratingService } from "../services/ratingService";
import type { Product, Rating } from "../types";
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

const brandPartners = ["NIVAANA", "KRAFTELLA", "AUORA", "AROMAHPURE", "RITUAL EDITS"];

const formatLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Nivaana";

const usableImage = (images?: string[] | null) =>
  images?.find((image) => image && !/example|placeholder/i.test(image));

const productImage = (product?: Product) =>
  usableImage(product?.large) || usableImage(product?.medium) || usableImage(product?.small) || fallbackProduct;

const wrapIndex = (index: number, length: number) => (index + length) % length;

const reviewAuthor = (review: Rating) => review.usermail || (review.userid ? `Customer #${review.userid}` : "");

const reviewImage = (review: Rating, products: Product[]) =>
  review.url?.find(Boolean) || productImage(products.find((product) => product.id === review.productid));

const carouselArrowClass =
  "h-11 w-11 place-items-center rounded-full border border-[#dedede] bg-white text-[#7a7a7a] shadow-[0_8px_22px_rgba(17,24,39,0.08)] transition duration-200 hover:border-[#cfcfcf] hover:bg-white hover:text-[#565656] hover:shadow-[0_10px_26px_rgba(17,24,39,0.12)]";

const Home: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeDeal, setActiveDeal] = useState(0);
  const [activeReview, setActiveReview] = useState(0);
  const fragranceScrollerRef = useRef<HTMLDivElement | null>(null);
  const newArrivalsScrollerRef = useRef<HTMLDivElement | null>(null);
  const heroSwipeRef = useRef({ startX: 0, startY: 0, swiping: false, tracking: false });
  const heroSwipeDistanceRef = useRef(0);
  const suppressHeroClickRef = useRef(false);
  const newArrivalsDragRef = useRef({ startX: 0, scrollLeft: 0, dragging: false });
  const newArrivalsDragDistanceRef = useRef(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["home-products"],
    queryFn: () => platformProductService.getProducts(1, 24),
  });

  const ratingsQuery = useQuery({
    queryKey: ["home-ratings"],
    queryFn: () => ratingService.getRatings(1, 12),
  });

  const products = useMemo(() => data?.data ?? [], [data?.data]);
  const customerReviews = useMemo(
    () =>
      (ratingsQuery.data?.data ?? [])
        .filter((review) => review.comments?.trim())
        .sort((a, b) => (b.createddate ?? 0) - (a.createddate ?? 0)),
    [ratingsQuery.data?.data]
  );

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

  const moveHeroSlide = (direction: number) => {
    setActiveSlide((current) => wrapIndex(current + direction, heroSlides.length));
  };

  const moveReview = (direction: number) => {
    if (!customerReviews.length) return;
    setActiveReview((current) => wrapIndex(current + direction, customerReviews.length));
  };

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

  const activeCustomerReview = customerReviews.length
    ? customerReviews[wrapIndex(activeReview, customerReviews.length)]
    : undefined;

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <section className="bg-[var(--color-surface)] pb-3 pt-4 sm:pb-4 sm:pt-6 lg:pb-5 lg:pt-7">
        <div className="mx-auto w-full max-w-[1840px] px-2 sm:px-4 lg:px-6">
          <div className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
            <div
              className="relative h-[420px] touch-pan-y select-none sm:h-[520px] lg:h-[640px]"
              onClickCapture={(event) => {
                if (suppressHeroClickRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onPointerDownCapture={(event) => {
                if ((event.target as HTMLElement).closest("a, button")) return;

                heroSwipeRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  swiping: false,
                  tracking: true,
                };
                heroSwipeDistanceRef.current = 0;
                suppressHeroClickRef.current = false;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMoveCapture={(event) => {
                if (!heroSwipeRef.current.tracking) return;

                const distanceX = event.clientX - heroSwipeRef.current.startX;
                const distanceY = event.clientY - heroSwipeRef.current.startY;

                heroSwipeDistanceRef.current = Math.abs(distanceX);
                heroSwipeRef.current.swiping = Math.abs(distanceX) > 12 && Math.abs(distanceX) > Math.abs(distanceY);
              }}
              onPointerUpCapture={(event) => {
                if (!heroSwipeRef.current.tracking) return;

                const distanceX = event.clientX - heroSwipeRef.current.startX;
                const distanceY = event.clientY - heroSwipeRef.current.startY;
                const isHorizontalSwipe = Math.abs(distanceX) > 52 && Math.abs(distanceX) > Math.abs(distanceY) * 1.25;

                heroSwipeRef.current.tracking = false;
                heroSwipeRef.current.swiping = false;

                if (!isHorizontalSwipe) return;
                suppressHeroClickRef.current = true;
                window.setTimeout(() => {
                  suppressHeroClickRef.current = false;
                  heroSwipeDistanceRef.current = 0;
                }, 0);
                moveHeroSlide(distanceX < 0 ? 1 : -1);
              }}
              onPointerCancelCapture={() => {
                heroSwipeRef.current.tracking = false;
                heroSwipeRef.current.swiping = false;
              }}
            >
              <motion.div
                className="flex h-full cursor-grab active:cursor-grabbing"
                animate={{ x: `-${activeSlide * 100}%` }}
                transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
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
                <div className="hidden gap-2 lg:flex">
                  <Button
                    variant="icon"
                    className={carouselArrowClass}
                    aria-label="Previous hero slide"
                    onClick={() => moveHeroSlide(-1)}
                  >
                    <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
                  </Button>
                  <Button
                    variant="icon"
                    className={carouselArrowClass}
                    aria-label="Next hero slide"
                    onClick={() => moveHeroSlide(1)}
                  >
                    <ChevronRight className="h-5 w-5 stroke-[2.4]" />
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

          <div className="relative lg:px-16">
            <button
              className={cn("absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
              onClick={() => scrollFragrances(-1)}
              aria-label="Previous fragrances"
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
            </button>

            <div
              ref={fragranceScrollerRef}
              className="-mx-4 flex snap-x gap-4 overflow-x-auto scroll-px-4 px-4 pb-3 scrollbar-hide sm:-mx-6 sm:scroll-px-6 sm:px-6 sm:pb-4 sm:gap-5 lg:mx-0 lg:scroll-px-0 lg:px-0"
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
              className={cn("absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
              onClick={() => scrollFragrances(1)}
              aria-label="Next fragrances"
            >
              <ChevronRight className="h-5 w-5 stroke-[2.4]" />
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

      <section className={cn(theme.layout.section, "bg-[var(--color-surface)]")}>
        <div className={theme.layout.container}>
          <SectionHeader eyebrow="New arrivals" title="Freshly added to Nivaana" linkText="Browse new" />

          <div className="relative lg:px-16">
            <button
              className={cn("absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
              onClick={() => scrollNewArrivals(-1)}
              aria-label="Previous new arrivals"
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
            </button>

            <div
              ref={newArrivalsScrollerRef}
              className="-mx-4 flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 scrollbar-hide touch-pan-x active:cursor-grabbing sm:-mx-6 sm:scroll-px-6 sm:px-6 sm:pb-4 md:gap-4 lg:mx-0 lg:scroll-px-0 lg:px-0"
              onClickCapture={(event) => {
                if (newArrivalsDragDistanceRef.current > 8) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                newArrivalsDragRef.current = {
                  startX: event.clientX,
                  scrollLeft: event.currentTarget.scrollLeft,
                  dragging: true,
                };
                newArrivalsDragDistanceRef.current = 0;
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
                      className="h-[300px] w-[72vw] min-w-[164px] max-w-[220px] flex-none snap-start sm:w-[38vw] sm:max-w-[240px] md:w-[30vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_5rem)/6)]"
                    />
                  ))
                : newArrivals.map((product) => (
                    <div
                      key={product.id}
                      className="w-[72vw] min-w-[164px] max-w-[220px] flex-none snap-start sm:w-[38vw] sm:max-w-[240px] md:w-[30vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_5rem)/6)]"
                    >
                      <ProductCard product={product} compact />
                    </div>
                  ))}
            </div>

            <button
              className={cn("absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
              onClick={() => scrollNewArrivals(1)}
              aria-label="Next new arrivals"
            >
              <ChevronRight className="h-5 w-5 stroke-[2.4]" />
            </button>
          </div>
        </div>
      </section>

      {activeCustomerReview && (
        <section className={cn(theme.layout.section, "bg-[var(--color-surface)]")}>
          <div className={theme.layout.container}>
            <SectionHeader eyebrow="Customer reviews" title="What our customers say" />
            <div className="md:hidden">
              <div className="relative mx-auto max-w-[340px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-5 pb-9 pt-6 text-center shadow-[var(--shadow-card)]">
                <div className="mb-3 flex justify-center gap-1 text-[var(--color-text)]">
                  {Array.from({ length: Math.max(1, Math.min(activeCustomerReview.starrating || 5, 5)) }).map((_, star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mx-auto max-w-[270px] text-sm leading-6 text-[var(--color-muted)]">
                  {activeCustomerReview.comments}
                </p>
                {reviewAuthor(activeCustomerReview) && (
                  <p className="mt-4 text-sm font-bold text-[var(--color-text)]">{reviewAuthor(activeCustomerReview)}</p>
                )}
                <span className="absolute bottom-4 right-5 text-5xl font-bold leading-none text-[var(--color-border)]">"</span>
                <div className="absolute -bottom-6 left-1/2 h-12 w-12 -translate-x-1/2 overflow-hidden rounded-full border-2 border-white bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
                  <img
                    src={reviewImage(activeCustomerReview, products)}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {customerReviews.length > 1 && (
                <div className="mt-9 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-text)] text-white shadow-[var(--shadow-card)]"
                    onClick={() => moveReview(-1)}
                    aria-label="Previous review"
                  >
                    <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
                  </button>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-muted)]"
                    onClick={() => moveReview(1)}
                    aria-label="Next review"
                  >
                    <ChevronRight className="h-5 w-5 stroke-[2.4]" />
                  </button>
                </div>
              )}
            </div>

            <div className={cn("hidden md:grid md:grid-cols-3", theme.layout.gridGap)}>
              {customerReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
                  <div className="mb-4 flex gap-1 text-[var(--color-primary)]">
                    {Array.from({ length: Math.max(1, Math.min(review.starrating || 5, 5)) }).map((_, star) => (
                      <Star key={star} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm leading-7 text-[var(--color-text)]">"{review.comments}"</p>
                  {reviewAuthor(review) && (
                    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">{reviewAuthor(review)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-surface)] py-5">
        <div className="flex w-max animate-[marquee_26s_linear_infinite] gap-10 whitespace-nowrap text-sm font-bold tracking-[0.2em] text-[var(--color-secondary)] hover:[animation-play-state:paused]">
          {[...brandPartners, ...brandPartners, ...brandPartners].map((brand, index) => (
            <span key={`${brand}-${index}`}>{brand}</span>
          ))}
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
  const navigate = useNavigate();
  const dragStartRef = useRef<number | null>(null);
  const lastDragDistanceRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const clickThreshold = 8;
  const swipeThreshold = 36;

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

  const resetDrag = () => {
    dragStartRef.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  const positions = [-1, 0, 1];
  return (
    <div className="relative -mx-4 overflow-hidden px-0 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-24 lg:py-6">
      <button
        className={cn("absolute left-3 top-[46%] z-20 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
        onClick={() => move(-1)}
        aria-label="Previous deal"
      >
        <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
      </button>

      <motion.div
        className="relative h-[360px] cursor-grab select-none overflow-hidden touch-pan-y [perspective:1400px] active:cursor-grabbing sm:h-[420px] lg:h-[450px]"
        onClickCapture={(event) => {
          if (lastDragDistanceRef.current > clickThreshold) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {positions.map((position) => {
          const product = products[wrapIndex(activeIndex + position, products.length)];
          const isCenter = position === 0;
          const price = Math.max(product.price - product.discount, 0);
          const cardX = position === -1 ? "-94%" : position === 1 ? "-6%" : "-50%";

          return (
            <motion.article
              key={product.id}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("button")) return;

                dragStartRef.current = event.clientX;
                lastDragDistanceRef.current = 0;
                setIsDragging(true);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (dragStartRef.current === null) return;
                const distance = event.clientX - dragStartRef.current;
                lastDragDistanceRef.current = Math.abs(distance);
                setDragOffset(Math.max(Math.min(distance, 180), -180));
              }}
              onPointerUp={(event) => {
                if (dragStartRef.current === null) return;
                const distance = event.clientX - dragStartRef.current;
                const dragDistance = Math.abs(distance);

                lastDragDistanceRef.current = dragDistance;
                resetDrag();

                if (distance < -swipeThreshold) {
                  move(1);
                  return;
                }

                if (distance > swipeThreshold) {
                  move(-1);
                  return;
                }

                if ((event.target as HTMLElement).closest("button")) return;
                if (dragDistance <= clickThreshold) {
                  navigate(`/products/${product.id}`);
                }
              }}
              onPointerCancel={resetDrag}
              initial={false}
              animate={{
                x: isDragging ? `calc(${cardX} + ${dragOffset}px)` : cardX,
                y: isCenter ? 0 : 18,
                rotateY: 0,
                scale: isCenter ? 1 : 0.86,
                opacity: isCenter ? 1 : 0.64,
              }}
              transition={
                isDragging
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 120,
                      damping: 30,
                      mass: 1.05,
                    }
              }
              className={cn(
                "absolute left-1/2 top-0 flex h-[342px] w-[78vw] max-w-[310px] cursor-pointer touch-pan-y flex-col overflow-hidden rounded-[22px] border border-[#eadfc9] bg-[#fff8e8] shadow-[var(--shadow-card)] [backface-visibility:hidden] [transform-style:preserve-3d] active:cursor-grabbing sm:h-[400px] sm:w-[62vw] sm:max-w-[460px] lg:h-[430px] lg:w-[43vw] lg:max-w-[620px]",
                isCenter
                  ? "z-10 shadow-[0_20px_54px_rgba(17,24,39,0.14)]"
                  : "z-0 shadow-[0_10px_26px_rgba(17,24,39,0.06)]"
              )}
            >
              <div className="relative min-h-0 flex-1 overflow-hidden bg-[#efe6d4]">
                <motion.img
                  src={productImage(product)}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  loading="lazy"
                  animate={{ scale: isCenter ? 1.01 : 1 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none h-full w-full object-contain object-center"
                />
                <div className="pointer-events-none absolute right-4 top-4 hidden rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[var(--color-secondary)] shadow-sm sm:block">
                  {formatLabel(product.category)}
                </div>
                <Button
                  type="button"
                  className="absolute bottom-4 left-4 h-10 rounded-full bg-[#f0c353] px-4 text-[#111827] shadow-none hover:bg-[#d99c16] hover:shadow-none sm:px-5"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/products/${product.id}`);
                  }}
                >
                  Explore <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
              <div className="shrink-0 border-t border-[#edca78]/55 bg-[#fff8e8] p-3 sm:p-5">
                <div className="grid gap-2 sm:gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#c17c00]">
                      {product.isdealoftheday ? "Deal of the Day" : "Limited Offer"}
                    </p>
                    <h3 className="mt-1 hidden line-clamp-2 text-base font-extrabold leading-snug text-[var(--color-text)] sm:block sm:text-xl sm:leading-tight">
                      {product.name}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                      {formatLabel(product.category)} - {formatLabel(product.subcategory)}
                    </p>
                  </div>
                  <div className="hidden shrink-0 items-end gap-2 sm:flex sm:justify-end">
                    <span className="text-lg font-extrabold text-[var(--color-text)] sm:text-2xl">
                      Rs. {price.toLocaleString("en-IN")}
                    </span>
                    {product.discount > 0 && (
                      <span className="pb-1 text-sm text-[var(--color-muted)] line-through">
                        Rs. {product.price.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      <button
        className={cn("absolute right-3 top-[46%] z-20 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
        onClick={() => move(1)}
        aria-label="Next deal"
      >
        <ChevronRight className="h-5 w-5 stroke-[2.4]" />
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

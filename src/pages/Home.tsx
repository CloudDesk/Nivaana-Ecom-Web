import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { promotionalAssetService } from "../services/promotionalAssetService";
import { ratingService } from "../services/ratingService";
import type { Product, PromotionalAsset, PromotionalAssetContent, Rating } from "../types";
import heroOne from "../assets/Gemini_Generated_Image_3h8ozb3h8ozb3h8o.png";
import heroTwo from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";
import fallbackProduct from "../assets/Gemini_Generated_Image_3h8ozb3h8ozb3h8o.png";
import heroVideoOne from "../assets/i_need_a_video_for_the_hero_co.mp4";
import heroVideoTwo from "../assets/I_need_a_video_with_insence_st.mp4";
import heroVideoThree from "../assets/I_need_togenrate_a_video_for_t.mp4";
import heroVideoFour from "../assets/Need_to_genarate_a_video_in_la.mp4";

type HeroSlide = {
  eyebrow: string;
  title: string;
  text: string;
  video: string;
  image: string;
  poster: string;
  fit: "cover" | "contain";
  ctaText: string;
  ctaUrl: string;
};

const heroSlides: HeroSlide[] = [
  {
    eyebrow: "Up to 35% Off",
    title: "Discover Your Perfect Ritual",
    text: "Premium incense, oils, and fresheners curated for calm homes, focused workdays, and sacred everyday moments.",
    video: heroVideoOne,
    image: "",
    poster: heroOne,
    fit: "cover",
    ctaText: "Shop Now",
    ctaUrl: "/products",
  },
  {
    eyebrow: "New Fragrance Edits",
    title: "A Room That Feels Like Stillness",
    text: "Layer warm woods, florals, and clean aromatics across your home with Nivaana's signature blends.",
    video: heroVideoTwo,
    image: "",
    poster: heroTwo,
    fit: "cover",
    ctaText: "Shop Now",
    ctaUrl: "/products",
  },
  {
    eyebrow: "Deal of the Day",
    title: "Bring Home Daily Serenity",
    text: "Shop limited-time offers across incense sticks, car fresheners, fragrance sachets, and wellness blends.",
    video: heroVideoThree,
    image: "",
    poster: heroOne,
    fit: "contain",
    ctaText: "Shop Now",
    ctaUrl: "/products",
  },
  {
    eyebrow: "Luxury Home Rituals",
    title: "Let Fragrance Move Through The Space",
    text: "A cinematic Nivaana edit for incense, candles, oils, and quiet moments that make a room feel complete.",
    video: heroVideoFour,
    image: "",
    poster: heroTwo,
    fit: "cover",
    ctaText: "Shop Now",
    ctaUrl: "/products",
  },
];

const categoryFallbacks = [
  { label: "Incense", to: "/products?category=incense" },
  { label: "Home Fragrance", to: "/products?category=home_fragrance" },
  { label: "Car & Room Fresheners", to: "/products?category=car_room_fresheners" },
  { label: "Personal Care", to: "/products?category=personal_care" },
  { label: "Perfumes", to: "/products?category=perfumes" },
  { label: "Daily Rituals", to: "/products?category=daily_rituals" },
  { label: "Gift Collections", to: "/products?category=gift_collections" },
  { label: "Essential Oils", to: "/products?subcategory=essential_oils" },
  { label: "Fragrance Blends", to: "/products?subcategory=fragrance_blends" },
];

const brandPartners = ["NIVAANA", "KRAFTELLA", "AUORA", "AROMAHPURE", "RITUAL EDITS"];

type CategorySlide = {
  id: string;
  name: string;
  subcategory: string;
  image: string;
  to: string;
};

type FlavorSlide = {
  id: string;
  name: string;
  image: string;
  to: string;
};

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
const homeContainer = "mx-auto w-full max-w-[1600px] px-2 sm:px-4 lg:px-6";
const heroContainer = "mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-14";
const homeSection = "py-7 sm:py-8 lg:py-10";
const heroSlideIntervalMs = 8000;
const heroTimerRadius = 10;
const heroTimerCircumference = 2 * Math.PI * heroTimerRadius;

const placements = {
  hero: "ecom_web_homepage_hero",
  deals: "ecom_web_homepage_deal_of_day",
  categories: "ecom_web_homepage_fragrance_categories",
  bestSellers: "ecom_web_homepage_best_sellers",
  newArrivals: "ecom_web_homepage_new_arrivals",
  reviews: "ecom_web_homepage_reviews",
  marquee: "ecom_web_homepage_brand_marquee",
} as const;

const firstSectionContent = (sections: Record<string, PromotionalAsset[]> | undefined, key: string): PromotionalAssetContent =>
  sections?.[key]?.[0]?.content || {};

const configuredHeroSlides = (assets?: PromotionalAsset[]): HeroSlide[] =>
  (assets || [])
    .filter((asset) => asset.content?.desktop_video_url || asset.content?.desktop_image_url || asset.content?.poster_image_url)
    .map((asset) => ({
      eyebrow: asset.content.eyebrow || asset.content.section_eyebrow || "",
      title: asset.title || "Nivaana",
      text: asset.content.body_text || asset.content.subtitle || "",
      video: asset.content.desktop_video_url || "",
      image: asset.content.desktop_image_url || asset.content.poster_image_url || "",
      poster: asset.content.poster_image_url || asset.content.desktop_image_url || heroOne,
      fit: asset.content.fit === "contain" ? "contain" : "cover",
      ctaText: asset.content.cta_text || "Shop Now",
      ctaUrl: asset.content.cta_url || "/products",
    }));

const Home: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeReview, setActiveReview] = useState(0);
  const dealsScrollerRef = useRef<HTMLDivElement | null>(null);
  const flavorsScrollerRef = useRef<HTMLDivElement | null>(null);
  const bestSellersScrollerRef = useRef<HTMLDivElement | null>(null);
  const newArrivalsScrollerRef = useRef<HTMLDivElement | null>(null);
  const heroSwipeRef = useRef({ startX: 0, startY: 0, swiping: false, tracking: false });
  const heroSwipeDistanceRef = useRef(0);
  const suppressHeroClickRef = useRef(false);
  const dealsDragRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false, horizontal: false });
  const dealsDragDistanceRef = useRef(0);
  const flavorsDragRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false, horizontal: false });
  const flavorsDragDistanceRef = useRef(0);
  const bestSellersDragRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false, horizontal: false });
  const bestSellersDragDistanceRef = useRef(0);
  const newArrivalsDragRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false, horizontal: false });
  const newArrivalsDragDistanceRef = useRef(0);

  const { data, isLoading } = useQuery({
    queryKey: ["home-products"],
    queryFn: () => platformProductService.getProducts(1, 24),
  });

  const ratingsQuery = useQuery({
    queryKey: ["home-ratings"],
    queryFn: () => ratingService.getRatings(1, 12),
  });

  const homepageConfigQuery = useQuery({
    queryKey: ["homepage-promotional-config"],
    queryFn: () => promotionalAssetService.getHomepageConfig(),
    staleTime: 1000 * 60 * 5,
  });

  const products = useMemo(() => data?.data ?? [], [data?.data]);
  const homepageSections = homepageConfigQuery.data?.data.sections;
  const heroSlidesFromConfig = useMemo(
    () => configuredHeroSlides(homepageSections?.[placements.hero]),
    [homepageSections]
  );
  const visibleHeroSlides = heroSlidesFromConfig.length ? heroSlidesFromConfig : heroSlides;
  const dealConfig = firstSectionContent(homepageSections, placements.deals);
  const categoryConfig = firstSectionContent(homepageSections, placements.categories);
  const bestSellerConfig = firstSectionContent(homepageSections, placements.bestSellers);
  const newArrivalConfig = firstSectionContent(homepageSections, placements.newArrivals);
  const reviewConfig = firstSectionContent(homepageSections, placements.reviews);
  const marqueeConfig = firstSectionContent(homepageSections, placements.marquee);
  const customerReviews = useMemo(
    () =>
      (ratingsQuery.data?.data ?? [])
        .filter((review) => review.comments?.trim())
        .sort((a, b) => (b.createddate ?? 0) - (a.createddate ?? 0)),
    [ratingsQuery.data?.data]
  );

  const dealProducts = useMemo(() => {
    const filter = dealConfig.product_filter;
    const requireDealFlag = filter?.require_deal_flag ?? true;
    const includeDiscounted = filter?.include_discounted ?? true;
    const limit = filter?.limit || dealConfig.display_limit || 4;
    const deals = products.filter((product) =>
      (requireDealFlag && product.isdealoftheday) || (includeDiscounted && product.discount > 0)
    );
    return (deals.length ? deals : products).slice(0, limit);
  }, [dealConfig.display_limit, dealConfig.product_filter, products]);

  const bestSellers = useMemo(
    () => [...products].sort((a, b) => (b.soldquantity ?? 0) - (a.soldquantity ?? 0)).slice(0, bestSellerConfig.display_limit || bestSellerConfig.product_filter?.limit || 8),
    [bestSellerConfig.display_limit, bestSellerConfig.product_filter?.limit, products]
  );

  const newArrivals = useMemo(
    () => [...products].sort((a, b) => b.createddate - a.createddate).slice(0, newArrivalConfig.display_limit || newArrivalConfig.product_filter?.limit || 10),
    [newArrivalConfig.display_limit, newArrivalConfig.product_filter?.limit, products]
  );

  const flavors = useMemo<FlavorSlide[]>(() => {
    const flavorMap = new Map<string, FlavorSlide>();

    products.forEach((product) => {
      product.fragnancetype
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((flavor) => {
          const key = flavor.toLowerCase();
          if (flavorMap.has(key)) return;

          flavorMap.set(key, {
            id: key,
            name: formatLabel(flavor),
            image: productImage(product),
            to: `/products?subsubcategory=${encodeURIComponent(flavor)}`,
          });
        });
    });

    return Array.from(flavorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const categories = useMemo(() => {
    const limit = categoryConfig.display_limit || categoryConfig.product_filter?.limit || 6;
    const categoryMap = new Map<string, CategorySlide>();

    products.forEach((product) => {
      const category = product.category?.trim();
      const subcategory = product.subcategory?.trim();
      if (!category && !subcategory) return;

      const key = `${category || "nivaana"}:${subcategory || category || "all"}`.toLowerCase();
      if (!categoryMap.has(key)) {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (subcategory) params.set("subcategory", subcategory);

        categoryMap.set(key, {
          id: key,
          name: formatLabel(category || subcategory),
          subcategory: formatLabel(subcategory || category),
          image: productImage(product),
          to: `/products?${params.toString()}`,
        });
      }
    });

    const fromApi = Array.from(categoryMap.values()).slice(0, limit);
    if (fromApi.length) return fromApi;

    return categoryFallbacks.slice(0, limit).map((category) => ({
      id: `fallback:${category.label.toLowerCase()}`,
      name: "Nivaana",
      subcategory: category.label,
      image: fallbackProduct,
      to: category.to,
    }));
  }, [categoryConfig.display_limit, categoryConfig.product_filter?.limit, products]);

  const slide = visibleHeroSlides[wrapIndex(activeSlide, visibleHeroSlides.length)];

  useEffect(() => {
    if (visibleHeroSlides.length <= 1) return;

    const timer = window.setTimeout(() => {
      setActiveSlide((current) => wrapIndex(current + 1, visibleHeroSlides.length));
    }, heroSlideIntervalMs);

    return () => window.clearTimeout(timer);
  }, [activeSlide, visibleHeroSlides.length]);

  const moveHeroSlide = (direction: number) => {
    setActiveSlide((current) => wrapIndex(current + direction, visibleHeroSlides.length));
  };

  const moveReview = (direction: number) => {
    if (!customerReviews.length) return;
    setActiveReview((current) => wrapIndex(current + direction, customerReviews.length));
  };

  const scrollDeals = (direction: number) => {
    const scroller = dealsScrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.9, 320),
      behavior: "smooth",
    });
  };

  const scrollFlavors = (direction: number) => {
    const scroller = flavorsScrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.9, 320),
      behavior: "smooth",
    });
  };

  const scrollBestSellers = (direction: number) => {
    const scroller = bestSellersScrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.9, 320),
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
      <section className="bg-[var(--color-surface)] pb-6 pt-7 sm:pb-8 sm:pt-10 lg:pb-10 lg:pt-16">
        <div className={heroContainer}>
          <div className="relative w-full overflow-hidden rounded-[22px] bg-white shadow-[var(--shadow-card)] sm:rounded-[28px] lg:rounded-[34px]">
            <div
              className="relative h-[58svh] min-h-[350px] max-h-[300px] touch-pan-y select-none sm:h-[calc(100svh-11rem)] sm:min-h-[460px] sm:max-h-[620px] md:min-h-[520px] lg:h-[calc(100svh-12.5rem)] lg:min-h-[560px] lg:max-h-[704px]"
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
                {visibleHeroSlides.map((item, index) => (
                  <div key={item.title} className="relative h-full min-w-full overflow-hidden">
                    <img
                      src={item.poster}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-105 object-cover blur-2xl"
                    />
                    {item.video ? (
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
                    ) : (
                      <img
                        src={item.image || item.poster}
                        alt=""
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-0 h-full w-full",
                          item.fit === "cover" ? "object-cover" : "object-contain"
                        )}
                      />
                    )}
                    <div className="absolute inset-0" style={{ background: theme.overlays.hero }} />
                  </div>
                ))}
              </motion.div>

              <div className="pointer-events-none absolute inset-0 flex items-start">
                <div className="w-full px-6 pt-8 sm:px-10 sm:pt-10 lg:px-16 lg:pt-14">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={slide.title}
                      initial={{ opacity: 0, x: -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.45 }}
                      className="pointer-events-auto max-w-[300px] text-left text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.45)] sm:max-w-[380px] lg:max-w-[460px]"
                    >
                      <p className="text-sm font-semibold text-white sm:text-base lg:text-lg">{slide.eyebrow}</p>
                      <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                        {slide.title}
                      </h1>
                      <p className="mt-2 max-w-[34rem] text-xs leading-5 text-white/88 sm:text-sm sm:leading-6 lg:text-base">
                        {slide.text}
                      </p>
                      <Link to={slide.ctaUrl || "/products"} className="mt-4 inline-flex sm:mt-5">
                        <Button className="min-h-8 rounded-full !bg-[var(--color-text)] px-5 text-sm !text-white hover:!bg-[var(--color-secondary)] sm:min-h-9 sm:px-6">
                          {slide.ctaText || "Shop Now"}
                        </Button>
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between sm:left-10 sm:right-10 lg:left-14 lg:right-14">
                <div className="flex items-center gap-4">
                  {visibleHeroSlides.map((item, index) => (
                    <button
                      key={item.title}
                      className={cn(
                        "relative grid rounded-full transition",
                        activeSlide === index
                          ? "h-8 w-8 place-items-center bg-transparent hover:bg-transparent"
                          : "h-3 w-3 bg-[#f0c353] hover:bg-[#f0c353]/85"
                      )}
                      onClick={() => setActiveSlide(index)}
                      aria-label={`Show ${item.title}`}
                    >
                      {activeSlide === index && (
                        <>
                          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
                            <circle
                              cx="16"
                              cy="16"
                              r={heroTimerRadius}
                              fill="none"
                              stroke="rgba(11,35,65,0.24)"
                              strokeWidth="3"
                            />
                            <motion.circle
                              key={`hero-timer-${activeSlide}`}
                              cx="16"
                              cy="16"
                              r={heroTimerRadius}
                              fill="none"
                              stroke="#0b2341"
                              strokeLinecap="round"
                              strokeWidth="3"
                              strokeDasharray={heroTimerCircumference}
                              initial={{ strokeDashoffset: heroTimerCircumference }}
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: heroSlideIntervalMs / 1000, ease: "linear" }}
                            />
                          </svg>
                          <span className="absolute h-2.5 w-2.5 rounded-full bg-[#f0c353]" />
                        </>
                      )}
                    </button>
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

      <section className="bg-[var(--color-surface)] pb-0 pt-3 sm:pt-4 lg:pt-5">
        <div className={homeContainer}>
          <CategoryTripleSlider
            activeIndex={activeCategory}
            categories={categories}
            loading={isLoading}
            setActiveIndex={setActiveCategory}
          />
        </div>
      </section>

      <section className="bg-[var(--color-surface)] pb-6 pt-0 sm:pb-7 lg:pb-8">
        <div className={homeContainer}>
          <SectionHeader
            eyebrow={dealConfig.section_eyebrow || "Deal of the day"}
            title={dealConfig.section_title || "Limited-time Nivaana picks"}
            linkText={dealConfig.link_text || "Shop deals"}
            linkTo="/products?collection=deals"
          />

          <div className="relative lg:px-16">
            <button
              className={cn("absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
              onClick={() => scrollDeals(-1)}
              aria-label="Previous deals"
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
            </button>

            <div
              ref={dealsScrollerRef}
              className="-mx-4 flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 scrollbar-hide touch-auto active:cursor-grabbing sm:-mx-6 sm:scroll-px-6 sm:px-6 sm:pb-4 md:gap-4 lg:mx-0 lg:scroll-px-0 lg:px-0"
              onClickCapture={(event) => {
                if (dealsDragDistanceRef.current > 8) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onPointerDown={(event) => {
                if (event.pointerType === "touch") return;
                if (event.button !== 0) return;
                dealsDragRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  scrollLeft: event.currentTarget.scrollLeft,
                  dragging: true,
                  horizontal: false,
                };
                dealsDragDistanceRef.current = 0;
              }}
              onPointerMove={(event) => {
                if (event.pointerType === "touch") return;
                if (!dealsDragRef.current.dragging) return;

                const distanceX = event.clientX - dealsDragRef.current.startX;
                const distanceY = event.clientY - dealsDragRef.current.startY;
                const absX = Math.abs(distanceX);
                const absY = Math.abs(distanceY);

                if (!dealsDragRef.current.horizontal) {
                  if (absY > 8 && absY > absX) {
                    dealsDragRef.current.dragging = false;
                    return;
                  }
                  if (absX <= 8 || absX <= absY * 1.15) return;
                  dealsDragRef.current.horizontal = true;
                }

                dealsDragDistanceRef.current = absX;
                event.preventDefault();
                event.currentTarget.scrollLeft = dealsDragRef.current.scrollLeft - distanceX;
              }}
              onPointerUp={() => {
                dealsDragRef.current.dragging = false;
                dealsDragRef.current.horizontal = false;
              }}
              onPointerCancel={() => {
                dealsDragRef.current.dragging = false;
                dealsDragRef.current.horizontal = false;
              }}
            >
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-[360px] w-[82vw] min-w-[260px] max-w-[360px] flex-none snap-start sm:w-[48vw] sm:max-w-[420px] md:w-[38vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_3rem)/4)]"
                    />
                  ))
                : dealProducts.map((product) => (
                    <DealCard key={product.id} product={product} />
                  ))}
            </div>

            <button
              className={cn("absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
              onClick={() => scrollDeals(1)}
              aria-label="Next deals"
            >
              <ChevronRight className="h-5 w-5 stroke-[2.4]" />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-surface)] pb-6 pt-0 sm:pb-7 lg:pb-8">
        <div className={homeContainer}>
          <SectionHeader
            eyebrow="Flavours"
            title="Shop by fragrance mood"
            linkText="View all flavours"
          />

          <div className="relative lg:px-16">
            <button
              className={cn("absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
              onClick={() => scrollFlavors(-1)}
              aria-label="Previous flavours"
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
            </button>

            <div
              ref={flavorsScrollerRef}
              className="-mx-4 flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 scrollbar-hide touch-auto active:cursor-grabbing sm:-mx-6 sm:scroll-px-6 sm:px-6 sm:pb-4 md:gap-4 lg:mx-0 lg:scroll-px-0 lg:px-0"
              onClickCapture={(event) => {
                if (flavorsDragDistanceRef.current > 8) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onPointerDown={(event) => {
                if (event.pointerType === "touch") return;
                if (event.button !== 0) return;
                flavorsDragRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  scrollLeft: event.currentTarget.scrollLeft,
                  dragging: true,
                  horizontal: false,
                };
                flavorsDragDistanceRef.current = 0;
              }}
              onPointerMove={(event) => {
                if (event.pointerType === "touch") return;
                if (!flavorsDragRef.current.dragging) return;

                const distanceX = event.clientX - flavorsDragRef.current.startX;
                const distanceY = event.clientY - flavorsDragRef.current.startY;
                const absX = Math.abs(distanceX);
                const absY = Math.abs(distanceY);

                if (!flavorsDragRef.current.horizontal) {
                  if (absY > 8 && absY > absX) {
                    flavorsDragRef.current.dragging = false;
                    return;
                  }
                  if (absX <= 8 || absX <= absY * 1.15) return;
                  flavorsDragRef.current.horizontal = true;
                }

                flavorsDragDistanceRef.current = absX;
                event.preventDefault();
                event.currentTarget.scrollLeft = flavorsDragRef.current.scrollLeft - distanceX;
              }}
              onPointerUp={() => {
                flavorsDragRef.current.dragging = false;
                flavorsDragRef.current.horizontal = false;
              }}
              onPointerCancel={() => {
                flavorsDragRef.current.dragging = false;
                flavorsDragRef.current.horizontal = false;
              }}
            >
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-[360px] w-[82vw] min-w-[260px] max-w-[360px] flex-none snap-start sm:w-[48vw] sm:max-w-[420px] md:w-[38vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_3rem)/4)]"
                    />
                  ))
                : flavors.map((flavor) => <FlavorCard key={flavor.id} flavor={flavor} />)}
            </div>

            <button
              className={cn("absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
              onClick={() => scrollFlavors(1)}
              aria-label="Next flavours"
            >
              <ChevronRight className="h-5 w-5 stroke-[2.4]" />
            </button>
          </div>
        </div>
      </section>

      <section className={cn(homeSection, "bg-[var(--color-surface)]")}>
        <div className={homeContainer}>
          <SectionHeader
            eyebrow={bestSellerConfig.section_eyebrow || "Best sellers"}
            title={bestSellerConfig.section_title || "Loved across daily rituals"}
            linkText={bestSellerConfig.link_text || "View products"}
            linkTo="/best-sellers"
          />

          <div className="relative lg:px-16">
            <button
              className={cn("absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
              onClick={() => scrollBestSellers(-1)}
              aria-label="Previous best sellers"
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
            </button>

            <div
              ref={bestSellersScrollerRef}
              className="-mx-4 flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 scrollbar-hide touch-auto active:cursor-grabbing sm:-mx-6 sm:scroll-px-6 sm:px-6 sm:pb-4 md:gap-4 lg:mx-0 lg:scroll-px-0 lg:px-0"
              onClickCapture={(event) => {
                if (bestSellersDragDistanceRef.current > 8) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onPointerDown={(event) => {
                if (event.pointerType === "touch") return;
                if (event.button !== 0) return;
                bestSellersDragRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  scrollLeft: event.currentTarget.scrollLeft,
                  dragging: true,
                  horizontal: false,
                };
                bestSellersDragDistanceRef.current = 0;
              }}
              onPointerMove={(event) => {
                if (event.pointerType === "touch") return;
                if (!bestSellersDragRef.current.dragging) return;

                const distanceX = event.clientX - bestSellersDragRef.current.startX;
                const distanceY = event.clientY - bestSellersDragRef.current.startY;
                const absX = Math.abs(distanceX);
                const absY = Math.abs(distanceY);

                if (!bestSellersDragRef.current.horizontal) {
                  if (absY > 8 && absY > absX) {
                    bestSellersDragRef.current.dragging = false;
                    return;
                  }
                  if (absX <= 8 || absX <= absY * 1.15) return;
                  bestSellersDragRef.current.horizontal = true;
                }

                bestSellersDragDistanceRef.current = absX;
                event.preventDefault();
                event.currentTarget.scrollLeft = bestSellersDragRef.current.scrollLeft - distanceX;
              }}
              onPointerUp={() => {
                bestSellersDragRef.current.dragging = false;
                bestSellersDragRef.current.horizontal = false;
              }}
              onPointerCancel={() => {
                bestSellersDragRef.current.dragging = false;
                bestSellersDragRef.current.horizontal = false;
              }}
            >
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-[300px] w-[72vw] min-w-[164px] max-w-[220px] flex-none snap-start sm:w-[38vw] sm:max-w-[240px] md:w-[30vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_5rem)/6)]"
                    />
                  ))
                : bestSellers.map((product) => (
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
              onClick={() => scrollBestSellers(1)}
              aria-label="Next best sellers"
            >
              <ChevronRight className="h-5 w-5 stroke-[2.4]" />
            </button>
          </div>
        </div>
      </section>

      <section className={cn(theme.layout.section, "bg-[var(--color-surface)]")}>
        <div className={homeContainer}>
          <SectionHeader
            eyebrow={newArrivalConfig.section_eyebrow || "New arrivals"}
            title={newArrivalConfig.section_title || "Freshly added to Nivaana"}
            linkText={newArrivalConfig.link_text || "Browse new"}
          />

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
              className="-mx-4 flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 scrollbar-hide touch-auto active:cursor-grabbing sm:-mx-6 sm:scroll-px-6 sm:px-6 sm:pb-4 md:gap-4 lg:mx-0 lg:scroll-px-0 lg:px-0"
              onClickCapture={(event) => {
                if (newArrivalsDragDistanceRef.current > 8) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onPointerDown={(event) => {
                if (event.pointerType === "touch") return;
                if (event.button !== 0) return;
                newArrivalsDragRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  scrollLeft: event.currentTarget.scrollLeft,
                  dragging: true,
                  horizontal: false,
                };
                newArrivalsDragDistanceRef.current = 0;
              }}
              onPointerMove={(event) => {
                if (event.pointerType === "touch") return;
                if (!newArrivalsDragRef.current.dragging) return;

                const distanceX = event.clientX - newArrivalsDragRef.current.startX;
                const distanceY = event.clientY - newArrivalsDragRef.current.startY;
                const absX = Math.abs(distanceX);
                const absY = Math.abs(distanceY);

                if (!newArrivalsDragRef.current.horizontal) {
                  if (absY > 8 && absY > absX) {
                    newArrivalsDragRef.current.dragging = false;
                    return;
                  }
                  if (absX <= 8 || absX <= absY * 1.15) return;
                  newArrivalsDragRef.current.horizontal = true;
                }

                newArrivalsDragDistanceRef.current = absX;
                event.preventDefault();
                event.currentTarget.scrollLeft = newArrivalsDragRef.current.scrollLeft - distanceX;
              }}
              onPointerUp={() => {
                newArrivalsDragRef.current.dragging = false;
                newArrivalsDragRef.current.horizontal = false;
              }}
              onPointerCancel={() => {
                newArrivalsDragRef.current.dragging = false;
                newArrivalsDragRef.current.horizontal = false;
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
        <div className={homeContainer}>
            <SectionHeader
              eyebrow={reviewConfig.section_eyebrow || "Customer reviews"}
              title={reviewConfig.section_title || "What our customers say"}
            />
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
          {[...(marqueeConfig.brand_names?.length ? marqueeConfig.brand_names : brandPartners), ...(marqueeConfig.brand_names?.length ? marqueeConfig.brand_names : brandPartners), ...(marqueeConfig.brand_names?.length ? marqueeConfig.brand_names : brandPartners)].map((brand, index) => (
            <span key={`${brand}-${index}`}>{brand}</span>
          ))}
        </div>
      </section>

    </div>
  );
};

function SectionHeader({ eyebrow, title, linkText, linkTo = "/products" }: { eyebrow: string; title: string; linkText?: string; linkTo?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-secondary)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--color-text)] sm:text-3xl">{title}</h2>
      </div>
      {linkText && (
        <Link to={linkTo} className="inline-flex shrink-0 text-sm font-bold text-[var(--color-secondary)] hover:underline">
          {linkText}
        </Link>
      )}
    </div>
  );
}

function CategoryTripleSlider({
  activeIndex,
  categories,
  loading,
  setActiveIndex,
}: {
  activeIndex: number;
  categories: CategorySlide[];
  loading: boolean;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const navigate = useNavigate();
  const dragStartRef = useRef<number | null>(null);
  const lastDragDistanceRef = useRef(0);
  const suppressClickRef = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const clickThreshold = 8;
  const swipeThreshold = 36;

  if (loading) {
    return <Skeleton className="h-[260px] rounded-[28px] sm:h-[310px]" />;
  }

  if (!categories.length) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
        Categories could not be loaded right now.
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
    <div className="relative -mx-4 overflow-hidden px-0 pb-0 pt-0 sm:-mx-6 sm:px-6 lg:-mx-8 lg:overflow-visible lg:px-24 lg:pb-0 lg:pt-1">
      <button
        className={cn("absolute left-3 top-[46%] z-20 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
        onClick={() => move(-1)}
        aria-label="Previous category"
      >
        <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
      </button>

      <motion.div
        className="relative h-[276px] cursor-grab select-none overflow-hidden touch-pan-y [perspective:1400px] active:cursor-grabbing sm:h-[324px] lg:h-[354px] lg:overflow-visible"
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {positions.map((position) => {
          const category = categories[wrapIndex(activeIndex + position, categories.length)];
          const isCenter = position === 0;
          const cardX = position === -1 ? "-112%" : position === 1 ? "12%" : "-50%";

          return (
            <motion.article
              key={category.id}
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
                suppressClickRef.current = dragDistance > clickThreshold;
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
                  navigate(category.to);
                }
              }}
              onPointerCancel={resetDrag}
              initial={false}
              animate={{
                x: isDragging ? `calc(${cardX} + ${dragOffset}px)` : cardX,
                y: isCenter ? 0 : 10,
                rotateY: 0,
                scale: isCenter ? 1 : 0.94,
                opacity: 1,
              }}
              transition={
                isDragging
                  ? { duration: 0 }
                  : {
                      type: "tween",
                      duration: 0.55,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
              className={cn(
                "absolute left-1/2 top-0 h-[262px] w-[78vw] max-w-[310px] cursor-pointer touch-pan-y overflow-hidden rounded-[22px] bg-[#efe6d4] shadow-[var(--shadow-card)] [backface-visibility:hidden] [transform-style:preserve-3d] active:cursor-grabbing sm:h-[308px] sm:w-[62vw] sm:max-w-[460px] lg:h-[338px] lg:w-[43vw] lg:max-w-[620px]",
                isCenter
                  ? "z-10 shadow-[0_20px_54px_rgba(17,24,39,0.14)]"
                  : "z-0 shadow-[0_10px_26px_rgba(17,24,39,0.06)]"
              )}
            >
              <div className="relative h-full overflow-hidden bg-[#efe6d4]">
                <motion.img
                  src={category.image}
                  alt={category.name}
                  draggable={false}
                  loading="lazy"
                  animate={{ scale: isCenter ? 1.01 : 1 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 max-w-[calc(100%-2.5rem)] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] sm:left-6 sm:right-6 sm:max-w-[76%]">
                  <p className="line-clamp-1 text-xs font-bold uppercase tracking-wide">{category.name}</p>
                  <h3 className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight sm:text-2xl">
                    {category.subcategory}
                  </h3>
                </div>
                <Button
                  type="button"
                  className="absolute right-4 top-4 h-8 rounded-full bg-[#f0c353] px-3 text-xs font-bold text-[#111827] shadow-none hover:bg-[#d99c16] hover:shadow-none sm:h-9 sm:px-4 sm:text-sm"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(category.to);
                  }}
                >
                  Explore <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      <button
        className={cn("absolute right-3 top-[46%] z-20 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
        onClick={() => move(1)}
        aria-label="Next category"
      >
        <ChevronRight className="h-5 w-5 stroke-[2.4]" />
      </button>

      <div className="mt-2 flex justify-center gap-2">
        {categories.map((category, index) => (
          <button
            key={category.id}
            className={cn(
              "h-2.5 rounded-full transition-all",
              wrapIndex(activeIndex, categories.length) === index
                ? "w-9 bg-[var(--color-secondary)]"
                : "w-2.5 bg-[var(--color-border)]"
            )}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show category ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function DealCard({ product }: { product: Product }) {
  return (
    <Link
      to="/products?collection=deals"
      className="group relative h-[360px] w-[82vw] min-w-[260px] max-w-[360px] flex-none snap-start overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)] sm:w-[48vw] sm:max-w-[420px] md:w-[38vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_3rem)/4)]"
      aria-label={`View deals for ${product.name}`}
    >
      <img
        src={productImage(product)}
        alt={product.name}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-5 pb-5 pt-16">
        <h3 className="line-clamp-2 text-xl font-extrabold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          {product.name}
        </h3>
      </div>
    </Link>
  );
}

function FlavorCard({ flavor }: { flavor: FlavorSlide }) {
  return (
    <Link
      to={flavor.to}
      className="group relative h-[360px] w-[82vw] min-w-[260px] max-w-[360px] flex-none snap-start overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)] sm:w-[48vw] sm:max-w-[420px] md:w-[38vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_3rem)/4)]"
      aria-label={`Shop ${flavor.name} products`}
    >
      <img
        src={flavor.image}
        alt={flavor.name}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-5 pb-5 pt-16">
        <p className="text-xs font-bold uppercase tracking-wide text-[#f0c353]">Flavour</p>
        <h3 className="mt-1 line-clamp-2 text-2xl font-extrabold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          {flavor.name}
        </h3>
      </div>
    </Link>
  );
}

export default Home;

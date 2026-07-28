import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Clock,
  HeartHandshake,
  Percent,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  TicketPercent,
  Truck,
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { theme } from "../config/theme.config";
import { getProductDisplayName } from "../lib/productDisplay";
import { cn } from "../lib/utils";
import { platformProductService } from "../services/productPlatformService";
import { promotionService, type Promotion } from "../services/promotionService";
import { ratingService } from "../services/ratingService";
import { storefrontPageSectionService } from "../services/storefrontPageSectionService";
import type { Product, Rating, StorefrontMedia, StorefrontPageSection } from "../types";
import {
  carFreshenerCategoryDesktop,
  carFreshenerCategoryMobile,
  fragranceBlendsCategory,
  heroPrimaryPoster,
  heroSecondaryPoster,
  heroVideoIncense,
  heroVideoLuxury,
  heroVideoPrimary,
  homeFallbackProduct,
  kitchenAccessoriesCategory,
} from "../assets/config.js";

type HeroSlide = {
  eyebrow: string;
  title: string;
  text: string;
  video: string;
  mobileVideo?: string;
  image: string;
  mobileImage?: string;
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
    video: heroVideoPrimary,
    image: "",
    poster: heroPrimaryPoster,
    fit: "cover",
    ctaText: "Shop Now",
    ctaUrl: "/products",
  },
  {
    eyebrow: "New Fragrance Edits",
    title: "A Room That Feels Like Stillness",
    text: "Layer warm woods, florals, and clean aromatics across your home with Nivaana's signature blends.",
    video: heroVideoIncense,
    image: "",
    poster: heroSecondaryPoster,
    fit: "cover",
    ctaText: "Shop Now",
    ctaUrl: "/products",
  },
  {
    eyebrow: "Luxury Home Rituals",
    title: "Let Fragrance Move Through The Space",
    text: "A cinematic Nivaana edit for incense, candles, oils, and quiet moments that make a room feel complete.",
    video: heroVideoLuxury,
    image: "",
    poster: heroSecondaryPoster,
    fit: "cover",
    ctaText: "Shop Now",
    ctaUrl: "/products",
  },
];

const marqueeBrands = Array.from({ length: 36 }, () => "NIVAANA");

const whyNivaanaFeatures = [
  {
    title: "Mood-Enhancing Scents",
    text: "Carefully layered fragrances crafted to calm the mind and transform everyday spaces.",
    icon: Sparkles,
  },
  {
    title: "Long-Lasting Freshness",
    text: "Premium blends designed to linger gently, keeping rooms, cars, and rituals fresh for longer.",
    icon: Clock,
  },
  {
    title: "Conscious Craft",
    text: "Thoughtful ingredients, dependable quality, and formulas made with everyday wellbeing in mind.",
    icon: HeartHandshake,
  },
  {
    title: "Elegant & Easy To Use",
    text: "Simple fragrance formats that fit beautifully into daily routines, gifting, and sacred moments.",
    icon: Award,
  },
];

type CustomerReview = {
  id: number;
  name: string;
  rating: number;
  review: string;
  image: string;
};

const customerReviewFallbacks: CustomerReview[] = [
  {
    id: 1,
    name: "Ananya R.",
    rating: 5,
    review:
      "From the first spray, I knew this would be a favorite. The scent is elegant, warm, and makes my room feel like a high-end boutique.",
    image: heroPrimaryPoster,
  },
  {
    id: 2,
    name: "Frieda T.",
    rating: 5,
    review:
      "This perfume is the perfect blend of freshness and warmth. I wear it every day, and people always ask what I am wearing.",
    image: fragranceBlendsCategory,
  },
  {
    id: 3,
    name: "Julene G.",
    rating: 5,
    review:
      "I have tried so many home fragrances, but this one stands out. It is soft, comforting, and stays with me all day without overpowering.",
    image: heroSecondaryPoster,
  },
  {
    id: 4,
    name: "Meera S.",
    rating: 5,
    review:
      "The incense has such a clean, calming aroma. It instantly changes the mood of the space and feels perfect for evening rituals.",
    image: carFreshenerCategoryMobile,
  },
  {
    id: 5,
    name: "Rohan M.",
    rating: 4,
    review:
      "Nivaana has become my go-to for gifting. The packaging feels premium, and the fragrances are refined without being too strong.",
    image: kitchenAccessoriesCategory,
  },
];

type CategorySlide = {
  id: string;
  name: string;
  subcategory: string;
  image: string;
  mobileImage?: string;
  mediaType?: "image" | "video";
  ctaText?: string;
  to: string;
};

type FlavorSlide = {
  id: string;
  name: string;
  image: string;
  to: string;
};

type HomeSectionConfig = {
  section_eyebrow?: string;
  section_title?: string;
  link_text?: string;
  display_limit?: number;
  product_filter?: {
    require_deal_flag?: boolean;
    include_discounted?: boolean;
    limit?: number;
  };
};

const formatLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Nivaana";

const usableImage = (images?: string[] | null) =>
  images?.find((image) => image && !/example|placeholder/i.test(image));

const productImage = (product?: Product) =>
  usableImage(product?.large) || usableImage(product?.medium) || usableImage(product?.small) || homeFallbackProduct;

const flavorListingQuery = (flavor: string) => `/products?subsubcategory=${encodeURIComponent(flavor)}`;

const toDateTimestamp = (value?: number | string | null) => {
  if (!value) return "";
  if (typeof value === "number") return value > 0 && value < 1_000_000_000_000 ? value * 1000 : value;

  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  const numericValue = Number(trimmedValue);
  if (Number.isFinite(numericValue)) {
    return numericValue > 0 && numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
  }

  const timestamp = Date.parse(trimmedValue);
  return Number.isFinite(timestamp) ? timestamp : "";
};

const formatPromotionDate = (value?: number | string | null, timeZone?: string | null) => {
  const timestamp = toDateTimestamp(value);
  if (!timestamp) return "";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(timeZone ? { timeZone } : {}),
    }).format(timestamp);
  } catch {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(timestamp);
  }
};

const promotionDiscountLabel = (promotion: Promotion) => {
  const discountType = promotion.discount_type?.toUpperCase() || promotion.type?.toUpperCase() || "";
  const actionType = promotion.action?.type?.toUpperCase() || "";
  const value = Number(promotion.discount_value ?? promotion.action?.value ?? 0);

  if (discountType.includes("FREE_SHIPPING") || actionType.includes("FREE_SHIPPING")) return "Free ship";
  if (discountType.includes("BOGO") || actionType.includes("BOGO")) return "BOGO";
  if (discountType.includes("FREE_PRODUCT") || actionType.includes("FREE_PRODUCT")) return "Free gift";
  if (discountType.includes("PERCENT") && value > 0) return `${value}% off`;
  if (value > 0) return `Rs. ${value.toLocaleString("en-IN")} off`;
  return "Special";
};

const promotionIcon = (promotion: Promotion) => {
  const type = promotion.type?.toUpperCase() || promotion.action?.type?.toUpperCase() || "";
  if (type.includes("FREE_SHIPPING")) return Truck;
  if (type.includes("PERCENT")) return Percent;
  if (type.includes("BOGO") || type.includes("FREE_PRODUCT")) return ShoppingBag;
  if (promotion.code) return TicketPercent;
  return Tag;
};

const promotionGradient = (index: number) =>
  [
    "from-[#ff6b6b] via-[#f78978] to-[#ffbd59]",
    "from-[#4ecdc4] via-[#5fbf99] to-[#f4d35e]",
    "from-[#7986cb] via-[#9c6ade] to-[#ff8fab]",
    "from-[#42a5f5] via-[#26a69a] to-[#66bb6a]",
    "from-[#fbbc05] via-[#f59e0b] to-[#ef6c57]",
  ][index % 5];

const promotionProductListPath = (promotion?: Promotion) => {
  const params = new URLSearchParams({ title: "Special Deals" });
  if (promotion?.id) params.set("offerId", String(promotion.id));
  return `/products?${params.toString()}`;
};

const categoryCarouselImages: Record<string, string> = {
  car_room_fresheners: carFreshenerCategoryDesktop,
  car_and_room_fresheners: carFreshenerCategoryDesktop,
  fragrance_blends: fragranceBlendsCategory,
  fragrance_and_blends: fragranceBlendsCategory,
  kitchen_accessories: kitchenAccessoriesCategory,
};

const categoryCarouselMobileImages: Record<string, string> = {
  car_room_fresheners: carFreshenerCategoryMobile,
  car_and_room_fresheners: carFreshenerCategoryMobile,
};

const categoryCarouselImage = (...values: Array<string | null | undefined>) =>
  values
    .map((value) => normalizeCategoryKey(value))
    .map((key) => categoryCarouselImages[key])
    .find(Boolean);

const categoryCarouselMobileImage = (...values: Array<string | null | undefined>) =>
  values
    .map((value) => normalizeCategoryKey(value))
    .map((key) => categoryCarouselMobileImages[key])
    .find(Boolean);

const normalizeCategoryKey = (value?: string | null) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const wrapIndex = (index: number, length: number) => (index + length) % length;

const reviewAuthor = (review: Rating) => review.usermail || (review.userid ? `Customer #${review.userid}` : "Verified Customer");

const carouselArrowClass =
  "h-11 w-11 place-items-center rounded-full border border-[#dedede] bg-white text-[#7a7a7a] shadow-[0_8px_22px_rgba(17,24,39,0.08)] transition duration-200 hover:border-[#cfcfcf] hover:bg-white hover:text-[#565656] hover:shadow-[0_10px_26px_rgba(17,24,39,0.12)]";
const homeContainer = "mx-auto w-full max-w-[1600px] px-2 sm:px-4 lg:px-6";
const heroContainer = "mx-auto w-full max-w-[1800px] px-3 sm:px-4 lg:px-8";
const homeSection = "py-3 sm:py-4 lg:py-5";
const fiveCardRailItem =
  "w-[66vw] min-w-[190px] max-w-[250px] flex-none snap-start sm:w-[34vw] sm:max-w-[280px] md:w-[27vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_4rem)/5)]";
const fiveCardFeatureRailItem =
  "h-[360px] w-[82vw] min-w-[260px] max-w-[360px] flex-none snap-start sm:w-[48vw] sm:max-w-[420px] md:w-[38vw] lg:w-auto lg:min-w-0 lg:max-w-none lg:basis-[calc((100%_-_4rem)/5)]";
const heroSlideIntervalMs = 8000;
const categorySlideIntervalMs = 4500;
const heroTimerRadius = 10;
const heroTimerCircumference = 2 * Math.PI * heroTimerRadius;

const orderedBySort = <T extends { sort_order?: number }>(items: T[] = []) =>
  [...items].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

const mediaUrl = (media?: StorefrontMedia) => media?.desktop_url || media?.mobile_url || "";
const mediaMobileUrl = (media?: StorefrontMedia) => media?.mobile_url || media?.desktop_url || "";
const mediaFit = (media?: StorefrontMedia): "cover" | "contain" => media?.fit === "contain" ? "contain" : "cover";
const firstStorefrontSection = (section?: StorefrontPageSection | StorefrontPageSection[]) =>
  Array.isArray(section) ? section[0] : section;

const Home: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeDeal, setActiveDeal] = useState(0);
  const [activeReview, setActiveReview] = useState(0);
  const flavorsScrollerRef = useRef<HTMLDivElement | null>(null);
  const bestSellersScrollerRef = useRef<HTMLDivElement | null>(null);
  const newArrivalsScrollerRef = useRef<HTMLDivElement | null>(null);
  const bestOfNivaanaScrollerRef = useRef<HTMLDivElement | null>(null);
  const heroSwipeRef = useRef({ startX: 0, startY: 0, swiping: false, tracking: false });
  const heroSwipeDistanceRef = useRef(0);
  const suppressHeroClickRef = useRef(false);
  const flavorsDragRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false, horizontal: false });
  const flavorsDragDistanceRef = useRef(0);
  const bestSellersDragRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false, horizontal: false });
  const bestSellersDragDistanceRef = useRef(0);
  const newArrivalsDragRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false, horizontal: false });
  const newArrivalsDragDistanceRef = useRef(0);

  const { data, isLoading } = useQuery({
    queryKey: ["home-products"],
    queryFn: () => platformProductService.getProducts(1, 100),
  });

  const ratingsQuery = useQuery({
    queryKey: ["home-ratings"],
    queryFn: () => ratingService.getRatings(1, 12),
  });

  const promotionsQuery = useQuery({
    queryKey: ["home-promotion-deals"],
    queryFn: () =>
      promotionService.list({
        channel: "web",
        geo: "IN",
        status: "active",
        visibility: "public",
        limit: 10,
      }),
  });

  const storefrontConfigQuery = useQuery({
    queryKey: ["storefront-homepage-config"],
    queryFn: () => storefrontPageSectionService.getHomepageConfig("home"),
    staleTime: 60_000,
  });

  const products = useMemo(() => data?.data ?? [], [data?.data]);
  const dealPromotions = useMemo(() => promotionsQuery.data?.data ?? [], [promotionsQuery.data?.data]);
  const storefrontSections = storefrontConfigQuery.data?.data?.sections_by_key;
  const heroSection = firstStorefrontSection(storefrontSections?.["home.hero"]);
  const showcaseSection = firstStorefrontSection(storefrontSections?.["home.showcase"]);
  const heroConfigLoading = storefrontConfigQuery.isLoading || storefrontConfigQuery.isFetching;
  const heroIntervalMs = heroSection?.attributes.interval_ms || heroSlideIntervalMs;
  const visibleHeroSlides = useMemo<HeroSlide[]>(() => {
    const slides = orderedBySort(heroSection?.attributes.slides || [])
      .filter((item) => item.title?.trim() && mediaUrl(item.media))
      .map((item, index) => {
        const primaryButton = item.button || item.buttons?.[0];
        const isVideo = item.media.type === "video";
        const desktopUrl = mediaUrl(item.media);
        const mobileUrl = mediaMobileUrl(item.media);

        return {
          eyebrow: item.eyebrow || "",
          title: item.title,
          text: item.description || "",
          video: isVideo ? desktopUrl : "",
          mobileVideo: isVideo ? mobileUrl : "",
          image: isVideo ? "" : desktopUrl,
          mobileImage: isVideo ? "" : mobileUrl,
          poster: isVideo ? heroSlides[index % heroSlides.length]?.poster || heroPrimaryPoster : desktopUrl,
          fit: mediaFit(item.media),
          ctaText: primaryButton?.label || "Shop Now",
          ctaUrl: primaryButton?.url || "/products",
        };
      });

    if (slides.length) return slides;
    return heroConfigLoading ? [] : heroSlides;
  }, [heroConfigLoading, heroSection?.attributes.slides]);
  const dealConfig: HomeSectionConfig = {};
  const categoryConfig: HomeSectionConfig = {};
  const bestSellerConfig: HomeSectionConfig = {};
  const newArrivalConfig: HomeSectionConfig = {};
  const reviewConfig: HomeSectionConfig = {};
  const apiCustomerReviews = useMemo<CustomerReview[]>(
    () =>
      (ratingsQuery.data?.data ?? [])
        .filter((review) => review.comments?.trim())
        .sort((a, b) => (b.createddate ?? 0) - (a.createddate ?? 0))
        .map((review) => ({
          id: review.id,
          name: reviewAuthor(review),
          rating: review.starrating || 5,
          review: review.comments?.trim() || "",
          image: review.url?.find(Boolean) || productImage(products.find((product) => product.id === review.productid)),
        })),
    [products, ratingsQuery.data?.data]
  );
  const customerReviews = apiCustomerReviews.length ? apiCustomerReviews : customerReviewFallbacks;

  const bestSellers = useMemo(
    () => [...products].sort((a, b) => (b.soldquantity ?? 0) - (a.soldquantity ?? 0)).slice(0, bestSellerConfig.display_limit || bestSellerConfig.product_filter?.limit || 8),
    [bestSellerConfig.display_limit, bestSellerConfig.product_filter?.limit, products]
  );

  const newArrivals = useMemo(
    () => [...products].sort((a, b) => b.createddate - a.createddate).slice(0, newArrivalConfig.display_limit || newArrivalConfig.product_filter?.limit || 10),
    [newArrivalConfig.display_limit, newArrivalConfig.product_filter?.limit, products]
  );

  const bestOfNivaanaProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => {
          const aScore = (a.soldquantity ?? 0) + (a.averagerating ?? 0) * 10 + (a.discount > 0 ? 8 : 0);
          const bScore = (b.soldquantity ?? 0) + (b.averagerating ?? 0) * 10 + (b.discount > 0 ? 8 : 0);
          return bScore - aScore;
        })
        .slice(0, 8),
    [products]
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
            to: flavorListingQuery(flavor),
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
          image: categoryCarouselImage(category, subcategory) || productImage(product),
          mobileImage: categoryCarouselMobileImage(category, subcategory),
          to: `/products?${params.toString()}`,
        });
      }
    });

    const fromApi = Array.from(categoryMap.values())
      .filter((category) => {
        const categoryKey = normalizeCategoryKey(category.name);
        const subcategoryKey = normalizeCategoryKey(category.subcategory);
        return categoryKey !== "home_decor" && subcategoryKey !== "home_decor";
      })
      .sort((a, b) => {
        const aHasUploadedImage = Boolean(categoryCarouselImage(a.name, a.subcategory));
        const bHasUploadedImage = Boolean(categoryCarouselImage(b.name, b.subcategory));
        if (aHasUploadedImage !== bHasUploadedImage) return aHasUploadedImage ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);
    return fromApi;
  }, [categoryConfig.display_limit, categoryConfig.product_filter?.limit, products]);

  const showcaseSlides = useMemo<CategorySlide[]>(() => {
    const items = orderedBySort(showcaseSection?.attributes.items || [])
      .filter((item) => item.title?.trim() && mediaUrl(item.media))
      .map((item, index) => ({
        id: `showcase:${index}:${item.title}`,
        name: item.eyebrow || "Nivaana",
        subcategory: item.title,
        image: mediaUrl(item.media),
        mobileImage: mediaMobileUrl(item.media),
        mediaType: item.media.type || "image",
        ctaText: item.button?.label || "Explore",
        to: item.button?.url || "/products",
      }));

    return items.length ? items : categories;
  }, [categories, showcaseSection?.attributes.items]);

  const slide = visibleHeroSlides[wrapIndex(activeSlide, visibleHeroSlides.length)];

  useEffect(() => {
    if (visibleHeroSlides.length <= 1) return;

    const timer = window.setTimeout(() => {
      setActiveSlide((current) => wrapIndex(current + 1, visibleHeroSlides.length));
    }, heroIntervalMs);

    return () => window.clearTimeout(timer);
  }, [activeSlide, heroIntervalMs, visibleHeroSlides.length]);

  useEffect(() => {
    if (activeSlide >= visibleHeroSlides.length) {
      setActiveSlide(0);
    }
  }, [activeSlide, visibleHeroSlides.length]);

  useEffect(() => {
    if (activeCategory >= showcaseSlides.length) {
      setActiveCategory(0);
    }
  }, [activeCategory, showcaseSlides.length]);

  useEffect(() => {
    if (showcaseSlides.length <= 1) return;

    const timer = window.setTimeout(() => {
      setActiveCategory((current) => wrapIndex(current + 1, showcaseSlides.length));
    }, categorySlideIntervalMs);

    return () => window.clearTimeout(timer);
  }, [activeCategory, showcaseSlides.length]);

  useEffect(() => {
    if (dealPromotions.length <= 1) return;

    const timer = window.setTimeout(() => {
      setActiveDeal((current) => wrapIndex(current + 1, dealPromotions.length));
    }, categorySlideIntervalMs);

    return () => window.clearTimeout(timer);
  }, [activeDeal, dealPromotions.length]);

  const moveHeroSlide = (direction: number) => {
    setActiveSlide((current) => wrapIndex(current + direction, visibleHeroSlides.length));
  };

  const moveReview = (direction: number) => {
    if (!customerReviews.length) return;
    setActiveReview((current) => wrapIndex(current + direction, customerReviews.length));
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

  const scrollBestOfNivaana = (direction: number) => {
    const scroller = bestOfNivaanaScrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.9, 360),
      behavior: "smooth",
    });
  };

  const activeCustomerReview = customerReviews.length
    ? customerReviews[wrapIndex(activeReview, customerReviews.length)]
    : undefined;
  const visibleCustomerReviews = customerReviews.length
    ? [0, 1, 2].map((offset) => customerReviews[wrapIndex(activeReview + offset, customerReviews.length)])
    : [];
  const showHeroSkeleton = !visibleHeroSlides.length;

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white pb-3 pt-3 sm:pb-4 sm:pt-5 lg:pb-5 lg:pt-6">
        <div className={heroContainer}>
          <div className="relative w-full overflow-hidden rounded-[22px] bg-white shadow-[var(--shadow-card)] sm:rounded-[28px] lg:rounded-[34px]">
            {showHeroSkeleton ? (
              <Skeleton className="h-[52svh] min-h-[320px] max-h-[420px] w-full sm:h-[calc(100svh-15rem)] sm:min-h-[400px] sm:max-h-[540px] md:min-h-[440px] lg:h-[calc(100svh-20rem)] lg:min-h-[460px] lg:max-h-[560px]" />
            ) : (
              <div
                className="relative h-[52svh] min-h-[320px] max-h-[420px] touch-pan-y select-none sm:h-[calc(100svh-15rem)] sm:min-h-[400px] sm:max-h-[540px] md:min-h-[440px] lg:h-[calc(100svh-20rem)] lg:min-h-[460px] lg:max-h-[560px]"
              onClickCapture={(event) => {
                if (suppressHeroClickRef.current) {
                  if (event.cancelable) event.preventDefault();
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
                      <picture>
                        {item.mobileImage && <source media="(max-width: 767px)" srcSet={item.mobileImage} />}
                        <img
                          src={item.image || item.poster}
                          alt=""
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-0 h-full w-full",
                            item.fit === "cover" ? "object-cover" : "object-contain"
                          )}
                        />
                      </picture>
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
                        <Button className="min-h-8 rounded-full !bg-[var(--color-primary)] px-5 text-sm font-semibold !text-black hover:!bg-[var(--color-primary)]/90 sm:min-h-9 sm:px-6">
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
                          : "h-3 w-3 bg-[#fbbc05] hover:bg-[#fbbc05]/85"
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
                              stroke="rgba(255,255,255,0.32)"
                              strokeWidth="3"
                            />
                            <motion.circle
                              key={`hero-timer-${activeSlide}`}
                              cx="16"
                              cy="16"
                              r={heroTimerRadius}
                              fill="none"
                              stroke="#ffffff"
                              strokeLinecap="round"
                              strokeWidth="3"
                              strokeDasharray={heroTimerCircumference}
                              initial={{ strokeDashoffset: heroTimerCircumference }}
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: heroIntervalMs / 1000, ease: "linear" }}
                            />
                          </svg>
                          <span className="absolute h-2.5 w-2.5 rounded-full bg-[#fbbc05]" />
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white pb-0 pt-3 sm:pt-4 lg:pt-5">
        <div className={homeContainer}>
          <CategoryTripleSlider
            activeIndex={activeCategory}
            categories={showcaseSlides}
            loading={isLoading}
            setActiveIndex={setActiveCategory}
          />
        </div>
      </section>

      <section className="bg-white pb-3 pt-0 sm:pb-4 lg:pb-5">
        <div className={homeContainer}>
          <SectionHeader
            eyebrow={dealConfig.section_eyebrow || "Deals for you"}
            title={dealConfig.section_title || "Limited-time Nivaana offers"}
            linkText={dealConfig.link_text || "Shop deals"}
            linkTo={promotionProductListPath()}
          />

          <DealTripleSlider
            activeIndex={activeDeal}
            loading={promotionsQuery.isLoading}
            promotions={dealPromotions}
            setActiveIndex={setActiveDeal}
          />
        </div>
      </section>

      <section className={cn(homeSection, "bg-white")}>
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
                  if (event.cancelable) event.preventDefault();
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
                if (event.cancelable) event.preventDefault();
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
                      className={cn("min-h-[380px]", fiveCardRailItem)}
                    />
                  ))
                : bestSellers.map((product) => (
                    <div
                      key={product.id}
                      className={fiveCardRailItem}
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

      <section className={cn(homeSection, "bg-white")}>
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
                  if (event.cancelable) event.preventDefault();
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
                if (event.cancelable) event.preventDefault();
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
                      className={cn("min-h-[380px]", fiveCardRailItem)}
                    />
                  ))
                : newArrivals.map((product) => (
                    <div
                      key={product.id}
                      className={fiveCardRailItem}
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

      <section className={cn(homeSection, "bg-white")}>
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
                  if (event.cancelable) event.preventDefault();
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
                if (event.cancelable) event.preventDefault();
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
                      className={fiveCardFeatureRailItem}
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

      <BestOfNivaanaSection
        loading={isLoading}
        products={bestOfNivaanaProducts}
        scrollerRef={bestOfNivaanaScrollerRef}
        onScroll={scrollBestOfNivaana}
      />

      <WhyNivaanaSection />
      <MidPromoBanner />

      {activeCustomerReview && (
        <section className="bg-white py-10 sm:py-12 lg:py-14">
          <div className={homeContainer}>
            <div className="mb-8 flex items-center justify-between gap-4 sm:mb-10">
              <h2 className="text-3xl font-bold leading-tight text-[var(--color-text)] sm:text-4xl">
                {reviewConfig.section_title || "Real Customers, Real Reviews"}
              </h2>

              {customerReviews.length > 1 && (
                <div className="hidden shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-white shadow-[0_8px_20px_rgba(17,24,39,0.06)] sm:flex">
                  <button
                    type="button"
                    className="grid h-12 w-12 place-items-center bg-white text-[#b8b8b8] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                    onClick={() => moveReview(-1)}
                    aria-label="Previous review"
                  >
                    <ChevronLeft className="h-6 w-6 stroke-[2.8]" />
                  </button>
                  <button
                    type="button"
                    className="grid h-12 w-12 place-items-center bg-white text-[#777777] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                    onClick={() => moveReview(1)}
                    aria-label="Next review"
                  >
                    <ChevronRight className="h-6 w-6 stroke-[2.8]" />
                  </button>
                </div>
              )}
            </div>

            <div className="md:hidden">
              <ReviewCard review={activeCustomerReview} />

              {customerReviews.length > 1 && (
                <div className="mt-10 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[#777777] shadow-[0_8px_20px_rgba(17,24,39,0.06)]"
                    onClick={() => moveReview(-1)}
                    aria-label="Previous review"
                  >
                    <ChevronLeft className="h-5 w-5 stroke-[2.8]" />
                  </button>
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[#777777] shadow-[0_8px_20px_rgba(17,24,39,0.06)]"
                    onClick={() => moveReview(1)}
                    aria-label="Next review"
                  >
                    <ChevronRight className="h-5 w-5 stroke-[2.8]" />
                  </button>
                </div>
              )}
            </div>

            <div className="hidden grid-cols-3 gap-6 md:grid xl:gap-8">
              {visibleCustomerReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden border-y border-[var(--color-border)] bg-white py-5">
        <div className="flex w-max animate-[marquee_26s_linear_infinite] gap-10 whitespace-nowrap text-sm font-bold tracking-[0.2em] text-[var(--color-secondary)] hover:[animation-play-state:paused]">
          {marqueeBrands.map((brand, index) => (
            <span key={`${brand}-${index}`}>{brand}</span>
          ))}
        </div>
      </section>

    </div>
  );
};

function ReviewCard({ review }: { review: CustomerReview }) {
  const rating = Math.max(1, Math.min(review.rating, 5));

  return (
    <article className="relative mx-auto flex min-h-[320px] w-full max-w-[640px] flex-col items-center justify-start rounded-[18px] border border-[#e7e7e7] bg-white px-6 pb-16 pt-8 text-center shadow-[0_14px_34px_rgba(17,24,39,0.04)] sm:min-h-[350px] sm:px-8 lg:px-10">
      <div className="mb-3 flex justify-center gap-1 text-[var(--color-text)]">
        {Array.from({ length: rating }).map((_, star) => (
          <Star key={star} className="h-5 w-5 fill-current stroke-[2.4]" />
        ))}
      </div>

      <p className="mx-auto line-clamp-5 max-w-[30rem] text-base font-medium leading-7 text-[#727272] sm:text-lg sm:leading-8">
        {review.review}
      </p>

      <p className="mt-6 max-w-full break-words text-lg font-extrabold text-[var(--color-text)] sm:text-xl">
        {review.name}
      </p>

      <span className="pointer-events-none absolute bottom-9 right-7 text-7xl font-black leading-none text-[#eeeeee]" aria-hidden="true">
        "
      </span>

      <div className="absolute -bottom-9 left-1/2 grid h-[76px] w-[76px] -translate-x-1/2 place-items-center overflow-hidden rounded-full border-4 border-white bg-[var(--color-surface)] shadow-[0_8px_22px_rgba(17,24,39,0.12)] sm:h-[88px] sm:w-[88px]">
        <img src={review.image} alt="" aria-hidden="true" loading="lazy" className="h-full w-full object-cover" />
      </div>
    </article>
  );
}

function MidPromoBanner() {
  return (
    <section className="bg-white py-8 sm:py-10 lg:py-12">
      <div className={homeContainer}>
        <Link
          to="/products"
          className="group relative block min-h-[360px] overflow-hidden rounded-[22px] bg-[#f3f2ef] shadow-[0_18px_46px_rgba(17,24,39,0.08)] sm:min-h-[420px] lg:min-h-[500px] lg:rounded-[30px]"
          aria-label="Discover Nivaana car and room fresheners"
        >
          <picture>
            <source media="(min-width: 1024px)" srcSet={carFreshenerCategoryDesktop} />
            <img
              src={carFreshenerCategoryMobile}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.02]"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/68 to-white/10" />
          <div className="relative z-10 flex min-h-[360px] max-w-[560px] flex-col justify-center px-7 py-10 sm:min-h-[420px] sm:px-12 lg:min-h-[500px] lg:px-20">
            <p className="text-xl font-bold text-black sm:text-2xl">
              Upto 30% Off
            </p>
            <h2 className="mt-6 text-4xl font-extrabold leading-tight text-[var(--color-text)] sm:text-5xl lg:text-6xl">
              Uncover the Essence of You
            </h2>
            <span className="mt-8 inline-flex w-fit items-center justify-center rounded-full bg-[var(--color-text)] px-8 py-4 text-base font-bold text-white transition group-hover:bg-[var(--color-secondary)] sm:text-lg">
              Discover More
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

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

function WhyNivaanaSection() {
  return (
    <section className="bg-white pb-6 pt-8 sm:pb-8 sm:pt-10 lg:pb-10 lg:pt-12">
      <div className={homeContainer}>
        <h2 className="text-center text-3xl font-bold leading-tight text-[var(--color-text)] sm:text-4xl">
          Why Nivaana?
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {whyNivaanaFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="flex min-h-[240px] flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-primary)]/35 bg-white px-5 py-8 text-center shadow-[0_18px_45px_rgba(51,64,93,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-primary)]/70 hover:shadow-[var(--shadow-hover)]"
              >
                <span className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-surface)] text-[var(--color-secondary)]">
                  <Icon className="h-9 w-9" strokeWidth={1.9} />
                </span>
                <h3 className="mt-6 text-xl font-bold leading-tight text-[var(--color-text)]">
                  {feature.title}
                </h3>
                <p className="mt-3 max-w-[18rem] text-base leading-7 text-[var(--color-muted)]">
                  {feature.text}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
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
  const pendingClickCategoryRef = useRef<CategorySlide | null>(null);
  const suppressClickRef = useRef(false);
  const wheelLockRef = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const clickThreshold = 8;
  const swipeThreshold = 36;
  const wheelThreshold = 28;

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

  const openCategory = (category: CategorySlide) => {
    navigate(category.to);
  };

  const resetDrag = () => {
    dragStartRef.current = null;
    pendingClickCategoryRef.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  const normalizedActiveIndex = wrapIndex(activeIndex, categories.length);
  const positions = categories.length >= 3 ? [-1, 0, 1] : categories.length === 2 ? [0, 1] : [0];
  const sideCardScale = 0.9;
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
            if (event.cancelable) event.preventDefault();
            event.stopPropagation();
          }
        }}
        onWheel={(event) => {
          if (wheelLockRef.current) return;
          if (Math.abs(event.deltaX) < wheelThreshold || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.2) return;

          if (event.cancelable) event.preventDefault();
          wheelLockRef.current = true;
          move(event.deltaX > 0 ? 1 : -1);
          window.setTimeout(() => {
            wheelLockRef.current = false;
          }, 520);
        }}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;

          const card = (event.target as HTMLElement).closest<HTMLElement>("[data-category-index]");
          const categoryIndex = card?.dataset.categoryIndex ? Number(card.dataset.categoryIndex) : NaN;

          dragStartRef.current = event.clientX;
          pendingClickCategoryRef.current = Number.isFinite(categoryIndex) ? categories[categoryIndex] : null;
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
          const pendingCategory = pendingClickCategoryRef.current;

          lastDragDistanceRef.current = dragDistance;
          suppressClickRef.current = dragDistance > clickThreshold;
          resetDrag();

          if (pendingCategory && dragDistance <= clickThreshold) {
            openCategory(pendingCategory);
            return;
          }

          if (distance < -swipeThreshold) {
            move(1);
          }

          if (distance > swipeThreshold) {
            move(-1);
          }
        }}
        onPointerCancel={resetDrag}
      >
        {positions.map((position) => {
          const categoryIndex = wrapIndex(normalizedActiveIndex + position, categories.length);
          const category = categories[categoryIndex];
          const isCenter = position === 0;
          const cardX = position === -1 ? "-112%" : position === 1 ? "12%" : "-50%";

          return (
            <motion.article
              key={category.id || categoryIndex}
              data-category-index={categoryIndex}
              role="link"
              tabIndex={0}
              aria-label={`Explore ${category.subcategory}`}
              initial={false}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCategory(category);
                }
              }}
              animate={{
                x: isDragging ? `calc(${cardX} + ${dragOffset}px)` : cardX,
                y: 0,
                rotateY: 0,
                scale: isCenter ? 1 : sideCardScale,
                opacity: isCenter ? 1 : 0.86,
              }}
              transition={
                isDragging
                  ? { duration: 0 }
                  : {
                      type: "tween",
                      duration: 0.95,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
              className={cn(
                "absolute left-1/2 top-0 h-[262px] w-[78vw] max-w-[310px] origin-center cursor-pointer touch-pan-y overflow-hidden rounded-[22px] bg-white shadow-[var(--shadow-card)] [backface-visibility:hidden] [transform-style:preserve-3d] active:cursor-grabbing sm:h-[308px] sm:w-[62vw] sm:max-w-[460px] lg:h-[338px] lg:w-[43vw] lg:max-w-[620px]",
                isCenter
                  ? "z-10 shadow-[0_20px_54px_rgba(17,24,39,0.14)]"
                  : "z-0 shadow-[0_10px_26px_rgba(17,24,39,0.06)]"
              )}
            >
              <div className="relative h-full overflow-hidden bg-white">
                {category.mediaType === "video" ? (
                  <motion.video
                    src={category.image}
                    aria-label={category.name}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload={isCenter ? "auto" : "metadata"}
                    animate={{ scale: isCenter ? 1.01 : 1 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="pointer-events-none h-full w-full object-cover object-center"
                  />
                ) : (
                  <picture>
                    <source media="(min-width: 1024px)" srcSet={category.image} />
                    <motion.img
                      src={category.mobileImage || category.image}
                      alt={category.name}
                      draggable={false}
                      loading="lazy"
                      animate={{ scale: isCenter ? 1.01 : 1 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-none h-full w-full object-cover object-center"
                    />
                  </picture>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 z-10 max-w-[calc(100%-2.5rem)] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] sm:left-6 sm:right-6 sm:max-w-[76%]">
                  <p className="line-clamp-1 text-xs font-bold uppercase tracking-wide">{category.name}</p>
                  <h3 className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight sm:text-2xl">
                    {category.subcategory}
                  </h3>
                </div>
                <Button
                  type="button"
                  className={cn(
                    "absolute right-4 top-4 z-10 h-8 rounded-full bg-[#fbbc05] px-3 text-xs font-bold text-[#111827] shadow-none transition-opacity hover:bg-[#d99c16] hover:shadow-none sm:h-9 sm:px-4 sm:text-sm",
                    isCenter ? "opacity-100" : "pointer-events-none opacity-0"
                  )}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    openCategory(category);
                  }}
                >
                  {category.ctaText || "Explore"} <ChevronRight className="ml-1 h-3.5 w-3.5" />
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

function DealTripleSlider({
  activeIndex,
  loading,
  promotions,
  setActiveIndex,
}: {
  activeIndex: number;
  loading: boolean;
  promotions: Promotion[];
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const navigate = useNavigate();
  const dragStartRef = useRef<number | null>(null);
  const lastDragDistanceRef = useRef(0);
  const pendingClickPromotionRef = useRef<Promotion | null>(null);
  const suppressClickRef = useRef(false);
  const wheelLockRef = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const clickThreshold = 8;
  const swipeThreshold = 36;
  const wheelThreshold = 28;

  if (loading) {
    return <Skeleton className="h-[300px] rounded-[28px] sm:h-[340px] lg:h-[390px]" />;
  }

  if (!promotions.length) return null;

  const move = (direction: number) => {
    setActiveIndex((current) => current + direction);
  };

  const openDealsPage = (promotion: Promotion) => {
    if (suppressClickRef.current || lastDragDistanceRef.current > clickThreshold) {
      suppressClickRef.current = false;
      return;
    }

    navigate(promotionProductListPath(promotion));
  };

  const resetDrag = () => {
    dragStartRef.current = null;
    pendingClickPromotionRef.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  const positions = promotions.length >= 3 ? [-1, 0, 1] : promotions.length === 2 ? [0, 1] : [0];
  const sideCardScale = 0.88;

  return (
    <div className="relative -mx-4 overflow-hidden px-0 pb-0 pt-0 sm:-mx-6 sm:px-6 lg:-mx-8 lg:overflow-visible lg:px-24 lg:pb-0 lg:pt-1">
      <button
        className={cn("absolute left-3 top-[46%] z-20 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
        onClick={() => move(-1)}
        aria-label="Previous deals"
      >
        <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
      </button>

      <motion.div
        className="relative h-[312px] cursor-grab select-none overflow-hidden touch-pan-y [perspective:1400px] active:cursor-grabbing sm:h-[352px] lg:h-[402px] lg:overflow-visible"
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            if (event.cancelable) event.preventDefault();
            event.stopPropagation();
          }
        }}
        onWheel={(event) => {
          if (wheelLockRef.current) return;
          if (Math.abs(event.deltaX) < wheelThreshold || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.2) return;

          if (event.cancelable) event.preventDefault();
          wheelLockRef.current = true;
          move(event.deltaX > 0 ? 1 : -1);
          window.setTimeout(() => {
            wheelLockRef.current = false;
          }, 520);
        }}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;

          const card = (event.target as HTMLElement).closest<HTMLElement>("[data-promotion-index]");
          const promotionIndex = card?.dataset.promotionIndex ? Number(card.dataset.promotionIndex) : NaN;

          dragStartRef.current = event.clientX;
          pendingClickPromotionRef.current = Number.isFinite(promotionIndex) ? promotions[promotionIndex] : null;
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
        onPointerUp={() => {
          if (dragStartRef.current === null) return;
          const distance = dragOffset;
          const dragDistance = Math.abs(distance);
          const pendingPromotion = pendingClickPromotionRef.current;

          lastDragDistanceRef.current = dragDistance;
          suppressClickRef.current = dragDistance > clickThreshold;
          resetDrag();

          if (pendingPromotion && dragDistance <= clickThreshold) {
            openDealsPage(pendingPromotion);
            return;
          }

          if (distance < -swipeThreshold) {
            move(1);
          }

          if (distance > swipeThreshold) {
            move(-1);
          }
        }}
        onPointerCancel={resetDrag}
      >
        {positions.map((position) => {
          const promotionIndex = wrapIndex(activeIndex + position, promotions.length);
          const promotion = promotions[promotionIndex];
          const isCenter = position === 0 || promotions.length === 1;
          const cardX = promotions.length === 1 ? "-50%" : position === -1 ? "-112%" : position === 1 ? "12%" : "-50%";

          return (
            <motion.div
              key={promotion.id}
              data-promotion-index={promotionIndex}
              role="link"
              tabIndex={0}
              initial={false}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(promotionProductListPath(promotion));
                }
              }}
              animate={{
                x: isDragging ? `calc(${cardX} + ${dragOffset}px)` : cardX,
                y: 0,
                rotateY: 0,
                scale: isCenter ? 1 : sideCardScale,
                opacity: 1,
              }}
              transition={
                isDragging
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 145,
                      damping: 24,
                      mass: 0.9,
                    }
              }
              className={cn(
                "absolute left-1/2 top-0 h-[296px] w-[78vw] max-w-[330px] origin-center cursor-pointer touch-pan-y will-change-transform [backface-visibility:hidden] [transform-style:preserve-3d] sm:h-[336px] sm:w-[62vw] sm:max-w-[480px] lg:h-[386px] lg:w-[40vw] lg:max-w-[560px]",
                isCenter ? "z-10" : "z-0"
              )}
            >
              <DealCard
                promotion={promotion}
                index={promotionIndex}
                className="h-full w-full"
                onOpenDeals={() => openDealsPage(promotion)}
              />
            </motion.div>
          );
        })}
      </motion.div>

      <button
        className={cn("absolute right-3 top-[46%] z-20 hidden -translate-y-1/2 lg:grid", carouselArrowClass)}
        onClick={() => move(1)}
        aria-label="Next deals"
      >
        <ChevronRight className="h-5 w-5 stroke-[2.4]" />
      </button>

      <div className="mt-2 flex justify-center gap-2">
        {promotions.map((promotion, index) => (
          <button
            key={promotion.id}
            className={cn(
              "h-2.5 rounded-full transition-all",
              wrapIndex(activeIndex, promotions.length) === index
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

function BestOfNivaanaSection({
  loading,
  products,
  scrollerRef,
  onScroll,
}: {
  loading: boolean;
  products: Product[];
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (direction: number) => void;
}) {
  const dragRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false, horizontal: false });
  const dragDistanceRef = useRef(0);

  if (!loading && !products.length) return null;

  return (
    <section className="bg-white pb-4 pt-0 sm:pb-5 lg:pb-6">
      <div className={homeContainer}>
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5 sm:gap-4">
          <h2 className="min-w-0 text-3xl font-bold leading-tight text-[var(--color-text)] sm:text-4xl">
            Best of Nivaana
          </h2>

          <div className="hidden shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-white shadow-[0_8px_20px_rgba(17,24,39,0.06)] sm:flex">
            <button
              type="button"
              className="grid h-11 w-12 place-items-center bg-white text-[#777777] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
              onClick={() => onScroll(-1)}
              aria-label="Previous best of Nivaana"
            >
              <ChevronLeft className="h-6 w-6 stroke-[2.8]" />
            </button>
            <button
              type="button"
              className="grid h-11 w-12 place-items-center bg-white text-[#777777] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
              onClick={() => onScroll(1)}
              aria-label="Next best of Nivaana"
            >
              <ChevronRight className="h-6 w-6 stroke-[2.8]" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="-mx-4 flex cursor-grab snap-x snap-mandatory select-none gap-4 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-2 scrollbar-hide touch-pan-y active:cursor-grabbing sm:-mx-6 sm:gap-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:gap-8 lg:scroll-px-0 lg:px-0"
          onClickCapture={(event) => {
            if (dragDistanceRef.current > 8) {
              if (event.cancelable) event.preventDefault();
              event.stopPropagation();
            }
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "touch") return;
            if (event.button !== 0) return;

            dragRef.current = {
              startX: event.clientX,
              startY: event.clientY,
              scrollLeft: event.currentTarget.scrollLeft,
              dragging: true,
              horizontal: false,
            };
            dragDistanceRef.current = 0;
          }}
          onPointerMove={(event) => {
            if (event.pointerType === "touch") return;
            if (!dragRef.current.dragging) return;

            const distanceX = event.clientX - dragRef.current.startX;
            const distanceY = event.clientY - dragRef.current.startY;
            const absX = Math.abs(distanceX);
            const absY = Math.abs(distanceY);

            if (!dragRef.current.horizontal) {
              if (absY > 8 && absY > absX) {
                dragRef.current.dragging = false;
                return;
              }
              if (absX <= 8 || absX <= absY * 1.15) return;
              dragRef.current.horizontal = true;
            }

            dragDistanceRef.current = absX;
            if (event.cancelable) event.preventDefault();
            event.currentTarget.scrollLeft = dragRef.current.scrollLeft - distanceX;
          }}
          onPointerUp={() => {
            dragRef.current.dragging = false;
            dragRef.current.horizontal = false;
          }}
          onPointerCancel={() => {
            dragRef.current.dragging = false;
            dragRef.current.horizontal = false;
          }}
        >
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-[420px] w-[84vw] max-w-[420px] flex-none snap-start rounded-[22px] sm:h-[520px] sm:w-[48vw] sm:max-w-[560px] lg:w-auto lg:max-w-none lg:basis-[calc((100%_-_4rem)/3)] xl:h-[640px]"
                />
              ))
            : products.map((product) => <BestOfNivaanaCard key={product.id} product={product} />)}
        </div>

        <div className="mt-6 flex justify-center gap-3 sm:hidden">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[#777777] shadow-[0_8px_20px_rgba(17,24,39,0.06)]"
            onClick={() => onScroll(-1)}
            aria-label="Previous best of Nivaana"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.8]" />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[#777777] shadow-[0_8px_20px_rgba(17,24,39,0.06)]"
            onClick={() => onScroll(1)}
            aria-label="Next best of Nivaana"
          >
            <ChevronRight className="h-5 w-5 stroke-[2.8]" />
          </button>
        </div>
      </div>
    </section>
  );
}

function BestOfNivaanaCard({ product }: { product: Product }) {
  const displayName = getProductDisplayName(product);

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative h-[420px] w-[84vw] max-w-[420px] flex-none snap-start overflow-hidden rounded-[18px] bg-white transition duration-300 hover:-translate-y-0.5 sm:h-[520px] sm:w-[48vw] sm:max-w-[560px] sm:rounded-[22px] lg:w-auto lg:max-w-none lg:basis-[calc((100%_-_4rem)/3)] xl:h-[640px]"
      aria-label={`View ${displayName}`}
      draggable={false}
    >
      <img
        src={productImage(product)}
        alt={displayName}
        loading="lazy"
        draggable={false}
        className="pointer-events-none h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.03]"
      />
    </Link>
  );
}

function DealCard({
  promotion,
  index,
  className,
  onOpenDeals,
}: {
  promotion: Promotion;
  index: number;
  className?: string;
  onOpenDeals?: () => void;
}) {
  const Icon = promotionIcon(promotion);
  const discountLabel = promotionDiscountLabel(promotion);
  const validity = formatPromotionDate(promotion.end_date, promotion.timezone);

  return (
    <article
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-[28px] border border-white/45 bg-gradient-to-br text-white shadow-[0_16px_38px_rgba(17,24,39,0.11)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(17,24,39,0.15)]",
        promotionGradient(index),
        className
      )}
      aria-label={`View deal ${promotion.name}`}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.28),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent_45%)]" />

      <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/20">
            <Icon className="h-6 w-6 stroke-[2.4]" />
          </span>
          <span className="max-w-[48%] rounded-[14px] bg-white/18 px-4 py-2 text-center text-xs font-extrabold uppercase tracking-[0.08em] text-white ring-1 ring-white/24 sm:text-sm">
            {discountLabel}
          </span>
        </div>

        <div className="mt-6 min-h-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">Exclusive offer</p>
          <h3 className="mt-2 line-clamp-2 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            {promotion.name}
          </h3>
          {promotion.description && (
            <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-white/85 sm:text-base">
              {promotion.description}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
          <div className="min-w-0 space-y-2">
            {promotion.code ? (
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/16 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white ring-1 ring-white/24">
                <TicketPercent className="h-4 w-4 shrink-0" />
                <span className="truncate">{promotion.code}</span>
              </div>
            ) : (
              validity && <p className="text-sm font-semibold italic text-white/80">Valid until {validity}</p>
            )}
            {promotion.code && validity && <p className="text-xs font-semibold italic text-white/75">Valid until {validity}</p>}
          </div>

          <button
            type="button"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-white px-5 text-sm font-extrabold text-[#20242e] shadow-[0_8px_18px_rgba(17,24,39,0.18)] transition hover:bg-[#fff7d6]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpenDeals?.();
            }}
          >
            Shop deals
            <ChevronRight className="ml-1.5 h-4 w-4 stroke-[2.6]" />
          </button>
        </div>
      </div>
    </article>
  );
}
function FlavorCard({ flavor }: { flavor: FlavorSlide }) {
  return (
    <Link
      to={flavor.to}
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]",
        fiveCardFeatureRailItem
      )}
      aria-label={`Shop ${flavor.name} products`}
    >
      <img
        src={flavor.image}
        alt={flavor.name}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-5 pb-5 pt-16">
        <p className="text-xs font-bold uppercase tracking-wide text-[#fbbc05]">Flavour</p>
        <h3 className="mt-1 line-clamp-2 text-2xl font-extrabold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          {flavor.name}
        </h3>
      </div>
    </Link>
  );
}

export default Home;

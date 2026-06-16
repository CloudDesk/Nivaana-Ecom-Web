import {
  Car,
  Flame,
  Flower2,
  Gift,
  HeartHandshake,
  Home,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import fallbackProduct from "../assets/Gemini_Generated_Image_fmqf65fmqf65fmqf.png";
import type { Product } from "../types";

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

const normalizeFilterKey = (value?: string | null) =>
  normalize(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");

const normalizeSearchText = (value?: string | null) =>
  normalize(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const filterKeyVariants = (value?: string | null) => {
  const key = normalizeFilterKey(value);
  if (!key) return new Set<string>();

  return new Set([key, key.replace(/(^|_)and(_|$)/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_")]);
};

const routeAliases: Record<string, string[]> = {
  aromatherapy_wellness: ["aromatherapy_&_wellness"],
  car_room_fresheners: ["car_&_room_fresheners"],
  dhoops: ["dhoop_sticks", "premium_dhoop_sticks"],
  gift_collections: ["home_decor"],
  havan_cups: ["premium_havan_cups"],
  home_decor: ["gift_collections"],
  premium_room_mist: ["room_fresheners", "room_freshners"],
  wardrobe_sachets: ["fragrance_sachets"],
};

const routeVariants = (value?: string | null) => {
  const keys = new Set(filterKeyVariants(value));

  [...keys].forEach((key) => {
    routeAliases[key]?.forEach((alias) => {
      filterKeyVariants(alias).forEach((aliasKey) => keys.add(aliasKey));
    });
  });

  return keys;
};

const routeValueMatches = (left?: string | null, right?: string | null) =>
  Boolean(left && right) && [...filterKeyVariants(left)].some((key) => routeVariants(right).has(key));

const firstProductImage = (product?: Product) =>
  product?.large?.[0] || product?.medium?.[0] || product?.small?.[0] || fallbackProduct;

const productSearchText = (product?: Product | null) =>
  normalizeSearchText(
    [
      product?.name,
      product?.category,
      product?.subcategory,
      product?.subsubcategory,
      product?.fragnancetype,
    ]
      .filter(Boolean)
      .join(" ")
  );

const productContainsTerm = (product: Product, term: string) => {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return false;
  const haystack = productSearchText(product);
  return haystack.includes(normalizedTerm);
};

export type CategoryNavParam = "subcategory" | "subsubcategory";

export interface CategoryNavTopItem {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface CategoryNavChildItem {
  key: string;
  label: string;
  value: string;
  param: CategoryNavParam;
  queryParams: Partial<Record<"category" | CategoryNavParam, string>>;
  imageSrc: string;
}

interface CategoryMatcher {
  includeAny: string[];
  excludeAny?: string[];
}

interface CategoryNavConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  childItems: Array<{
    label: string;
    value: string;
    param: CategoryNavParam;
    queryParams?: Partial<Record<"category" | CategoryNavParam, string>>;
    matcher: CategoryMatcher;
  }>;
}

const categoryNavigationConfig: CategoryNavConfig[] = [
  {
    value: "incense",
    label: "Incense",
    icon: Flame,
    childItems: [
      {
        label: "Incense Sticks",
        value: "incense_sticks",
        param: "subcategory",
        matcher: {
          includeAny: ["incense sticks", "incense stick", "sub category incense sticks"],
          excludeAny: ["premium incense", "dhoop", "havan cup"],
        },
      },
      {
        label: "Premium Incense Sticks",
        value: "premium_incense_sticks",
        param: "subcategory",
        matcher: {
          includeAny: ["premium incense sticks", "premium incense", "premium_incense_sticks"],
        },
      },
      {
        label: "Dhoops",
        value: "dhoops",
        param: "subcategory",
        matcher: {
          includeAny: ["dhoop", "dhoops", "dhoop sticks", "premium dhoop sticks"],
        },
      },
      {
        label: "Havan Cups",
        value: "havan_cups",
        param: "subcategory",
        matcher: {
          includeAny: ["havan cups", "havan cup", "premium havan cups"],
        },
      },
    ],
  },
  {
    value: "car_room_fresheners",
    label: "Car & Room Fresheners",
    icon: Car,
    childItems: [
      {
        label: "Premium Room Mist",
        value: "premium_room_mist",
        param: "subcategory",
        matcher: {
          includeAny: ["room mist", "room freshener", "room fresheners", "room freshners"],
          excludeAny: ["car freshener", "car fresheners", "diffuser"],
        },
      },
      {
        label: "Diffuser Oils",
        value: "diffuser_oils",
        param: "subcategory",
        matcher: {
          includeAny: ["diffuser oils", "diffuser oil", "fragrance blends", "fragrance blend", "aromatic blends"],
          excludeAny: ["refill pack", "diffuser machine", "diffusers", "essential oil", "essential oils"],
        },
      },
      {
        label: "Diffuser Oil Refill Pack For Machines",
        value: "diffuser_oil_refill_pack_for_machines",
        param: "subcategory",
        matcher: {
          includeAny: ["diffuser oil refill pack for machines", "diffuser oil refill", "refill pack for machines"],
        },
      },
      {
        label: "Diffuser Machines",
        value: "diffuser_machines",
        param: "subcategory",
        matcher: {
          includeAny: ["diffuser machines", "diffuser machine", "diffusers"],
          excludeAny: ["diffuser oil", "refill pack"],
        },
      },
      {
        label: "For Car",
        value: "for_car",
        param: "subsubcategory",
        queryParams: { category: "car_room_fresheners", subcategory: "for_car" },
        matcher: {
          includeAny: ["for car", "car freshener", "car fresheners"],
        },
      },
      {
        label: "For Home",
        value: "for_home",
        param: "subsubcategory",
        queryParams: { category: "car_room_fresheners", subcategory: "for_home" },
        matcher: {
          includeAny: ["for home"],
        },
      },
      {
        label: "For Hotels & Commercial Places",
        value: "for_hotels_commercial_places",
        param: "subsubcategory",
        queryParams: { category: "car_room_fresheners", subcategory: "for_hotels_commercial_places" },
        matcher: {
          includeAny: ["for hotels", "commercial places", "commercial place", "hotel use"],
        },
      },
    ],
  },
  {
    value: "home_fragrance",
    label: "Home Fragrance",
    icon: Home,
    childItems: [
      {
        label: "Essential Oils",
        value: "essential_oils",
        param: "subcategory",
        matcher: {
          includeAny: ["essential oils", "essential oil"],
        },
      },
      {
        label: "Fragrance Blends",
        value: "fragrance_blends",
        param: "subcategory",
        matcher: {
          includeAny: ["fragrance blends", "fragrance blend"],
          excludeAny: ["diffuser oil", "diffuser oils", "aromatic blends"],
        },
      },
      {
        label: "Wardrobe Sachets",
        value: "wardrobe_sachets",
        param: "subcategory",
        matcher: {
          includeAny: ["wardrobe sachets", "wardrobe sachet", "fragrance sachets", "fragrance sachet"],
        },
      },
    ],
  },
  {
    value: "personal_care",
    label: "Personal Care",
    icon: Sparkles,
    childItems: [
      {
        label: "Soaps",
        value: "soaps",
        param: "subcategory",
        matcher: {
          includeAny: ["soaps", "soap"],
        },
      },
      {
        label: "Facewash",
        value: "facewash",
        param: "subcategory",
        matcher: {
          includeAny: ["facewash", "face wash"],
        },
      },
      {
        label: "Floor Cleaner Concentrates",
        value: "floor_cleaner_concentrates",
        param: "subcategory",
        matcher: {
          includeAny: ["floor cleaner concentrates", "floor cleaner concentrate"],
        },
      },
      {
        label: "Handwash",
        value: "handwash",
        param: "subcategory",
        matcher: {
          includeAny: ["handwash", "hand wash"],
        },
      },
    ],
  },
  {
    value: "perfumes",
    label: "Perfumes",
    icon: Flower2,
    childItems: [
      {
        label: "Pocket Perfumes",
        value: "pocket_perfumes",
        param: "subcategory",
        matcher: {
          includeAny: ["pocket perfumes", "pocket perfume"],
        },
      },
      {
        label: "Daily Collection",
        value: "daily_collection",
        param: "subcategory",
        matcher: {
          includeAny: ["daily collection"],
        },
      },
      {
        label: "Luxury Collection",
        value: "luxury_collection",
        param: "subcategory",
        matcher: {
          includeAny: ["luxury collection"],
        },
      },
    ],
  },
  {
    value: "daily_rituals",
    label: "Daily Rituals",
    icon: HeartHandshake,
    childItems: [
      {
        label: "Fresh Mornings",
        value: "fresh_mornings",
        param: "subcategory",
        matcher: {
          includeAny: ["fresh mornings", "fresh morning"],
        },
      },
      {
        label: "Relaxation & Calm",
        value: "relaxation_calm",
        param: "subcategory",
        matcher: {
          includeAny: ["relaxation calm", "relaxation and calm"],
        },
      },
      {
        label: "Dusky Evenings & Night",
        value: "dusky_evenings_night",
        param: "subcategory",
        matcher: {
          includeAny: ["dusky evenings night", "dusky evening", "night ritual"],
        },
      },
    ],
  },
  {
    value: "gift_collections",
    label: "Gift Collections",
    icon: Gift,
    childItems: [
      {
        label: "Home Decor",
        value: "home_decor",
        param: "subcategory",
        matcher: {
          includeAny: ["home decor", "home_decor"],
        },
      },
      {
        label: "Table Decor",
        value: "table_decor",
        param: "subcategory",
        matcher: {
          includeAny: ["table decor", "table_decor"],
        },
      },
    ],
  },
];

const configForCategory = (categoryValue?: string | null) =>
  categoryNavigationConfig.find((item) => routeValueMatches(item.value, categoryValue));

const matchesMatcher = (product: Product, matcher: CategoryMatcher) => {
  const hasInclude = matcher.includeAny.some((term) => productContainsTerm(product, term));
  if (!hasInclude) return false;
  if (matcher.excludeAny?.some((term) => productContainsTerm(product, term))) return false;
  return true;
};

const findChildConfigByValue = (value?: string | null) => {
  if (!value) return null;

  for (const config of categoryNavigationConfig) {
    const item = config.childItems.find((child) => routeValueMatches(child.value, value));
    if (item) return { config, item };
  }

  return null;
};

const categoryContainsChildValue = (categoryValue?: string | null, childValue?: string | null) => {
  const config = configForCategory(categoryValue);
  if (!config || !childValue) return false;
  return config.childItems.some((item) => routeValueMatches(item.value, childValue));
};

const categoryConfigForProduct = (product?: Product | null) => {
  if (!product) return null;

  for (const config of categoryNavigationConfig) {
    if (config.childItems.some((item) => matchesMatcher(product, item.matcher))) {
      return config;
    }
  }

  return null;
};

const childConfigForProduct = (product?: Product | null, categoryValue?: string | null) => {
  if (!product) return null;

  const config = categoryValue ? configForCategory(categoryValue) : categoryConfigForProduct(product);
  if (!config) return null;

  return config.childItems.find((item) => matchesMatcher(product, item.matcher)) || null;
};

const childItemMatchesCurrentFilters = (
  item: Pick<CategoryNavChildItem, "value" | "param" | "queryParams">,
  subcategory?: string | null,
  subsubcategory?: string | null
) => {
  const routeSubcategory = item.queryParams?.subcategory;
  const routeSubsubcategory = item.queryParams?.subsubcategory;

  if (routeSubcategory && routeValueMatches(routeSubcategory, subcategory)) return true;
  if (routeSubsubcategory && routeValueMatches(routeSubsubcategory, subsubcategory)) return true;

  return routeValueMatches(item.value, subcategory) || routeValueMatches(item.value, subsubcategory);
};

const configForChildFilter = (subcategory?: string | null, subsubcategory?: string | null) =>
  categoryNavigationConfig.find((config) =>
    config.childItems.some((item) =>
      childItemMatchesCurrentFilters(
        {
          value: item.value,
          param: item.param,
          queryParams: item.queryParams || { category: config.value, [item.param]: item.value },
        },
        subcategory,
        subsubcategory
      )
    )
  );

export const buildTopCategoryItems = (): CategoryNavTopItem[] =>
  categoryNavigationConfig.map(({ value, label, icon }) => ({ key: value, value, label, icon }));

export const matchesProductCategory = (product: Product, categoryValue?: string | null) => {
  const config = configForCategory(categoryValue);
  if (!config) return false;
  return config.childItems.some((item) => matchesMatcher(product, item.matcher));
};

export const matchesProductChildCategory = (product: Product, childValue?: string | null, categoryValue?: string | null) => {
  if (!childValue) return false;

  const config = categoryValue ? configForCategory(categoryValue) : undefined;
  const candidateConfigs = config ? [config] : categoryNavigationConfig;

  for (const candidate of candidateConfigs) {
    const matchedChild = candidate.childItems.find(
      (item) => routeValueMatches(item.value, childValue) && matchesMatcher(product, item.matcher)
    );
    if (matchedChild) return true;
  }

  return false;
};

export const resolveProductListingParams = (product?: Product | null) => {
  const categoryConfig = categoryConfigForProduct(product);
  const childConfig = childConfigForProduct(product, categoryConfig?.value);

  if (!categoryConfig) {
    return {
      category: null,
      subcategory: null,
      subsubcategory: null,
    };
  }

  return {
    category: categoryConfig.value,
    subcategory: childConfig?.param === "subcategory" ? childConfig.value : null,
    subsubcategory: childConfig?.param === "subsubcategory" ? childConfig.value : null,
  };
};

export const resolveActiveCategory = ({
  products,
  category,
  subcategory,
  subsubcategory,
}: {
  products: Product[];
  category?: string | null;
  subcategory?: string | null;
  subsubcategory?: string | null;
}) => {
  if (category && configForCategory(category)) return configForCategory(category)?.value || null;
  if (!subcategory && !subsubcategory) return null;

  const matchedConfig = configForChildFilter(subcategory, subsubcategory);
  if (matchedConfig) return matchedConfig.value;

  const childFilter = subsubcategory || subcategory;
  const matchedProduct = childFilter
    ? products.find((product) => matchesProductChildCategory(product, childFilter))
    : undefined;

  return categoryConfigForProduct(matchedProduct)?.value || null;
};

export const buildChildCategoryItems = (products: Product[], activeCategory?: string | null): CategoryNavChildItem[] => {
  const config = configForCategory(activeCategory);
  if (!config) return [];

  return config.childItems.map((item) => {
    const matchedProduct = products.find((product) => matchesMatcher(product, item.matcher));
    const key = `${item.param}:${normalizeFilterKey(item.value)}`;

    return {
      key,
      label: item.label,
      value: item.value,
      param: item.param,
      queryParams: item.queryParams || { category: config.value, [item.param]: item.value },
      imageSrc: firstProductImage(matchedProduct),
    };
  });
};

export const resolveActiveChildKey = ({
  childItems,
  product,
  subcategory,
  subsubcategory,
}: {
  childItems: CategoryNavChildItem[];
  product?: Product | null;
  subcategory?: string | null;
  subsubcategory?: string | null;
}) => {
  if (subsubcategory) {
    return childItems.find((item) => childItemMatchesCurrentFilters(item, subcategory, subsubcategory))?.key || null;
  }

  if (subcategory) {
    return childItems.find((item) => childItemMatchesCurrentFilters(item, subcategory, subsubcategory))?.key || null;
  }

  if (!product) return null;

  const productParams = resolveProductListingParams(product);
  const activeValue = productParams.subsubcategory || productParams.subcategory;

  return childItems.find((item) => routeValueMatches(item.value, activeValue))?.key || null;
};

export const isKnownCategoryChildValue = (value?: string | null, categoryValue?: string | null) => {
  if (!value) return false;
  if (categoryValue) return categoryContainsChildValue(categoryValue, value);
  return Boolean(findChildConfigByValue(value));
};

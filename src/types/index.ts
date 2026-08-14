export type BenefitIconKey = "sparkles" | "leaf" | "shield" | "repeat" | "package" | "heart" | "droplet" | "sun" | "star" | "wind";

export interface BenefitItem {
  icon: BenefitIconKey;
  text: string;
}

export interface Product {
  id: number;
  name: string;
  shortname?: string | null;
  shortdescription: string | null;
  fulldescription: string | null;
  benefititems?: BenefitItem[] | null;
  usage?: string | null;
  fragnancetype: string | null;
  soldquantity: number;
  availablequantity: number;
  quantity: number;
  ecompublishedquantity: number;
  productstatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  puc: string;
  averagerating: number | null;
  discount: number;
  price: number;
  orderedquantity: number | null;
  createddate: number;
  modifieddate: number;
  isdealoftheday: boolean;
  category: string;
  subcategory: string;
  subsubcategory?: string | null;
  large: string[] | null;
  medium: string[] | null;
  small: string[] | null;
  brand: string | null;
  pack: string | null;
}

export interface ProductCategoryCount {
  id: string;
  label: string;
  count: number;
  sortOrder?: number | null;
  subcategories: ProductSubcategoryCount[];
}

export interface ProductSubcategoryCount {
  id: string;
  label: string;
  count: number;
  sortOrder?: number | null;
  subsubcategories: ProductSubsubcategoryCount[];
}

export interface ProductSubsubcategoryCount {
  id: string;
  label: string;
  count: number;
  sortOrder?: number | null;
}

export interface ProductCategoryTree {
  platform: string;
  totalProducts: number;
  categories: ProductCategoryCount[];
}

export interface BannerItem {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaLink: string;
}

export interface PromotionalAssetContent {
  section_key?: string;
  section_title?: string;
  section_eyebrow?: string;
  link_text?: string;
  source_type?: "manual" | "product_filter" | "ratings";
  display_limit?: number;
  product_id?: number;
  product_name?: string;
  product_filter?: {
    product_id?: number;
    product_name?: string;
    require_deal_flag?: boolean;
    include_discounted?: boolean;
    sort_by?: string;
    limit?: number;
  };
  brand_names?: string[];
  eyebrow?: string;
  subtitle?: string;
  body_text?: string;
  desktop_image_url?: string;
  mobile_image_url?: string;
  poster_image_url?: string;
  desktop_video_url?: string;
  mobile_video_url?: string;
  cta_text?: string;
  cta_url?: string;
  fit?: "cover" | "contain";
}

export interface PromotionalAsset {
  id: number;
  type: "banner" | "featured_ad" | "popup" | "carousel";
  placement: string;
  title: string;
  content: PromotionalAssetContent;
  priority: number;
  is_active: boolean;
  schedule_start?: string | null;
  schedule_end?: string | null;
  version: number;
  createddate?: number;
  modifieddate?: number;
}

export interface HomepagePromotionalConfig {
  placements: string[];
  sections: Record<string, PromotionalAsset[]>;
}

export interface StorefrontMedia {
  type?: "image" | "video";
  desktop_url: string;
  mobile_url?: string;
  fit?: "cover" | "contain";
  alt?: string;
}

export interface StorefrontButton {
  label?: string;
  url?: string;
  variant?: string;
}

export interface StorefrontHeroSlide {
  sort_order?: number;
  eyebrow?: string;
  title: string;
  description?: string;
  button?: StorefrontButton;
  buttons?: StorefrontButton[];
  media: StorefrontMedia;
}

export interface StorefrontShowcaseItem {
  sort_order?: number;
  eyebrow?: string;
  title: string;
  button?: StorefrontButton;
  media: StorefrontMedia;
}

export interface StorefrontSectionAttributes {
  autoplay?: boolean;
  interval_ms?: number;
  layout?: string;
  slides?: StorefrontHeroSlide[];
  items?: StorefrontShowcaseItem[];
}

export interface StorefrontPageSection {
  id: number;
  page_key: string;
  section_key: string;
  section_type: string;
  name: string;
  attributes: StorefrontSectionAttributes;
  sort_order: number;
  is_active: boolean;
  version: number;
}

export interface StorefrontHomepageConfig {
  page_key: string;
  sections: StorefrontPageSection[];
  sections_by_key: Record<string, StorefrontPageSection | StorefrontPageSection[]>;
}

export interface Rating {
  id: number;
  userid: number | null;
  productid: number | null;
  orderid: number | null;
  starrating: number;
  comments: string | null;
  url: string[] | null;
  usermail: string | null;
  orderlineid: number | null;
  createddate: number;
  modifieddate: number;
}

// User interface
export interface User {
  id: number;
  useremail: string | null;
  usermobilenumber: number;
  firstname: string | null;
  lastname: string | null;
  gender: string | null;
  gstnumber: string | null;
  isbusinessuser: boolean;
}

// OTP Request/Response interfaces
export interface OTPRequest {
  usermobilenumber: number;
  verifyOnly?: boolean;
}

export interface OTPVerifyRequest {
  usermobilenumber: number;
  otp: number;
  firstname?: string;
}

export interface OTPRequestResponse {
  message: string;
  mobileNumber?: number;
  otpSent?: boolean;
  expiresIn?: number;
  canResendAfter?: number;
  isNewUser?: boolean;
  requiresName?: boolean;
}

export interface OTPVerifyResponse {
  token: string;
  access_token?: string;
  accessToken?: string;
  refreshToken?: string;
  refresh_token?: string;
  user: User;
}

export interface CartItem {
  id: number;
  productid: number;
  userid: number;
  quantity: number;
  iscart: boolean;
  iswishlist: boolean;
  createddate?: number;
  modifieddate?: number;
}

// API Response interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    filters: unknown[];
    total: number;
    filtered: boolean;
  };
}

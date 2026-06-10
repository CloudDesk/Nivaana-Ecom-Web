export interface Product {
  id: number;
  name: string;
  shortdescription: string | null;
  fulldescription: string | null;
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
  large: string[] | null;
  medium: string[] | null;
  small: string[] | null;
  brand: string | null;
  pack: string | null;
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
}

export interface OTPRequestResponse {
  message: string;
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

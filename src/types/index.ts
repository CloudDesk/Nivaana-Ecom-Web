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

// User interface
export interface User {
  id: number;
  useremail: string;
  usermobilenumber: number;
  firstname: string;
  lastname: string;
  gender: string;
  gstnumber: string;
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
  user: User;
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

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

// API Response interfaces
export interface ApiResponse<T = any> {
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
    filters: any[];
    total: number;
    filtered: boolean;
  };
}

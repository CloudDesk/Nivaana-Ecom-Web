import { apiService } from "./apiService";
import type { ApiResponse, StorefrontHomepageConfig } from "../types";

export class StorefrontPageSectionService {
  async getHomepageConfig(pageKey = "home"): Promise<ApiResponse<StorefrontHomepageConfig>> {
    return apiService.get<StorefrontHomepageConfig>(
      `/storefront-page-sections/homepage-config?page_key=${encodeURIComponent(pageKey)}`
    );
  }
}

export const storefrontPageSectionService = new StorefrontPageSectionService();

export default StorefrontPageSectionService;

import { apiService } from "./apiService";
import type { ApiResponse, HomepagePromotionalConfig } from "../types";

export class PromotionalAssetService {
  async getHomepageConfig(): Promise<ApiResponse<HomepagePromotionalConfig>> {
    return apiService.get<HomepagePromotionalConfig>("/promotional-assets/ecom-web-homepage-config");
  }
}

export const promotionalAssetService = new PromotionalAssetService();

export default PromotionalAssetService;

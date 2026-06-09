import { apiService } from "./apiService";
import type { ApiResponse, Rating } from "../types";

class RatingService {
  async getRatings(page = 1, limit = 10): Promise<ApiResponse<Rating[]>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    return apiService.get<Rating[]>(`/ratings?${params.toString()}`);
  }
}

export const ratingService = new RatingService();

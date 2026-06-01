import { apiService } from "./apiService";
import type { Category } from "../types";

interface PicklistItem {
  id: number;
  label: string;
  value: string;
}

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export class PicklistService {
  private mapPicklistItems(items: PicklistItem[]): Category[] {
    return items.map((item) => {
      const id = item.value || item.id.toString();

      return {
        id,
        name: item.label || toTitleCase(id),
      };
    });
  }

  async getCategories(): Promise<Category[]> {
    const response = await apiService.get<PicklistItem[]>(
      "/picklists/?fieldname=category&limit=100",
    );

    if (!response.success || !Array.isArray(response.data)) {
      return [];
    }

    return this.mapPicklistItems(response.data);
  }

  async getSubcategories(parentCategory: string): Promise<Category[]> {
    const response = await apiService.get<PicklistItem[]>(
      `/picklists/?fieldname=subcategory&parent=${encodeURIComponent(parentCategory)}&limit=100`,
    );

    if (!response.success || !Array.isArray(response.data)) {
      return [];
    }

    return this.mapPicklistItems(response.data);
  }
}

export const picklistService = new PicklistService();

export default PicklistService;

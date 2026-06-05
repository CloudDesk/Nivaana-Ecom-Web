import { apiService } from "./apiService";
import type { ApiResponse } from "../types";

export interface Address {
  id: number;
  userid: number;
  name: string;
  mobilenumber: number;
  pincode: number;
  doornumber: string;
  address: string;
  landmark: string;
  state: string;
  city: string;
  isdefaultaddress?: boolean;
}

export type AddressPayload = Omit<Address, "id">;

class AddressService {
  list(userId: number): Promise<ApiResponse<Address[]>> {
    return apiService.get<Address[]>(`/addresses?userid=${userId}`);
  }

  create(payload: AddressPayload): Promise<ApiResponse<Address>> {
    return apiService.post<Address>("/addresses", payload);
  }

  update(id: number, payload: AddressPayload): Promise<ApiResponse<Address>> {
    return apiService.put<Address>(`/addresses/${id}`, payload);
  }

  remove(id: number): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/addresses/${id}`);
  }
}

export const addressService = new AddressService();
export default AddressService;

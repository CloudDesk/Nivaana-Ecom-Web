import { apiService } from "./apiService";
import type { ApiResponse, User } from "../types";

export type UpdateUserProfilePayload = Partial<
  Pick<User, "firstname" | "lastname" | "useremail" | "gender" | "gstnumber" | "isbusinessuser">
>;

class UserService {
  updateProfile(userId: number, payload: UpdateUserProfilePayload): Promise<ApiResponse<User>> {
    return apiService.put<User>(`/users/${userId}`, payload);
  }
}

export const userService = new UserService();

export default UserService;

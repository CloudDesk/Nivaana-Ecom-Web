import axios from "axios";
import { apiService, type ApiResponse } from "./apiService";
import { sessionService } from "./sessionService";

export type ReturnRequestType = "return" | "replacement";
export type RequestedResolution = "replacement" | "refund" | "partial_refund" | "ship_missing_item" | "complete_return";
export type AttachmentType = "product_photo" | "package_photo" | "unboxing_video" | "defect_video" | "other";

export interface EvidenceRequirements {
  photorequired: boolean;
  videorequired: boolean;
  packagephotorequired: boolean;
  packagephotooptional: boolean;
  unboxingvideorequired: boolean;
  unboxingvideooptional: boolean;
}

export interface AllowedReturnReason {
  reasoncode: string;
  reasonname: string;
  aliases: string[];
  allowedresolutions: RequestedResolution[];
  minimumraisewindowhours?: number | null;
  evidencerequirements: EvidenceRequirements;
  openedpackageallowed: boolean;
  pickuprequired: boolean;
  pickupflow: "evidence_first" | "pickup_first";
  reverseshippingchargebearer?: string | null;
}

export interface ReturnEligibilityItem {
  orderlineid: number;
  orderlinenumber?: string | null;
  productid?: number | string | null;
  productname?: string | null;
  category?: string | null;
  subcategory?: string | null;
  subsubcategory?: string | null;
  orderstatus?: string | null;
  delivereddate?: number | null;
  orderedquantity: number;
  activeorconsumedquantity: number;
  remainingeligiblequantity: number;
  eligible: boolean;
  return: {
    eligible: boolean;
    policyeligible: boolean;
    windowdays?: number | null;
    allowedrefundmethods: string[];
    reason: string;
  };
  replacement: {
    eligible: boolean;
    policyeligible: boolean;
    windowdays?: number | null;
    reason: string;
  };
  allowedreasons: AllowedReturnReason[];
  blockers: string[];
}

export interface OrderReturnEligibility {
  order: {
    id: number;
    orderid?: string | null;
    orderstatus?: string | null;
    delivereddate?: number | null;
    userid?: number | null;
  };
  eligibleitemcount: number;
  itemcount: number;
  items: ReturnEligibilityItem[];
}

export interface UploadedEvidence {
  fileurl: string;
  attachmenttype: AttachmentType;
  filename?: string;
  mimetype?: string;
  size?: number;
}

export interface CreateReturnRequestInput {
  orderlineid: number;
  requesttype: ReturnRequestType;
  reasoncode?: string;
  reason?: string;
  requestedquantity: number;
  requestedresolution: RequestedResolution;
  ispackageopened?: boolean;
  additionalremarks?: string;
  attachments: Array<{
    attachmenttype: AttachmentType;
    fileurl: string;
    isrequired?: boolean;
  }>;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5600/v1";

const authHeaders = () => {
  const token = sessionService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

export const returnSourceService = {
  getOrderEligibility(orderId: number | string): Promise<ApiResponse<OrderReturnEligibility>> {
    return apiService.get<OrderReturnEligibility>(`/orders/${orderId}/return-eligibility`);
  },

  createRequest(payload: CreateReturnRequestInput): Promise<ApiResponse<unknown>> {
    return apiService.post<unknown>("/returns", payload);
  },

  async uploadEvidence(file: File, attachmenttype: AttachmentType): Promise<UploadedEvidence> {
    const data = new FormData();
    data.append("file", file);
    data.append("attachmenttype", attachmenttype);

    const response = await axios.post<ApiResponse<UploadedEvidence>>(`${baseUrl}/returns/evidence/upload`, data, {
      headers: authHeaders(),
      timeout: 60000,
    }).catch((error) => {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string } | undefined;
        throw new Error(data?.message || data?.error || error.message);
      }
      throw error;
    });

    if (!response.data.success) {
      throw new Error("Evidence upload failed");
    }

    return response.data.data;
  },
};

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
  policyid?: number | null;
  policyversion?: number | null;
  policyreasonruleid?: number | null;
  configurationversion?: number | null;
  reasondeadline?: number | null;
  remainingclaimmilliseconds?: number | null;
  configuration?: Record<string, unknown> | null;
  aliases: string[];
  allowedresolutions: RequestedResolution[];
  raisewithinhours?: number | null;
  schemaversion?: number;
  evidencerules?: Array<{ type: AttachmentType; required: boolean; minimum: number }>;
  evidencerequirements: EvidenceRequirements;
  openedpackageallowed: boolean;
  pickuprequired: boolean;
  pickupflow: "evidence_first" | "pickup_first";
  resolutiontiming?: string | null;
  stockunavailableresolution?: RequestedResolution | null;
  pickuptriggermode?: "manual_admin";
  notifycustomeronstockfallback?: boolean;
  reverseshippingchargebearer?: "nivaana" | null;
}

export interface ReturnEligibilityItem {
  orderlineid: number;
  orderlinenumber?: string | null;
  productid?: number | string | null;
  productname?: string | null;
  category?: string | null;
  subcategory?: string | null;
  orderstatus?: string | null;
  delivereddate?: number | null;
  orderedquantity: number;
  activeorconsumedquantity: number;
  remainingeligiblequantity: number;
  eligible: boolean;
  return: {
    eligible: boolean;
    policyeligible: boolean;
    policyid?: number | null;
    policyversion?: number | null;
    windowdays?: number | null;
    allowedrefundmethods: string[];
    reason: string;
  };
  replacement: {
    eligible: boolean;
    policyeligible: boolean;
    policyid?: number | null;
    policyversion?: number | null;
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
  policyreasonruleid?: number;
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

export interface ReturnRequestAttachment {
  id: number;
  attachmenttype: AttachmentType;
  fileurl: string;
  isrequired?: boolean;
  status?: string;
  uploadeddate?: number | null;
}

export interface ReturnInspection {
  id: number;
  approvedQuantity?: number;
  rejectedQuantity?: number;
  condition?: string | null;
  inspectionNotes?: string | null;
  restockAction?: string | null;
  createddate?: number | null;
}

export interface ReturnStatusTimelineEntry {
  id: number;
  previousStatus?: string | null;
  status: string;
  eventType: string;
  actorType?: string | null;
  actorId?: number | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  createddate?: number | null;
}

export interface ReturnRequestSummary {
  id: number;
  requestnumber: string;
  orderid?: number | null;
  orderlineid?: number | null;
  requesttype: "return" | "replacement" | "rto";
  source: "customer" | "delivery_partner" | "admin";
  reason?: string | null;
  reasoncode?: string | null;
  requestedquantity: number;
  requestedresolution?: RequestedResolution | null;
  evidenceReviewStatus?: string | null;
  evidenceRejectionReason?: string | null;
  evidenceReviewRemarks?: string | null;
  requestReviewStatus?: string | null;
  requestReviewRemarks?: string | null;
  requestRejectionReason?: string | null;
  reverseShipmentTrackingId?: string | null;
  reverseShipmentProvider?: string | null;
  receivedQuantity?: number | null;
  receivedCondition?: string | null;
  receivedRemarks?: string | null;
  receivedLocation?: string | null;
  receivedDate?: number | null;
  status: string;
  createddate?: number | null;
  modifieddate?: number | null;
  attachments?: ReturnRequestAttachment[];
  inspections?: ReturnInspection[];
  statusTimeline?: ReturnStatusTimelineEntry[];
}

export interface ReturnRequestsResponse {
  success: boolean;
  data: ReturnRequestSummary[];
  pagination?: ApiResponse["pagination"];
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

  getMyRequests(customerId?: number | string): Promise<ApiResponse<ReturnRequestSummary[]>> {
    const query = new URLSearchParams({
      source: "customer",
      limit: "100",
    });
    if (customerId) query.set("customerid", String(customerId));
    return apiService.get<ReturnRequestSummary[]>(`/returns?${query.toString()}`);
  },

  async uploadEvidence(file: File, attachmenttype: AttachmentType, orderIdentifier?: string | number): Promise<UploadedEvidence> {
    const data = new FormData();
    data.append("file", file);
    data.append("attachmenttype", attachmenttype);
    if (orderIdentifier) {
      data.append("orderid", String(orderIdentifier));
    }

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

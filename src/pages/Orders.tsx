import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Truck,
  UserRound,
  Upload,
  X,
  Camera,
  FileVideo,
  Info,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import {
  orderService,
  type OrderAddress,
  type OrderDetails,
  type OrderLine,
  type OrderSummary,
  type TrackingDetails,
} from "../services/orderService";
import { sessionService } from "../services/sessionService";
import {
  returnSourceService,
  type AllowedReturnReason,
  type AttachmentType,
  type OrderReturnEligibility,
  type ReturnEligibilityItem,
  type ReturnRequestType,
  type ReturnRequestSummary,
} from "../services/returnSourceService";

const currencyFormatter = new Intl.NumberFormat("en-IN");

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return `Rs. ${currencyFormatter.format(Number.isFinite(amount) ? amount : 0)}`;
};

const formatDate = (value?: number | string | null) => {
  const timestamp = Number(value);
  if (!timestamp) return "Date unavailable";

  const millis = timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDuration = (milliseconds?: number | null) => {
  const totalMinutes = Math.max(0, Math.floor(Number(milliseconds || 0) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatStatus = (status?: string | null) => {
  if (!status) return "Processing";
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getOrderIdentifier = (order?: OrderSummary | null) => order?.id ?? order?.orderid ?? "";
const getOrderKey = (order: OrderSummary | undefined | null, index: number) => String(order?.orderid ?? order?.id ?? index);
const orderStatusAnchorId = (orderKey: string) => `order-status-${orderKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
const isReplacementFulfillmentOrder = (order?: OrderSummary | null) => {
  const mode = String(order?.mode ?? "").toLowerCase();
  const orderNumber = String(order?.orderid ?? "");
  return mode === "replacement" || orderNumber.startsWith("REP-REP-");
};

const scrollToOrderStatus = (orderKey: string) => {
  window.setTimeout(() => {
    document.getElementById(orderStatusAnchorId(orderKey))?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 80);
};

const Orders: React.FC = () => {
  const queryClient = useQueryClient();
  const [session] = useState(() => sessionService.getSession());
  const userId = session?.user.id;
  const [detailsByOrder, setDetailsByOrder] = useState<Record<string, OrderDetails>>({});
  const [activeModal, setActiveModal] = useState<{
    orderKey: string;
    order: OrderSummary;
    line: OrderLine;
    item: ReturnEligibilityItem;
    requesttype: ReturnRequestType;
  } | null>(null);

  const [returnEligibility, setReturnEligibility] = useState<Record<string, OrderReturnEligibility>>({});
  const [returnEligibilityError, setReturnEligibilityError] = useState<Record<string, string>>({});
  const [isLoadingReturnEligibility, setIsLoadingReturnEligibility] = useState<Record<string, boolean>>({});
  const pendingReturnEligibilityKeys = useRef<Set<string>>(new Set());
  const [returnRequests, setReturnRequests] = useState<ReturnRequestSummary[]>([]);
  const [returnRequestsError, setReturnRequestsError] = useState("");
  const [isLoadingReturnRequests, setIsLoadingReturnRequests] = useState(false);
  const pendingReturnSubmissionKeys = useRef<Set<string>>(new Set());
  const [trackingByOrder, setTrackingByOrder] = useState<Record<string, TrackingDetails>>({});
  const [trackingErrorByOrder, setTrackingErrorByOrder] = useState<Record<string, string>>({});
  const [detailsErrorByOrder, setDetailsErrorByOrder] = useState<Record<string, string>>({});
  const [cancelErrorByOrder, setCancelErrorByOrder] = useState<Record<string, string>>({});
  const [expandedOrderKey, setExpandedOrderKey] = useState<string | null>(null);
  const [trackingOrderKey, setTrackingOrderKey] = useState<string | null>(null);
  const [detailsOrderKey, setDetailsOrderKey] = useState<string | null>(null);
  const [cancelOrderKey, setCancelOrderKey] = useState<string | null>(null);
  const [refreshOrderKey, setRefreshOrderKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["orders", userId],
    queryFn: () => orderService.listUserDetails(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!statusMessage) return;

    const timeout = window.setTimeout(() => setStatusMessage(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  const orders = useMemo(() => {
    const rawOrders = Array.isArray(ordersQuery.data?.data) ? ordersQuery.data.data : [];
    return rawOrders
      .map(normalizeOrderDetails)
      .filter((details): details is OrderDetails => Boolean(details))
      .filter((details) => !isReplacementFulfillmentOrder(details.order))
      .sort((a, b) => Number(b.order.createddate || 0) - Number(a.order.createddate || 0));
  }, [ordersQuery.data?.data]);

  const orderSummary = useMemo(() => {
    const totalSpent = orders.reduce((sum, details) => sum + Number(details.order.orderamount || 0), 0);
    const cancelled = orders.filter((details) => isCancelledStatus(details.order.orderstatus)).length;

    return {
      total: orders.length,
      totalSpent,
      active: Math.max(orders.length - cancelled, 0),
      cancelled,
    };
  }, [orders]);

  useEffect(() => {
    if (!orders.length) return;
    const pendingEligibility = orders
      .map((item, index) => ({ details: item, index }))
      .filter(({ details, index }) => {
        const orderKey = getOrderKey(details.order, index);
        return (
          !returnEligibility[orderKey] &&
          !returnEligibilityError[orderKey] &&
          !pendingReturnEligibilityKeys.current.has(orderKey)
        );
      });

    if (!pendingEligibility.length) return;

    (async () => {
      await Promise.all(
        pendingEligibility.map(async ({ details, index }) => {
          const identifier = getOrderIdentifier(details.order);
          const orderKey = getOrderKey(details.order, index);
          if (!identifier) {
            setReturnEligibilityError((current) => ({
              ...current,
              [orderKey]: "Return eligibility is not available for this order.",
            }));
            return;
          }

          pendingReturnEligibilityKeys.current.add(orderKey);
          setIsLoadingReturnEligibility((current) => ({ ...current, [orderKey]: true }));
          try {
            const response = await returnSourceService.getOrderEligibility(identifier);
            setReturnEligibility((current) => ({
              ...current,
              [orderKey]: response.data,
            }));
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Return eligibility is not available for this order.";
            setReturnEligibilityError((current) => ({
              ...current,
              [orderKey]: msg,
            }));
          } finally {
            pendingReturnEligibilityKeys.current.delete(orderKey);
            setIsLoadingReturnEligibility((current) => ({ ...current, [orderKey]: false }));
          }
        })
      );
    })();
  }, [orders, returnEligibility, returnEligibilityError]);

  const fetchReturnRequests = async () => {
    if (!userId) return;
    setIsLoadingReturnRequests(true);
    setReturnRequestsError("");
    try {
      const response = await returnSourceService.getMyRequests(userId);
      setReturnRequests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setReturnRequestsError(error instanceof Error ? error.message : "Could not load return request history.");
      setReturnRequests([]);
    } finally {
      setIsLoadingReturnRequests(false);
    }
  };

  useEffect(() => {
    fetchReturnRequests();
  }, [userId]);

  const returnRequestsByLine = useMemo(() => {
    return returnRequests.reduce<Record<string, ReturnRequestSummary[]>>((groups, request) => {
      if (!request.orderlineid) return groups;
      const key = String(request.orderlineid);
      groups[key] = [...(groups[key] || []), request];
      return groups;
    }, {});
  }, [returnRequests]);

  const handleFetchEligibility = async (details: OrderDetails, index: number) => {
    const orderKey = getOrderKey(details.order, index);
    const identifier = getOrderIdentifier(details.order);
    if (
      !identifier ||
      returnEligibility[orderKey] ||
      isLoadingReturnEligibility[orderKey] ||
      pendingReturnEligibilityKeys.current.has(orderKey)
    ) {
      return;
    }

    pendingReturnEligibilityKeys.current.add(orderKey);
    setIsLoadingReturnEligibility((current) => ({ ...current, [orderKey]: true }));
    setReturnEligibilityError((current) => ({ ...current, [orderKey]: "" }));
    try {
      const response = await returnSourceService.getOrderEligibility(identifier);
      setReturnEligibility((current) => ({ ...current, [orderKey]: response.data }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Return eligibility is not available for this order.";
      setReturnEligibilityError((current) => ({ ...current, [orderKey]: message }));
    } finally {
      pendingReturnEligibilityKeys.current.delete(orderKey);
      setIsLoadingReturnEligibility((current) => ({ ...current, [orderKey]: false }));
    }
  };

  const handleRequestSubmit = async (payload: {
    orderKey: string;
    order: OrderSummary;
    orderlineid: number;
    requesttype: ReturnRequestType;
    requestedquantity: number;
    policyreasonruleid?: number | null;
    reasoncode: string;
    requestedresolution: string;
    ispackageopened: boolean;
    additionalremarks: string;
    evidence: Array<{ file: File; attachmenttype: AttachmentType; isrequired?: boolean }>;
  }) => {
    const submissionKey = [
      payload.orderlineid,
      payload.requesttype,
      payload.policyreasonruleid || payload.reasoncode,
      payload.reasoncode,
      payload.requestedresolution,
      payload.requestedquantity,
    ].join(":");

    if (pendingReturnSubmissionKeys.current.has(submissionKey)) {
      throw new Error("This request is already being submitted.");
    }

    pendingReturnSubmissionKeys.current.add(submissionKey);
    const uploadedAttachments = [];
    try {
      const orderIdentifier = payload.order.orderid ?? payload.order.id ?? getOrderIdentifier(payload.order);
      for (const item of payload.evidence) {
        const response = await returnSourceService.uploadEvidence(item.file, item.attachmenttype, orderIdentifier);
        uploadedAttachments.push(response);
      }

      await returnSourceService.createRequest({
        orderlineid: payload.orderlineid,
        requesttype: payload.requesttype,
        requestedquantity: payload.requestedquantity,
        policyreasonruleid: payload.policyreasonruleid || undefined,
        reasoncode: payload.reasoncode,
        requestedresolution: payload.requestedresolution as any,
        ispackageopened: payload.ispackageopened,
        additionalremarks: payload.additionalremarks,
        attachments: uploadedAttachments.map((item) => ({
          attachmenttype: item.attachmenttype,
          fileurl: item.fileurl,
          isrequired: payload.evidence.some((draft) => draft.attachmenttype === item.attachmenttype && draft.isrequired),
        })),
      });

      const identifier = getOrderIdentifier(payload.order);
      if (identifier) {
        try {
          const eligibilityResponse = await returnSourceService.getOrderEligibility(identifier);
          setReturnEligibility((current) => ({
            ...current,
            [payload.orderKey]: eligibilityResponse.data,
          }));
        } catch (err) {
          setReturnEligibility((current) => {
            const next = { ...current };
            delete next[payload.orderKey];
            return next;
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["orders", userId] });
      await fetchReturnRequests();
      setStatusMessage(`${payload.requesttype === "replacement" ? "Replacement" : "Return"} request submitted successfully.`);
      setActiveModal(null);
    } finally {
      pendingReturnSubmissionKeys.current.delete(submissionKey);
    }
  };

  const handleTrackOrder = async (details: OrderDetails, index: number) => {
    const order = details.order;
    const identifier = getOrderIdentifier(order);
    const orderKey = getOrderKey(order, index);

    if (!identifier) {
      setTrackingErrorByOrder((current) => ({
        ...current,
        [orderKey]: "Tracking is not available for this order yet.",
      }));
      return;
    }

    setTrackingOrderKey(orderKey);
    setTrackingErrorByOrder((current) => ({ ...current, [orderKey]: "" }));

    try {
      const response = await orderService.track(identifier);
      setTrackingByOrder((current) => ({ ...current, [orderKey]: response.data }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not fetch tracking for this order.";
      setTrackingErrorByOrder((current) => ({ ...current, [orderKey]: message }));
    } finally {
      setTrackingOrderKey(null);
    }
  };

  const handleLoadDetails = async (details: OrderDetails, index: number) => {
    const order = details.order;
    const identifier = getOrderIdentifier(order);
    const orderKey = getOrderKey(order, index);

    if (!identifier) {
      setDetailsErrorByOrder((current) => ({
        ...current,
        [orderKey]: "Order details are not available yet.",
      }));
      return;
    }

    setDetailsOrderKey(orderKey);
    setDetailsErrorByOrder((current) => ({ ...current, [orderKey]: "" }));

    try {
      const response = await orderService.details(identifier);
      const normalizedDetails = normalizeOrderDetails(response.data);
      if (!normalizedDetails) {
        throw new Error("Order details are not available yet.");
      }
      setDetailsByOrder((current) => ({ ...current, [orderKey]: normalizedDetails }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not fetch order details.";
      setDetailsErrorByOrder((current) => ({ ...current, [orderKey]: message }));
    } finally {
      setDetailsOrderKey(null);
    }
  };

  const handleRefreshOrder = async (details: OrderDetails, index: number) => {
    const order = details.order;
    const identifier = getOrderIdentifier(order);
    const orderKey = getOrderKey(order, index);

    setRefreshOrderKey(orderKey);
    setDetailsErrorByOrder((current) => ({ ...current, [orderKey]: "" }));
    setTrackingErrorByOrder((current) => ({ ...current, [orderKey]: "" }));

    try {
      await queryClient.invalidateQueries({ queryKey: ["orders", userId] });
      await queryClient.refetchQueries({ queryKey: ["orders", userId], type: "active" });

      if (identifier) {
        try {
          const detailsResponse = await orderService.details(identifier);
          const normalizedDetails = normalizeOrderDetails(detailsResponse.data);
          if (normalizedDetails) {
            setDetailsByOrder((current) => ({ ...current, [orderKey]: normalizedDetails }));
          }
        } catch {
          setDetailsByOrder((current) => {
            const next = { ...current };
            delete next[orderKey];
            return next;
          });
        }

        try {
          const trackingResponse = await orderService.track(identifier);
          setTrackingByOrder((current) => ({ ...current, [orderKey]: trackingResponse.data }));
        } catch {
          // Tracking may not exist for every order status. The refreshed order details still update the customer timeline.
        }
      }
    } finally {
      setRefreshOrderKey(null);
    }
  };

  const handleCancelOrder = async (details: OrderDetails, index: number) => {
    const order = details.order;
    const identifier = getOrderIdentifier(order);
    const orderKey = getOrderKey(order, index);

    if (!identifier) {
      setCancelErrorByOrder((current) => ({
        ...current,
        [orderKey]: "This order cannot be cancelled right now.",
      }));
      return;
    }

    if (!window.confirm("Cancel this order?")) return;

    setCancelOrderKey(orderKey);
    setCancelErrorByOrder((current) => ({ ...current, [orderKey]: "" }));
    setStatusMessage("");

    try {
      await orderService.cancel(identifier, userId!);
      await queryClient.invalidateQueries({ queryKey: ["orders", userId] });
      await queryClient.refetchQueries({ queryKey: ["orders", userId], type: "active" });
      setStatusMessage("Order cancelled successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not cancel this order.";
      setCancelErrorByOrder((current) => ({ ...current, [orderKey]: message }));
    } finally {
      setCancelOrderKey(null);
    }
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-12">
        <section className="mx-auto max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <UserRound className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
          <h1 className="mt-5 text-2xl font-bold text-[var(--color-text)]">Login to view orders</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Your order history and tracking details are linked to your account.</p>
          <Link to="/login" className="mt-6 inline-flex">
            <Button>Login with OTP</Button>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      {activeModal && (
        <ReturnRequestModal
          modal={activeModal}
          onClose={() => setActiveModal(null)}
          onSubmit={handleRequestSubmit}
        />
      )}
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">Account</p>
            <Link
              to="/account"
              className="inline-flex min-h-8 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-[var(--color-secondary)] transition hover:bg-[var(--color-surface)]"
            >
              Back to account
            </Link>
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[var(--color-text)]">Orders</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Manage order history, tracking, and purchased items.</p>
          </div>
        </div>

        {orders.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryStat label="Total orders" value={String(orderSummary.total)} />
            <SummaryStat label="Total spent" value={formatCurrency(orderSummary.totalSpent)} />
            <SummaryStat label="Active" value={String(orderSummary.active)} />
            <SummaryStat label="Cancelled" value={String(orderSummary.cancelled)} />
          </div>
        )}

        <section>
          {statusMessage && (
            <div className="mb-5 rounded-[var(--radius-sm)] border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
              {statusMessage}
            </div>
          )}
          {ordersQuery.isLoading ? (
            <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-secondary)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading orders
            </div>
          ) : ordersQuery.isError ? (
            <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-600">
              Could not load your orders. Please try again.
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((details, index) => {
                const orderKey = getOrderKey(details.order, index);
                const displayedDetails = detailsByOrder[orderKey] ?? details;
                const tracking = trackingByOrder[orderKey];
                const trackingError = trackingErrorByOrder[orderKey];
                const detailsError = detailsErrorByOrder[orderKey];
                const cancelError = cancelErrorByOrder[orderKey];
                const hasLoadedDetails = Boolean(detailsByOrder[orderKey]);
                const isExpanded = expandedOrderKey === orderKey;
                const statusAnchorId = orderStatusAnchorId(orderKey);

                return (
                  <OrderCard
                    key={orderKey}
                    statusAnchorId={statusAnchorId}
                    details={displayedDetails}
                    tracking={tracking}
                    trackingError={trackingError}
                    detailsError={detailsError}
                    cancelError={cancelError}
                    returnEligibility={returnEligibility[orderKey]}
                    returnEligibilityError={returnEligibilityError[orderKey]}
                    returnRequestsByLine={returnRequestsByLine}
                    returnRequestsError={returnRequestsError}
                    isTracking={trackingOrderKey === orderKey}
                    isLoadingDetails={detailsOrderKey === orderKey}
                    isCancelling={cancelOrderKey === orderKey}
                    isRefreshing={refreshOrderKey === orderKey}
                    isLoadingReturnRequests={isLoadingReturnRequests}
                    isLoadingReturnEligibility={isLoadingReturnEligibility[orderKey]}
                    hasCheckedReturnEligibility={Boolean(returnEligibility[orderKey] || returnEligibilityError[orderKey])}
                    hasReturnableItems={Boolean(returnEligibility[orderKey] && returnEligibility[orderKey].eligibleitemcount > 0)}
                    isExpanded={isExpanded}
                    onTrack={async () => {
                      if (isExpanded) {
                        setExpandedOrderKey(null);
                        return;
                      }

                      setExpandedOrderKey(orderKey);
                      scrollToOrderStatus(orderKey);
                      await handleTrackOrder(displayedDetails, index);
                    }}
                    onRefreshTracking={async () => {
                      setExpandedOrderKey(orderKey);
                      await handleTrackOrder(displayedDetails, index);
                    }}
                    onRefreshOrder={() => handleRefreshOrder(displayedDetails, index)}
                    onShowReturnOptions={() => {
                      if (!isExpanded) {
                        setExpandedOrderKey(orderKey);
                      }
                      if (!hasLoadedDetails) {
                        handleLoadDetails(displayedDetails, index);
                      }
                      handleFetchEligibility(displayedDetails, index);
                    }}
                    onToggleDetails={() => {
                      if (isExpanded) {
                        setExpandedOrderKey(null);
                        return;
                      }

                      setExpandedOrderKey(orderKey);
                      if (!hasLoadedDetails) {
                        handleLoadDetails(displayedDetails, index);
                      }
                      handleFetchEligibility(displayedDetails, index);
                    }}
                    onRequestReturn={(line, type, item) => {
                      setActiveModal({
                        orderKey,
                        order: displayedDetails.order,
                        line,
                        item,
                        requesttype: type,
                      });
                    }}
                    onCancel={() => handleCancelOrder(displayedDetails, index)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-8 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
              <h2 className="mt-4 text-xl font-bold text-[var(--color-text)]">No orders yet</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">Your completed purchases will appear here with line items and tracking.</p>
              <Link to="/products" className="mt-6 inline-flex">
                <Button>Shop Products</Button>
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
    </>
  );
};

function OrderCard({
  statusAnchorId,
  details,
  tracking,
  trackingError,
  detailsError,
  cancelError,
  returnEligibility,
  returnEligibilityError,
  returnRequestsByLine,
  returnRequestsError,
  isTracking,
  isLoadingDetails,
  isCancelling,
  isRefreshing,
  isLoadingReturnRequests,
  isLoadingReturnEligibility,
  hasCheckedReturnEligibility,
  hasReturnableItems,
  isExpanded,
  onTrack,
  onRefreshTracking,
  onRefreshOrder,
  onShowReturnOptions,
  onToggleDetails,
  onRequestReturn,
  onCancel,
}: {
  statusAnchorId: string;
  details: OrderDetails;
  tracking?: TrackingDetails;
  trackingError?: string;
  detailsError?: string;
  cancelError?: string;
  returnEligibility?: OrderReturnEligibility;
  returnEligibilityError?: string;
  returnRequestsByLine: Record<string, ReturnRequestSummary[]>;
  returnRequestsError?: string;
  isTracking: boolean;
  isLoadingDetails: boolean;
  isCancelling: boolean;
  isRefreshing: boolean;
  isLoadingReturnRequests: boolean;
  isLoadingReturnEligibility: boolean;
  hasCheckedReturnEligibility: boolean;
  hasReturnableItems: boolean;
  isExpanded: boolean;
  onTrack: () => void;
  onRefreshTracking: () => void;
  onRefreshOrder: () => void;
  onShowReturnOptions: () => void;
  onToggleDetails: () => void;
  onRequestReturn: (line: OrderLine, type: ReturnRequestType, item: any) => void;
  onCancel: () => void;
}) {
  const { order, orderlines = [], address } = details;
  const invoiceUrl = getString(order, ["invoiceurl", "invoice_url", "order_invoice_url", "invoiceUrl"]);
  const displayStatus = order.orderstatus || tracking?.order_status || tracking?.ekart_tracking?.status;
  const statusHistory = getStatusHistory(details, tracking, displayStatus);
  const cancellable = isOrderCancellable(order.orderstatus);
  const statusTone = getStatusTone(displayStatus);
  const cancelled = isCancelledStatus(displayStatus);
  const highlighted = /transit|dispatch|ship|delivery/i.test(displayStatus || "") && !cancelled;
  const cardClass = [
    "overflow-hidden border bg-white transition hover:border-[var(--color-muted)]",
    highlighted
      ? "rounded-r-[var(--radius-md)] border-l-4 border-l-[#378ADD] border-[var(--color-border)]"
      : "rounded-[var(--radius-md)] border-[var(--color-border)]",
    cancelled ? "opacity-75" : "",
  ].filter(Boolean).join(" ");
  const canUseReturnFlow = isOrderReturnFlowAvailable(displayStatus || order.orderstatus);
  const hasPolicyEligibleItems = Boolean(returnEligibility?.items.some(hasAnyReturnPolicy));
  const returnEligibilityNotice = returnEligibility ? getReturnEligibilityNotice(returnEligibility) : "";

  const returnBtnLabel = isLoadingReturnEligibility
    ? "Checking"
    : hasReturnableItems
    ? "Return / Replace"
    : hasCheckedReturnEligibility && hasPolicyEligibleItems
    ? "View Return Policy"
    : hasCheckedReturnEligibility
    ? "View Return Status"
    : "Return / Replace";

  return (
    <article className={cardClass}>
      <div className={`p-4 sm:p-5 ${isExpanded || detailsError || cancelError ? "border-b border-[var(--color-border)]" : ""}`}>
        <div
          role="button"
          tabIndex={isLoadingDetails ? -1 : 0}
          className={cn(
            "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-left sm:flex sm:items-center sm:justify-between",
            isLoadingDetails && "pointer-events-none opacity-70"
          )}
          onClick={onToggleDetails}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggleDetails();
            }
          }}
          aria-label={isExpanded ? "Hide order details" : "Show order details"}
          aria-expanded={isExpanded}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ReceiptText className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
            <span className="min-w-0 break-words text-sm font-semibold text-[var(--color-text)]">
              {String(order.orderid ?? order.id ?? "Order")}
            </span>
            <StatusBadge status={displayStatus} tone={statusTone} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] transition hover:bg-[var(--color-surface)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              onClick={(event) => {
                event.stopPropagation();
                onRefreshOrder();
              }}
              onKeyDown={(event) => event.stopPropagation()}
              disabled={isRefreshing}
              aria-label="Refresh order status"
              title="Refresh order status"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </button>
            <span className={cn("text-sm font-semibold", cancelled ? "text-[var(--color-muted)]" : "text-[var(--color-text)]")}>
              {formatCurrency(order.orderamount)}
            </span>
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] transition hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
                isExpanded && "border-[var(--color-secondary)] bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary)]"
              )}
              aria-hidden="true"
            >
              {isLoadingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Placed {formatDate(order.createddate)}
            </span>
            <span aria-hidden="true">.</span>
            <span className={cn("inline-flex items-center gap-1", invoiceUrl && "text-[var(--color-secondary)]")}>
              <ReceiptText className="h-3.5 w-3.5" />
              {invoiceUrl ? "Invoice available" : "Invoice pending"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {invoiceUrl ? (
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-secondary)] bg-white px-3 text-xs font-semibold text-[var(--color-secondary)] transition hover:bg-[var(--color-surface)] sm:px-4"
              >
                <Download className="h-3.5 w-3.5" />
                Invoice
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {canUseReturnFlow ? (
              <Button
                variant={hasReturnableItems ? "primary" : "secondary"}
                className={cn("min-h-9 gap-2 px-3 text-xs sm:px-4", hasReturnableItems && "ring-1 ring-[var(--color-primary)]")}
                disabled={isLoadingReturnEligibility}
                onClick={onShowReturnOptions}
                title={hasReturnableItems ? "Start a return or replacement" : "View return and replacement options"}
              >
                {isLoadingReturnEligibility ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {returnBtnLabel}
              </Button>
            ) : null}
            <Button variant="secondary" className="min-h-9 gap-2 px-3 text-xs sm:px-4" disabled={isTracking} onClick={onTrack}>
              {isTracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
              Track
            </Button>
            {cancellable && (
              <Button variant="secondary" className="min-h-9 gap-2 border-red-200 px-3 text-xs text-red-600 hover:bg-red-50 sm:px-4" disabled={isCancelling} onClick={onCancel}>
                {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {(detailsError || cancelError) && (
        <div className="border-b border-[var(--color-border)] p-4">
          <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
            {detailsError || cancelError}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <ShoppingBag className="h-4 w-4 text-[var(--color-muted)]" />
                Order items
              </h2>
              <span className="text-xs text-[var(--color-muted)]">{orderlines.length} item(s)</span>
            </div>

            {orderlines.length > 0 ? (
              <div className="space-y-2">
                {canUseReturnFlow && returnEligibility && !isLoadingReturnEligibility && (
                  returnEligibility.eligibleitemcount > 0 || 
                  normalizeStatusKey(order.orderstatus || "") === "delivered" || 
                  normalizeStatusKey(order.orderstatus || "") === "completed"
                ) && (
                  <div className={cn(
                    "rounded-[var(--radius-sm)] border p-3 text-xs font-semibold",
                    returnEligibility.eligibleitemcount > 0 ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800"
                  )}>
                    {returnEligibility.eligibleitemcount > 0 ? "Select Return or Replace on the item you need help with." : returnEligibilityNotice}
                  </div>
                )}
                {returnEligibilityError && (
                  <div className="rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    {returnEligibilityError}
                  </div>
                )}
                {isLoadingReturnEligibility && (
                  <div className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-3 text-xs font-semibold text-[var(--color-secondary)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking return options
                  </div>
                )}
                {orderlines.map((line, index) => {
                  const eligibilityItem = canUseReturnFlow
                    ? returnEligibility?.items.find((item: any) => Number(item.orderlineid) === Number(line.id))
                    : undefined;
                  const lineReturnRequests = returnRequestsByLine[String(eligibilityItem?.orderlineid ?? line.id ?? "")] || [];
                  return (
                    <OrderLineRow
                      key={String(line.id ?? line.orderlinenumber ?? index)}
                      line={line}
                      eligibilityItem={eligibilityItem}
                      returnRequests={lineReturnRequests}
                      isEligibilityLoading={isLoadingReturnEligibility}
                      isLoadingReturnRequests={isLoadingReturnRequests}
                      onRequestReturn={onRequestReturn}
                    />
                  );
                })}
                {Number(order.shipping_cost || 0) > 0 ? (
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-muted)]">
                    <span>Shipping charges</span>
                    <span>{formatCurrency(order.shipping_cost)}</span>
                  </div>
                ) : null}
                <div className={cn(
                  "flex items-center justify-between text-sm font-semibold text-[var(--color-text)]",
                  Number(order.shipping_cost || 0) > 0
                    ? "pt-1"
                    : "mt-3 border-t border-[var(--color-border)] pt-3"
                )}>
                  <span>Order total</span>
                  <span>{formatCurrency(order.orderamount)}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
                Line items are not available for this order.
              </div>
            )}
          </section>

          <aside id={statusAnchorId} className="scroll-mt-24 space-y-4">
            <AddressPanel address={address} />
            {returnRequestsError && (
              <section className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
                {returnRequestsError}
              </section>
            )}
            {(tracking || trackingError) && <TrackingPanel tracking={tracking} trackingError={trackingError} />}
            {statusHistory.length > 0 && <StatusHistory history={statusHistory} isRefreshing={isTracking} onRefresh={onRefreshTracking} />}
          </aside>
        </div>
      )}
    </article>
  );
}

function normalizeOrderDetails(raw: unknown): OrderDetails | null {
  if (!isRecord(raw)) return null;

  const nestedOrder = isRecord(raw.order) ? raw.order : null;
  const orderSource = nestedOrder ?? raw;
  const id = getNumber(orderSource, ["id"]);
  const orderid = getString(orderSource, ["orderid"]);

  if (!id && !orderid) return null;

  return {
    ...raw,
    order: {
      ...orderSource,
      id,
      orderid,
      orderamount: getNumber(orderSource, ["orderamount"]),
      productamount: getNumber(orderSource, ["productamount"]),
      discountamount: getNumber(orderSource, ["discountamount"]),
      promotion_discount_total: getNumber(orderSource, ["promotion_discount_total"]),
      original_total: getNumber(orderSource, ["original_total"]),
      shipping_cost: getNumber(orderSource, ["shipping_cost"]),
      orderstatus: getString(orderSource, ["orderstatus"]),
      createddate: getNumber(orderSource, ["createddate"]),
      modifieddate: getNumber(orderSource, ["modifieddate"]),
      mode: getString(orderSource, ["mode"]),
    },
    orderlines: Array.isArray(raw.orderlines) ? raw.orderlines : [],
    address: isRecord(raw.address) ? raw.address : null,
    status_history: Array.isArray(raw.status_history) ? raw.status_history : undefined,
    statusHistory: Array.isArray(raw.statusHistory) ? raw.statusHistory : undefined,
  };
}

function isOrderCancellable(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase().replace(/[_\s-]+/g, "_");
  if (!normalized) return true;

  const blockedStatuses = new Set([
    "cancelled",
    "canceled",
    "delivered",
    "completed",
    "order_completed",
    "refunded",
    "shipped",
  ]);

  return !blockedStatuses.has(normalized);
}

function isOrderReturnFlowAvailable(status?: string | null) {
  const normalized = normalizeStatusKey(status || "");
  return ["delivered", "completed", "order_completed"].includes(normalized);
}

function isCancelledStatus(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  return normalized.includes("cancel");
}

function getStatusTone(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized.includes("cancel")) return "cancel";
  if (normalized.includes("transit") || normalized.includes("ship")) return "transit";
  if (normalized.includes("payment") && normalized.includes("completed")) return "success";
  if (normalized.includes("ready") || normalized.includes("dispatch") || normalized.includes("pending")) return "pending";
  return "success";
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-white p-4">
      <div className="text-xl font-semibold text-[var(--color-text)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  );
}

function StatusBadge({ status, tone }: { status?: string | null; tone: string }) {
  const toneClass =
    tone === "cancel"
      ? "bg-red-50 text-red-700"
      : tone === "transit"
        ? "bg-blue-50 text-blue-700"
        : tone === "pending"
          ? "bg-amber-50 text-amber-700"
          : "bg-green-50 text-green-700";
  const Icon = tone === "cancel" ? Ban : tone === "transit" ? Truck : tone === "pending" ? PackageCheck : CheckCircle2;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", toneClass)}>
      <Icon className="h-3 w-3" />
      {formatStatus(status)}
    </span>
  );
}

function OrderLineRow({
  line,
  eligibilityItem,
  returnRequests,
  isEligibilityLoading,
  isLoadingReturnRequests,
  onRequestReturn,
}: {
  line: OrderLine;
  eligibilityItem?: any;
  returnRequests: ReturnRequestSummary[];
  isEligibilityLoading: boolean;
  isLoadingReturnRequests: boolean;
  onRequestReturn: (line: OrderLine, type: ReturnRequestType, item: any) => void;
}) {
  const image = getLineImage(line);
  const productPath = line.productid ? `/products/${line.productid}` : "";
  const isReturnEligible = Boolean(eligibilityItem?.return?.eligible);
  const isReplacementEligible = Boolean(eligibilityItem?.replacement?.eligible);
  const isAnyEligible = isReturnEligible || isReplacementEligible;
  const hasOpenReturnRequest = returnRequests.some((request) => !isReturnRequestTerminal(request.status));
  const hasRejectedRequest = returnRequests.some((request) =>
    ["rejected", "evidence_rejected", "inspection_rejected"].includes(normalizeStatusKey(request.status || ""))
  );

  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white">
          {image ? (
            <img src={image} alt={line.productname || "Order item"} className="h-full w-full object-cover" />
          ) : (
            <PackageCheck className="h-5 w-5 text-[var(--color-muted)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {productPath ? (
            <Link to={productPath} className="line-clamp-2 text-sm font-semibold text-[var(--color-text)] transition hover:text-[var(--color-secondary)]">
              {line.productname || "Product"}
            </Link>
          ) : (
            <h3 className="line-clamp-2 text-sm font-semibold text-[var(--color-text)]">
              {line.productname || "Product"}
            </h3>
          )}
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Qty: {Number(line.quantity || 0)}
            {line.orderstatus ? (
              <>
                <span aria-hidden="true"> . </span>
                <span className="font-semibold text-[var(--color-secondary)]">{formatStatus(line.orderstatus)}</span>
              </>
            ) : null}
          </p>
          {eligibilityItem && !isAnyEligible && eligibilityItem.blockers?.length > 0 ? (
            <p className="mt-2 inline-flex items-start gap-1 rounded-[var(--radius-sm)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-muted)]">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {eligibilityItem.blockers[0]}
            </p>
          ) : null}
          {isLoadingReturnRequests ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-muted)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading return status
            </p>
          ) : returnRequests.length > 0 ? (
            <ReturnRequestStatusList requests={returnRequests} />
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {formatCurrency(line.orderamount)}
          </p>
          {isEligibilityLoading ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-muted)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking
            </span>
          ) : eligibilityItem && isAnyEligible && !hasOpenReturnRequest && !hasRejectedRequest ? (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex flex-wrap justify-end gap-2">
                {isReturnEligible && (
                  <Button
                    variant="secondary"
                    className="min-h-8 gap-1.5 border-[var(--color-border)] bg-white px-3 text-[11px] text-[var(--color-secondary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                    onClick={() => onRequestReturn(line, "return", eligibilityItem)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Return
                  </Button>
                )}
                {isReplacementEligible && (
                  <Button
                    variant="secondary"
                    className="min-h-8 gap-1.5 border-[var(--color-border)] bg-white px-3 text-[11px] text-[var(--color-secondary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                    onClick={() => onRequestReturn(line, "replacement", eligibilityItem)}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Replace
                  </Button>
                )}
              </div>
              {getRemainingClaimDuration(eligibilityItem) && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-[var(--radius-sm)] border border-amber-100">
                  Remaining: {getRemainingClaimDuration(eligibilityItem)}
                </span>
              )}
            </div>
          ) : hasOpenReturnRequest ? (
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--color-secondary)]">
              Request active
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReturnRequestStatusList({ requests }: { requests: ReturnRequestSummary[] }) {
  const ordered = [...requests].sort((a, b) => Number(b.createddate || 0) - Number(a.createddate || 0));

  return (
    <div className="mt-3 space-y-2">
      {ordered.map((request) => {
        const tone = getReturnRequestTone(request.status);
        const timeline = getReturnRequestTimeline(request);
        return (
          <div key={request.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[var(--color-text)]">
                  {request.requesttype === "replacement" ? "Replacement" : "Return"} request {request.requestnumber}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[var(--color-muted)]">
                  {formatStatus(request.reason || request.reasoncode)} | Qty {request.requestedquantity || 1} | {formatStatus(request.requestedresolution)}
                </p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", tone)}>
                {formatStatus(getCustomerReturnStatus(request))}
              </span>
            </div>
            {getReturnRequestIssue(request) && (
              <p className="mt-2 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
                {getReturnRequestIssue(request)}
              </p>
            )}
            {/* Amazon-style Progress Tracker */}
            <div className="mt-5 mb-8 px-4">
              <div className="relative flex items-center justify-between">
                {/* Background line */}
                <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200" />
                
                {/* Colored progress bar overlay */}
                {(() => {
                  const failedIdx = timeline.findIndex(s => s.failed);
                  const isFailed = failedIdx !== -1;
                  const progressWidth = isFailed
                    ? (failedIdx * (100 / (timeline.length - 1)))
                    : (timeline.every(s => s.done)
                      ? 100
                      : timeline.findIndex(s => s.current) * (100 / (timeline.length - 1)));
                  return (
                    <div 
                      className={cn(
                        "absolute left-0 top-1/2 h-0.5 -translate-y-1/2 transition-all duration-300",
                        isFailed ? "bg-red-500" : "bg-green-500"
                      )}
                      style={{ width: `${progressWidth}%` }}
                    />
                  );
                })()}

                {/* Step indicators */}
                {timeline.map((step, idx) => {
                  const isActive = step.done || step.current || step.failed;
                  return (
                    <div key={step.label} className="relative z-10 flex flex-col items-center">
                      {/* Step Circle */}
                      <div 
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-300",
                          step.done 
                            ? "border-green-500 bg-green-500 text-white" 
                            : step.failed
                              ? "border-red-500 bg-red-500 text-white"
                              : step.current 
                                ? "border-[#378ADD] bg-white text-[#378ADD] ring-4 ring-blue-50" 
                                : "border-slate-300 bg-white text-slate-400"
                        )}
                      >
                        {step.done ? (
                          "✓"
                        ) : step.failed ? (
                          "✗"
                        ) : (
                          idx + 1
                        )}
                      </div>
                      
                      {/* Label underneath */}
                      <span 
                        className={cn(
                          "absolute top-7 w-20 text-center text-[10px] font-bold transition-colors duration-200",
                          isActive 
                            ? (step.failed ? "text-red-500" : "text-[var(--color-text)]") 
                            : "text-slate-400"
                        )}
                        style={{ left: "50%", transform: "translateX(-50%)" }}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {request.statusTimeline?.length ? (
              <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
                {request.statusTimeline.slice(-4).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2">
                    <span className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      normalizeStatusKey(entry.status) === normalizeStatusKey(request.status) ? "bg-[#378ADD]" : "bg-green-500"
                    )} />
                    <div>
                      <p className="text-[11px] font-bold text-[var(--color-text)]">
                        {entry.message || formatStatus(entry.status)}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--color-muted)]">
                        {formatDate(entry.createddate)} | {formatStatus(entry.status)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function isReturnRequestTerminal(status?: string | null) {
  return [
    "completed",
    "cancelled",
    "rejected",
    "evidence_rejected",
    "inspection_rejected",
    "refund_completed",
    "replacement_delivered",
    "missing_item_shipped",
  ].includes(normalizeStatusKey(status || ""));
}

function getCustomerReturnStatus(request: ReturnRequestSummary) {
  const status = normalizeStatusKey(request.status || "");
  if (status === "evidence_pending") return "Evidence under review";
  if (status === "evidence_approved") return "Evidence approved";
  if (status === "evidence_rejected") return "Evidence rejected";
  if (status === "approved") return "Approved";
  if (status === "pickup_prepared" || status === "pickup_created") return "Pickup scheduled";
  if (status === "in_transit") return "Pickup in transit";
  if (status === "received_at_warehouse") return "Received at warehouse";
  if (status === "inspection_pending") return "Warehouse inspection";
  if (status === "inspection_approved") return request.requesttype === "replacement" ? "Replacement processing" : "Refund processing";
  if (status === "inspection_rejected") return "Rejected after inspection";
  if (status === "refund_pending") return "Refund pending";
  if (status === "refund_completed") return "Refund completed";
  if (status === "replacement_pending") return "Replacement pending";
  if (status === "replacement_shipped") return "Replacement shipped";
  if (status === "replacement_delivered") return "Replacement delivered";
  if (status === "missing_item_pending") return "Missing item pending";
  if (status === "missing_item_shipped") return "Missing item shipped";
  return request.status || "Requested";
}

function getReturnRequestTone(status?: string | null) {
  const normalized = normalizeStatusKey(status || "");
  if (normalized.includes("reject")) return "bg-red-50 text-red-700";
  if (normalized.includes("completed") || normalized.includes("delivered")) return "bg-green-50 text-green-700";
  if (normalized.includes("pickup") || normalized.includes("transit") || normalized.includes("shipped")) return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function getReturnRequestIssue(request: ReturnRequestSummary) {
  return request.evidenceRejectionReason || request.requestRejectionReason || request.receivedRemarks || "";
}

function getReturnRequestTimeline(request: ReturnRequestSummary) {
  const status = normalizeStatusKey(request.status || "");
  const isRejected = ["rejected", "evidence_rejected", "inspection_rejected"].includes(status);
  const isCancelled = status === "cancelled";

  let steps = ["Requested", "Approved", "Pickup"];
  if (isRejected) {
    steps.push("Rejected");
  } else if (isCancelled) {
    steps.push("Cancelled");
  } else {
    steps.push(request.requesttype === "replacement" ? "Replacement" : "Refund");
  }

  const rankByStatus: Record<string, number> = {
    requested: 0,
    evidence_pending: 0,
    rejected: 1,
    evidence_rejected: 1,
    cancelled: 1,
    evidence_approved: 1,
    approved: 1,
    pickup_prepared: 2,
    pickup_created: 2,
    in_transit: 2,
    received_at_warehouse: 2,
    inspection_pending: 2,
    inspection_rejected: 3,
    inspection_approved: 3,
    refund_pending: 3,
    refund_completed: 3,
    replacement_pending: 3,
    replacement_shipped: 3,
    replacement_delivered: 3,
    missing_item_pending: 3,
    missing_item_shipped: 3,
    completed: 3,
  };

  let rank = rankByStatus[status] ?? 0;

  if (status === "rejected" || status === "evidence_rejected") {
    steps = ["Requested", "Rejected"];
    rank = 1;
  } else if (status === "cancelled") {
    steps = ["Requested", "Cancelled"];
    rank = 1;
  }

  return steps.map((label, index) => {
    const isTerminalStep = index === steps.length - 1;
    const terminalIsSuccess = isTerminalStep && !isRejected && !isCancelled && isReturnRequestTerminal(status);
    const terminalIsFailure = isTerminalStep && (isRejected || isCancelled) && isReturnRequestTerminal(status);
    
    return {
      label,
      done: index < rank || terminalIsSuccess,
      current: index === rank && !isReturnRequestTerminal(status),
      failed: terminalIsFailure,
    };
  });
}

function hasAnyReturnPolicy(item: ReturnEligibilityItem) {
  return Boolean(item.return?.policyeligible || item.replacement?.policyeligible);
}

function getReturnEligibilityNotice(eligibility: OrderReturnEligibility) {
  if (eligibility.itemcount <= 0) {
    return "Return or replacement details are not available for this order.";
  }

  const hasPolicyEligibleItems = eligibility.items.some(hasAnyReturnPolicy);
  const isBlockedBeforeDelivery = eligibility.items.some((item) =>
    item.blockers?.some((blocker) => /not delivered|delivery date unavailable/i.test(blocker))
  );

  if (isBlockedBeforeDelivery && hasPolicyEligibleItems) {
    return "Return/replacement policy applies to this item. Requests can be raised after delivery.";
  }

  if (isBlockedBeforeDelivery) {
    return "Return/replacement requests can be raised after delivery.";
  }

  const firstBlocker = eligibility.items.flatMap((item) => item.blockers || [])[0];
  return firstBlocker || "No items in this order are currently eligible for return or replacement.";
}

function AddressPanel({ address }: { address?: OrderAddress | null }) {
  if (!address) {
    return (
      <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <MapPin className="h-4 w-4 text-[var(--color-muted)]" />
          Delivery Address
        </h2>
        <p className="mt-3 text-xs leading-6 text-[var(--color-muted)]">Address details are unavailable.</p>
      </section>
    );
  }

  const addressLine = [address.doornumber, address.address, address.landmark, address.city, address.state]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
        <MapPin className="h-4 w-4 text-[var(--color-muted)]" />
        Delivery Address
      </h2>
      <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">{address.name || "Customer"}</p>
      <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
        {addressLine}
        {address.pincode ? ` - ${address.pincode}` : ""}
      </p>
      {address.mobilenumber && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-secondary)]">
          <Phone className="h-3 w-3" />
          {address.mobilenumber}
        </p>
      )}
    </section>
  );
}

function TrackingPanel({ tracking, trackingError }: { tracking?: TrackingDetails; trackingError?: string }) {
  if (trackingError) {
    return (
      <section className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
        {trackingError}
      </section>
    );
  }

  if (!tracking) {
    return null;
  }

  const ekart = tracking.ekart_tracking;
  const trackingLink = tracking.public_tracking_link;

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
        <Truck className="h-4 w-4 text-[var(--color-muted)]" />
        Tracking
      </h2>
      <div className="mt-3 space-y-2 text-xs leading-6">
        <p className="text-sm font-semibold text-[var(--color-text)]">{formatStatus(tracking.order_status || ekart?.status)}</p>
        {tracking.tracking_id && <p className="text-[var(--color-muted)]">Tracking ID: {tracking.tracking_id}</p>}
        {tracking.vendor && <p className="text-[var(--color-muted)]">Courier: {tracking.vendor}</p>}
        {ekart?.current_location && <p className="text-[var(--color-muted)]">Location: {ekart.current_location}</p>}
        {ekart?.description && <p className="text-[var(--color-muted)]">{ekart.description}</p>}
      </div>
      {trackingLink && (
        <a
          href={trackingLink}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-text)]"
        >
          Open courier tracking
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </section>
  );
}

function StatusHistory({ history, isRefreshing, onRefresh }: { history: unknown[]; isRefreshing: boolean; onRefresh: () => void }) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <RefreshCw className="h-4 w-4 text-[var(--color-muted)]" />
          Status History
        </h2>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] transition hover:bg-[var(--color-surface)] disabled:opacity-60"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh tracking status"
          title="Refresh tracking status"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </button>
      </div>
      <div className="mt-3">
        {history.slice(0, 4).map((item, index) => {
          const row = isRecord(item) ? item : {};
          const status = getHistoryStatus(item, index);
          const date = getHistoryDate(row);
          const description = getHistoryDescription(item);
          const isCurrent = index === 0;

          return (
            <div key={index} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex w-5 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "mt-1 h-2.5 w-2.5 rounded-full border-2 border-white outline outline-2",
                    isCurrent ? "bg-[#378ADD] outline-[#378ADD]" : "bg-[var(--color-muted)] outline-[var(--color-border)]"
                  )}
                />
                {index < history.slice(0, 4).length - 1 && <span className="mt-2 min-h-5 w-px flex-1 bg-[var(--color-border)]" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold", isCurrent ? "text-[var(--color-text)]" : "text-[var(--color-muted)]")}>
                  {status.includes(":") ? status : formatStatus(status)}
                </p>
                {(date || description) && (
                  <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
                    {date ? `Changed: ${date}` : ""}
                    {description && date ? <br /> : null}
                    {description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getHistoryStatus(item: unknown, index: number) {
  if (typeof item === "string" || typeof item === "number") return String(item);
  if (!isRecord(item)) return `Status update ${index + 1}`;

  const directStatus = getString(item, [
    "status",
    "orderstatus",
    "order_status",
    "current_status",
    "currentStatus",
    "new_status",
    "newStatus",
    "to_status",
    "toStatus",
    "shipment_status",
    "shipmentStatus",
    "event",
    "title",
  ]);
  if (directStatus) return directStatus;

  const fromStatus = getString(item, ["old_status", "oldStatus", "from_status", "fromStatus", "previous_status", "previousStatus"]);
  const toStatus = getString(item, ["next_status", "nextStatus", "target_status", "targetStatus"]);
  if (fromStatus && toStatus) return `${formatStatus(fromStatus)} to ${formatStatus(toStatus)}`;
  if (toStatus) return toStatus;

  return `Status update ${index + 1}`;
}

function getHistoryDescription(item: unknown) {
  if (typeof item === "string" || typeof item === "number") return "";
  if (!isRecord(item)) return "";

  const directDescription = getString(item, [
    "description",
    "remarks",
    "remark",
    "message",
    "activity",
    "status_description",
    "statusDescription",
    "tracking_description",
    "trackingDescription",
  ]);
  if (directDescription) return directDescription;

  const source = getString(item, ["source"]);
  const location = getString(item, ["location", "current_location", "currentLocation"]);
  const customerVisibleSource = /phonepe|payment/i.test(source) ? source : "";
  const details = [
    customerVisibleSource ? `Source: ${formatStatus(customerVisibleSource)}` : "",
    location ? `Location: ${location}` : "",
  ].filter(Boolean);

  return details.join(" | ");
}

function getHistoryDate(row: Record<string, unknown>) {
  const keys = [
    "changeddate",
    "changed_date",
    "changedAt",
    "changed_at",
    "createddate",
    "created_at",
    "createdAt",
    "updateddate",
    "updated_at",
    "updatedAt",
    "modifieddate",
    "date",
    "time",
    "timestamp",
  ];

  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return formatDateTime(value);
    }
  }

  return "";
}

function formatDateTime(value: unknown) {
  if (typeof value === "string" && Number.isNaN(Number(value))) return value;

  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return String(value);

  const millis = timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLineImage(line: OrderLine) {
  const direct = getString(line, ["image", "productimage", "product_image"]);
  if (direct) return direct;

  return line.small?.[0] || line.medium?.[0] || line.large?.[0] || "";
}

function getStatusHistory(details: OrderDetails, tracking?: TrackingDetails, displayStatus?: string | null) {
  const candidates = [
    details.status_history,
    details.statusHistory,
    details.order.status_history,
    details.order.statusHistory,
    tracking?.ekart_tracking?.status_history,
  ];

  const history = candidates.find((candidate): candidate is unknown[] => Array.isArray(candidate) && candidate.length > 0) ?? [];
  const currentStatus = displayStatus || details.order.orderstatus || tracking?.order_status || tracking?.ekart_tracking?.status;

  if (!currentStatus) return history;

  const normalizedCurrentStatus = normalizeStatusKey(currentStatus);
  const statusAlreadyInHistory = history.some((item, index) => normalizeStatusKey(getHistoryStatus(item, index)) === normalizedCurrentStatus);

  if (statusAlreadyInHistory) return history;

  const changedDate =
    getString(details.order, ["modifieddate", "updateddate", "updated_at", "changeddate", "changed_at"]) ||
    getString(details.order, ["createddate"]);

  return [
    {
      status: currentStatus,
      changeddate: changedDate,
    },
    ...history,
  ];
}

function normalizeStatusKey(status: string) {
  return status.trim().toLowerCase().replace(/[_\s-]+/g, "_");
}

function getString(source: Record<string, unknown> | undefined, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
}

function getNumber(source: Record<string, unknown> | undefined, keys: string[]) {
  if (!source) return undefined;

  for (const key of keys) {
    const value = source[key];
    const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function ReturnRequestModal({
  modal,
  onClose,
  onSubmit,
}: {
  modal: {
    orderKey: string;
    order: OrderSummary;
    line: OrderLine;
    item: ReturnEligibilityItem;
    requesttype: ReturnRequestType;
  };
  onClose: () => void;
  onSubmit: (payload: {
    orderKey: string;
    order: OrderSummary;
    orderlineid: number;
    requesttype: ReturnRequestType;
    requestedquantity: number;
    policyreasonruleid?: number | null;
    reasoncode: string;
    requestedresolution: "replacement" | "refund" | "partial_refund" | "ship_missing_item" | "complete_return";
    ispackageopened: boolean;
    additionalremarks: string;
    evidence: Array<{ file: File; attachmenttype: AttachmentType; isrequired?: boolean }>;
  }) => Promise<void>;
}) {
  const availableReasons = modal.item.allowedreasons.filter((reason) =>
    modal.requesttype === "replacement"
      ? reason.allowedresolutions.includes("replacement")
      : reason.allowedresolutions.some((resolution) => resolution !== "replacement")
  );
  const getReasonOptionValue = (reason: AllowedReturnReason) => String(reason.policyreasonruleid || reason.reasoncode);
  const [reasonOptionValue, setReasonOptionValue] = useState(availableReasons[0] ? getReasonOptionValue(availableReasons[0]) : "");
  const selectedReason = availableReasons.find((reason) => getReasonOptionValue(reason) === reasonOptionValue) || availableReasons[0];
  const resolutionOptions = getResolutionOptions(selectedReason, modal.requesttype);
  const [resolution, setResolution] = useState<"replacement" | "refund" | "partial_refund" | "ship_missing_item" | "complete_return">(
    resolutionOptions[0] || (modal.requesttype === "replacement" ? "replacement" : "refund")
  );
  const [quantity, setQuantity] = useState(1);
  const [isPackageOpened, setIsPackageOpened] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [evidence, setEvidence] = useState<Array<{ id: string; file: File; attachmenttype: AttachmentType }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [samplePreview, setSamplePreview] = useState<{ title: string; type: "image" | "video"; url: string } | null>(null);

  useEffect(() => {
    const nextReason = availableReasons.find((reason) => getReasonOptionValue(reason) === reasonOptionValue) || availableReasons[0];
    const nextOptions = getResolutionOptions(nextReason, modal.requesttype);
    if (!nextOptions.includes(resolution)) {
      setResolution(nextOptions[0] || (modal.requesttype === "replacement" ? "replacement" : "refund"));
    }
  }, [availableReasons, modal.requesttype, reasonOptionValue, resolution]);

  const requiredRules = useMemo(() => getRequiredEvidenceRules(selectedReason), [selectedReason]);
  const requiredTypes = useMemo(() => requiredRules.map((rule) => rule.type), [requiredRules]);
  const uploadRules = useMemo(() => getUploadEvidenceRules(selectedReason), [selectedReason]);
  const maxQty = Math.max(1, modal.item.remainingeligiblequantity || 1);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const drafts = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      attachmenttype: guessAttachmentType(file, selectedReason),
    }));
    setEvidence((current) => [...current, ...drafts]);
    setFieldErrors((current) => ({ ...current, evidence: "" }));
  };

  

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!selectedReason) {
      errs.reason = "Choose a reason.";
    }
    if (!resolution) {
      errs.resolution = "Choose what you want us to do.";
    }
    if (quantity <= 0 || quantity > maxQty) {
      errs.quantity = `Quantity must be between 1 and ${maxQty}.`;
    }
    if (isPackageOpened && selectedReason && selectedReason.openedpackageallowed === false) {
      errs.isPackageOpened = "This reason is available only when the package is unopened.";
    }
    for (const rule of requiredRules) {
      const count = evidence.filter((item) => getEvidenceBucket(item.attachmenttype) === rule.type).length;
      if (count < rule.minimum) {
        errs.evidence = `${formatEvidenceLabel(rule.type)} requires ${rule.minimum} file${rule.minimum > 1 ? "s" : ""} for this reason.`;
        break;
      }
    }
    if (!errs.evidence) {
      const invalidEvidence = evidence
        .map((item) => getEvidenceFileError(item.file, item.attachmenttype))
        .find(Boolean);
      if (invalidEvidence) {
        errs.evidence = invalidEvidence;
      }
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setError("");
    try {
      await onSubmit({
        orderKey: modal.orderKey,
        order: modal.order,
        orderlineid: modal.item.orderlineid,
        requesttype: modal.requesttype,
        requestedquantity: quantity,
        policyreasonruleid: selectedReason.policyreasonruleid || null,
        reasoncode: selectedReason.reasoncode,
        requestedresolution: resolution,
        ispackageopened: isPackageOpened,
        additionalremarks: remarks,
        evidence: evidence.map((item) => ({
          file: item.file,
          attachmenttype: item.attachmenttype,
          isrequired: requiredTypes.includes(getEvidenceBucket(item.attachmenttype)),
        })),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit this request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white shadow-[var(--shadow-hover)]">
        <div className="shrink-0 flex items-start justify-between gap-4 border-b-2 border-[#fbbc05] bg-[#0f172a] px-5 py-4 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#fbbc05]">
              {modal.requesttype === "replacement" ? "Replacement Request" : "Return Request"}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">{modal.line.productname || "Order item"}</h2>
            <p className="mt-1 text-xs text-slate-300">Eligible quantity: {maxQty}</p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-700 bg-[#1e293b] text-slate-300 transition hover:bg-slate-800 hover:text-white"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close request form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {availableReasons.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              This item does not have an available reason for {modal.requesttype}.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Reason">
                  <select
                    value={reasonOptionValue}
                    onChange={(event) => {
                      setReasonOptionValue(event.target.value);
                      setFieldErrors((current) => ({ ...current, reason: "", isPackageOpened: "" }));
                    }}
                    className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  >
                    {availableReasons.map((reason) => (
                      <option key={getReasonOptionValue(reason)} value={getReasonOptionValue(reason)}>{reason.reasonname}</option>
                    ))}
                  </select>
                  {fieldErrors.reason && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.reason}</p>}
                </FormField>
                <FormField label="Resolution">
                  <select
                    value={resolution}
                    onChange={(event) => {
                      setResolution(event.target.value as typeof resolution);
                      setFieldErrors((current) => ({ ...current, resolution: "" }));
                    }}
                    className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  >
                    {resolutionOptions.map((option) => (
                      <option key={option} value={option}>{formatStatus(option)}</option>
                    ))}
                  </select>
                  {fieldErrors.resolution && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.resolution}</p>}
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Quantity">
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={quantity}
                    onChange={(event) => {
                      setQuantity(Number(event.target.value || 1));
                      setFieldErrors((current) => ({ ...current, quantity: "" }));
                    }}
                    className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                  {fieldErrors.quantity && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.quantity}</p>}
                </FormField>
                <FormField label="Package Status">
                  <label className="flex h-12 items-center gap-3 bg-white px-3 text-sm font-semibold text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={isPackageOpened}
                      onChange={(event) => {
                        setIsPackageOpened(event.target.checked);
                        setFieldErrors((current) => ({ ...current, isPackageOpened: "" }));
                      }}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    Package opened
                  </label>
                  {fieldErrors.isPackageOpened && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.isPackageOpened}</p>}
                </FormField>
              </div>



              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)] mb-2">Evidence Requirements</p>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mb-4 text-xs font-semibold space-y-2">
                  {uploadRules.map((rule) => {
                    const uploadedCount = evidence.filter((item) => getEvidenceBucket(item.attachmenttype) === rule.type).length;
                    return (
                      <div key={rule.type} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-dashed border-[var(--color-border)] pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            rule.required && uploadedCount < rule.minimum ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                          )} />
                          <span className="font-bold text-[var(--color-text)]">{formatEvidenceLabel(rule.type)}</span>
                          <span className="text-[11px] text-[var(--color-muted)]">
                            ({rule.required ? `Required x${rule.minimum}` : "Optional"})
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[var(--color-secondary)]">
                          Uploaded: {uploadedCount}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] bg-[#fbbc05] px-5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-[#e6a800]">
                    <Upload className="h-4 w-4" />
                    Upload Photos / Videos
                    <input className="hidden" type="file" multiple accept="image/*,video/*" onChange={(event) => addFiles(event.target.files)} />
                  </label>
                </div>

                {fieldErrors.evidence && (
                  <p className="mt-2 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                    {fieldErrors.evidence}
                  </p>
                )}

                <div className="mt-3 space-y-2">
                  {evidence.length === 0 ? (
                    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] bg-white p-5 text-center text-sm font-semibold text-[var(--color-muted)]">
                      Upload the photos or videos requested for your reason.
                    </div>
                  ) : (
                    evidence.map((item) => (
                      <div key={item.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {item.file.type.startsWith("video/") ? <FileVideo className="h-5 w-5 shrink-0 text-[var(--color-secondary)]" /> : <Camera className="h-5 w-5 shrink-0 text-[var(--color-secondary)]" />}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--color-text)]">{item.file.name}</p>
                              <p className="text-xs text-[var(--color-muted)]">{Math.max(1, Math.round(item.file.size / 1024))} KB</p>
                            </div>
                          </div>
                          <select
                            value={item.attachmenttype}
                            onChange={(event) =>
                              setEvidence((current) => current.map((draft) => draft.id === item.id ? { ...draft, attachmenttype: event.target.value as AttachmentType } : draft))
                            }
                            className="h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                          >
                            {(["product_photo", "defect_video"] as AttachmentType[]).map((type) => (
                              <option key={type} value={type}>{formatEvidenceLabel(type)}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="grid h-10 w-10 place-items-center rounded-full border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                            onClick={() => {
                              setEvidence((current) => current.filter((draft) => draft.id !== item.id));
                              setFieldErrors((current) => ({ ...current, evidence: "" }));
                            }}
                            aria-label="Remove evidence file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {getEvidenceFileError(item.file, item.attachmenttype) && (
                          <p className="mt-2 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                            {getEvidenceFileError(item.file, item.attachmenttype)}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <FormField label="Additional Remarks">
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  className="min-h-24 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-3 text-sm font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  placeholder="Add details that help us verify the request."
                />
              </FormField>

              {error && (
                <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-[var(--color-border)] bg-white px-5 py-4 shadow-[0_-8px_20px_rgba(17,24,39,0.06)]">
          <Button variant="secondary" className="min-h-10 bg-white px-4 text-sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button className="min-h-10 px-5 text-sm" onClick={handleSubmit} disabled={submitting || availableReasons.length === 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Submit Request
          </Button>
        </div>
      </div>

      {samplePreview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[var(--radius-lg)] border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 px-5 py-3 text-white">
              <span className="text-sm font-bold">{samplePreview.title}</span>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
                onClick={() => setSamplePreview(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex aspect-video w-full items-center justify-center bg-black/90">
              {samplePreview.type === "image" ? (
                <img src={samplePreview.url} alt="Large preview" className="h-full w-full object-contain" />
              ) : (
                <video src={samplePreview.url} controls autoPlay loop className="h-full w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function getResolutionOptions(reason: AllowedReturnReason | undefined, requesttype: ReturnRequestType) {
  if (!reason) return [];
  return reason.allowedresolutions.filter((resolution) =>
    requesttype === "replacement" ? resolution === "replacement" : resolution !== "replacement"
  );
}

function getEvidenceBucket(type: AttachmentType): AttachmentType {
  if (type === "package_photo") return "product_photo";
  if (type === "unboxing_video") return "defect_video";
  return type;
}

function formatEvidenceLabel(type: AttachmentType) {
  const bucket = getEvidenceBucket(type);
  if (bucket === "product_photo") return "Product Photo / Package Photo";
  if (bucket === "defect_video") return "Defect Video / Unboxing Video";
  return formatStatus(type);
}

function normalizeEvidenceRules(
  rules: Array<{ type: AttachmentType; required?: boolean; minimum?: number }>
): Array<{ type: AttachmentType; required: boolean; minimum: number }> {
  const byType = new Map<AttachmentType, { type: AttachmentType; required: boolean; minimum: number }>();

  rules.forEach((rule) => {
    const type = getEvidenceBucket(rule.type);
    if (type !== "product_photo" && type !== "defect_video") return;

    const existing = byType.get(type);
    byType.set(type, {
      type,
      required: Boolean(existing?.required || rule.required),
      minimum: Math.max(Number(existing?.minimum || 0), Number(rule.minimum || 0)),
    });
  });

  return (["product_photo", "defect_video"] as AttachmentType[])
    .map((type) => byType.get(type))
    .filter(Boolean) as Array<{ type: AttachmentType; required: boolean; minimum: number }>;
}

function getRequiredEvidenceRules(reason: AllowedReturnReason | undefined): Array<{ type: AttachmentType; minimum: number }> {
  if (!reason) return [];
  if (Array.isArray(reason.evidencerules) && reason.evidencerules.length > 0) {
    return normalizeEvidenceRules(reason.evidencerules)
      .filter((rule) => rule.required && rule.minimum > 0)
      .map((rule) => ({ type: rule.type, minimum: Math.max(1, Number(rule.minimum || 1)) }));
  }

  return getRequiredEvidenceTypes(reason).map((type) => ({ type, minimum: 1 }));
}

function getRequiredEvidenceTypes(reason: AllowedReturnReason | undefined): AttachmentType[] {
  if (!reason) return [];
  if (Array.isArray(reason.evidencerules) && reason.evidencerules.length > 0) {
    return normalizeEvidenceRules(reason.evidencerules)
      .filter((rule) => rule.required && rule.minimum > 0)
      .map((rule) => rule.type);
  }
  const reqs = reason.evidencerequirements;
  if (!reqs) return [];
  const types: AttachmentType[] = [];
  if (reqs.photorequired) types.push("product_photo");
  if (reqs.packagephotorequired) types.push("product_photo");
  if (reqs.videorequired) types.push("defect_video");
  if (reqs.unboxingvideorequired) types.push("defect_video");
  return Array.from(new Set(types.map(getEvidenceBucket)));
}

function getOptionalEvidenceTypes(reason: AllowedReturnReason | undefined): AttachmentType[] {
  if (!reason) return [];
  if (Array.isArray(reason.evidencerules) && reason.evidencerules.length > 0) {
    return normalizeEvidenceRules(reason.evidencerules)
      .filter((rule) => !rule.required)
      .map((rule) => rule.type);
  }
  const reqs = reason.evidencerequirements;
  if (!reqs) return [];
  const types: AttachmentType[] = [];
  if (reqs.packagephotooptional && !reqs.packagephotorequired) types.push("product_photo");
  if (reqs.unboxingvideooptional && !reqs.unboxingvideorequired) types.push("defect_video");
  return Array.from(new Set(types.map(getEvidenceBucket)));
}

function getUploadEvidenceRules(reason: AllowedReturnReason | undefined): Array<{ type: AttachmentType; required: boolean; minimum: number }> {
  if (!reason) return [];
  if (Array.isArray(reason.evidencerules) && reason.evidencerules.length > 0) {
    return normalizeEvidenceRules(reason.evidencerules)
      .map((rule) => ({
        type: rule.type,
        required: Boolean(rule.required),
        minimum: Math.max(rule.required ? 1 : 0, Number(rule.minimum || 0)),
      }));
  }

  const required = getRequiredEvidenceTypes(reason).map((type) => ({ type, required: true, minimum: 1 }));
  const optional = getOptionalEvidenceTypes(reason).map((type) => ({ type, required: false, minimum: 0 }));
  const seen = new Set<AttachmentType>();
  return [...required, ...optional].filter((rule) => {
    if (seen.has(rule.type)) return false;
    seen.add(rule.type);
    return true;
  });
}

function guessAttachmentType(file: File, reason: AllowedReturnReason | undefined): AttachmentType {
  const type = file.type.toLowerCase();
  void reason;

  if (type.startsWith("video/")) {
    return "defect_video";
  }

  if (type.startsWith("image/")) {
    return "product_photo";
  }

  return "other";
}

function getEvidenceFileError(file: File, type: AttachmentType): string {
  const sizeMb = file.size / (1024 * 1024);

  if (type === "unboxing_video" || type === "defect_video") {
    if (!file.type.startsWith("video/")) {
      return "Selected file must be a video.";
    }
    if (sizeMb > 60) {
      return "Video size must not exceed 60 MB.";
    }
  } else if (type === "product_photo" || type === "package_photo") {
    if (!file.type.startsWith("image/")) {
      return "Selected file must be an image.";
    }
    if (sizeMb > 8) {
      return "Image size must not exceed 8 MB.";
    }
  } else {
    if (sizeMb > 15) {
      return "File size must not exceed 15 MB.";
    }
  }

  return "";
}

function getRemainingClaimDuration(item: ReturnEligibilityItem | undefined): string {
  if (!item?.allowedreasons?.length) return "";
  let minMs = Infinity;
  for (const reason of item.allowedreasons) {
    if (reason.remainingclaimmilliseconds !== null && reason.remainingclaimmilliseconds !== undefined) {
      if (reason.remainingclaimmilliseconds < minMs) {
        minMs = reason.remainingclaimmilliseconds;
      }
    }
  }
  if (minMs === Infinity) return "";
  return formatDuration(minMs);
}

export default Orders;

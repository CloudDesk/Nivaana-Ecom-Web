import React, { useEffect, useMemo, useState } from "react";
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

const formatStatus = (status?: string | null) => {
  if (!status) return "Processing";
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getWalletAmountApplied = (order: OrderSummary) =>
  Number(order.wallet_amount_applied ?? order.wallet_discount_total ?? 0);

const getOrderTotal = (order: OrderSummary) =>
  Number(order.orderamount || 0) + getWalletAmountApplied(order);

const getPlacedTimestamp = (details: OrderDetails) => {
  const history = Array.isArray(details.order.status_history)
    ? details.order.status_history
    : Array.isArray(details.status_history)
      ? details.status_history
      : [];
  const timestamps = history
    .map((entry) => entry && typeof entry === "object" ? Number((entry as Record<string, unknown>).changed_date) : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  return timestamps[0] || details.order.createddate;
};

const getOrderIdentifier = (order?: OrderSummary | null) => order?.id ?? order?.orderid ?? "";
const getOrderKey = (order: OrderSummary | undefined | null, index: number) => String(order?.orderid ?? order?.id ?? index);
const orderStatusAnchorId = (orderKey: string) => `order-status-${orderKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

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
      .sort((a, b) => Number(b.order.createddate || 0) - Number(a.order.createddate || 0));
  }, [ordersQuery.data?.data]);

  const orderSummary = useMemo(() => {
    const totalSpent = orders.reduce((sum, details) => sum + getOrderTotal(details.order), 0);
    const cancelled = orders.filter((details) => isCancelledStatus(details.order.orderstatus)).length;

    return {
      total: orders.length,
      totalSpent,
      active: Math.max(orders.length - cancelled, 0),
      cancelled,
    };
  }, [orders]);

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
                    isTracking={trackingOrderKey === orderKey}
                    isLoadingDetails={detailsOrderKey === orderKey}
                    isCancelling={cancelOrderKey === orderKey}
                    isRefreshing={refreshOrderKey === orderKey}
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
                    onToggleDetails={() => {
                      if (isExpanded) {
                        setExpandedOrderKey(null);
                        return;
                      }

                      setExpandedOrderKey(orderKey);
                      if (!hasLoadedDetails) {
                        handleLoadDetails(displayedDetails, index);
                      }
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
  );
};

function OrderCard({
  statusAnchorId,
  details,
  tracking,
  trackingError,
  detailsError,
  cancelError,
  isTracking,
  isLoadingDetails,
  isCancelling,
  isRefreshing,
  isExpanded,
  onTrack,
  onRefreshTracking,
  onRefreshOrder,
  onToggleDetails,
  onCancel,
}: {
  statusAnchorId: string;
  details: OrderDetails;
  tracking?: TrackingDetails;
  trackingError?: string;
  detailsError?: string;
  cancelError?: string;
  isTracking: boolean;
  isLoadingDetails: boolean;
  isCancelling: boolean;
  isRefreshing: boolean;
  isExpanded: boolean;
  onTrack: () => void;
  onRefreshTracking: () => void;
  onRefreshOrder: () => void;
  onToggleDetails: () => void;
  onCancel: () => void;
}) {
  const { order, orderlines = [], address } = details;
  const invoiceUrl = getString(order, ["invoiceurl", "invoice_url", "order_invoice_url", "invoiceUrl"]);
  const displayStatus = order.orderstatus || tracking?.order_status || tracking?.ekart_tracking?.status;
  const statusHistory = getStatusHistory(details, tracking, displayStatus);
  const cancellable = isOrderCancellable(order.orderstatus);
  const statusTone = getStatusTone(displayStatus);
  const cancelled = isCancelledStatus(displayStatus);
  const walletAmountApplied = getWalletAmountApplied(order);
  const promotionDiscount = Number(order.promotion_discount_total || 0);
  const combinedDiscount = Number(order.discountamount || 0);
  const productDiscount = Math.max(0, combinedDiscount - promotionDiscount);
  const orderTotal = getOrderTotal(order);
  const walletUsage = details.wallet_usage || [];
  const paidUsingWallet =
    String(order.mode || "").toLowerCase() === "wallet" ||
    (Number(order.orderamount || 0) === 0 && walletAmountApplied > 0);
  const walletPaidLabel = `Paid using Wallet · ${formatCurrency(
    walletAmountApplied
  )}`;
  const highlighted = /transit|dispatch|ship|delivery/i.test(displayStatus || "") && !cancelled;
  const cardClass = [
    "overflow-hidden border bg-white transition hover:border-[var(--color-muted)]",
    highlighted
      ? "rounded-r-[var(--radius-md)] border-l-4 border-l-[#378ADD] border-[var(--color-border)]"
      : "rounded-[var(--radius-md)] border-[var(--color-border)]",
    cancelled ? "opacity-75" : "",
  ].filter(Boolean).join(" ");

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
              {paidUsingWallet ? walletPaidLabel : formatCurrency(orderTotal)}
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
              Placed {formatDate(getPlacedTimestamp(details))}
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
                {orderlines.map((line, index) => (
                  <OrderLineRow key={String(line.id ?? line.orderlinenumber ?? index)} line={line} />
                ))}
                <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3 text-sm">
                  <div className="flex items-center justify-between text-[var(--color-muted)]">
                    <span>Original total</span>
                    <span>{formatCurrency(order.original_total || order.productamount)}</span>
                  </div>
                  {productDiscount > 0 && (
                    <div className="flex items-center justify-between text-red-600">
                      <span>Product discount</span><span>-{formatCurrency(productDiscount)}</span>
                    </div>
                  )}
                  {promotionDiscount > 0 && (
                    <div className="flex items-center justify-between text-red-600">
                      <span>Promotion discount</span><span>-{formatCurrency(promotionDiscount)}</span>
                    </div>
                  )}
                  {walletUsage.length > 0 && (
                    <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-muted)]">
                      {walletUsage.map((usage) => (
                        <div key={usage.reservation_id} className="flex justify-between gap-3">
                          <span>{usage.coupon_name || usage.coupon_code || `Wallet credit #${usage.credit_id}`}{usage.status === "reversed" ? " (restored)" : ""}</span>
                          <span>{formatCurrency(usage.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {Number(order.shipping_cost || 0) > 0 ? (
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-muted)]">
                    <span>Shipping charges</span>
                    <span>{formatCurrency(order.shipping_cost)}</span>
                  </div>
                ) : null}
                <div className={cn(
                  "flex items-center justify-between text-sm font-semibold text-[var(--color-text)]",
                  "mt-3 border-t border-[var(--color-border)] pt-3"
                )}>
                  <span>Order total</span>
                  <span>{formatCurrency(orderTotal)}</span>
                </div>
                {walletAmountApplied > 0 && (
                  <div className="space-y-2 rounded-[var(--radius-sm)] bg-amber-50 p-3 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">Payment allocation</p>
                    <div className="flex items-center justify-between font-semibold text-amber-700">
                      <span>Paid using Wallet</span><span>{formatCurrency(walletAmountApplied)}</span>
                    </div>
                    {Number(order.orderamount || 0) > 0 && (
                      <div className="flex items-center justify-between text-[var(--color-text)]">
                        <span>Paid using {String(order.mode).toLowerCase() === "cod" ? "COD" : "PhonePe"}</span>
                        <span>{formatCurrency(order.orderamount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
                Line items are not available for this order.
              </div>
            )}
          </section>

          <aside id={statusAnchorId} className="scroll-mt-24 space-y-4">
            <AddressPanel address={address} />
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
      wallet_discount_total: getNumber(orderSource, ["wallet_discount_total"]),
      wallet_amount_applied: getNumber(orderSource, ["wallet_amount_applied", "wallet_discount_total"]),
      original_total: getNumber(orderSource, ["original_total"]),
      shipping_cost: getNumber(orderSource, ["shipping_cost"]),
      mode: getString(orderSource, ["mode"]),
      orderstatus: getString(orderSource, ["orderstatus"]),
      createddate: getNumber(orderSource, ["createddate"]),
      modifieddate: getNumber(orderSource, ["modifieddate"]),
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

function OrderLineRow({ line }: { line: OrderLine }) {
  const image = getLineImage(line);
  const productPath = line.productid ? `/products/${line.productid}` : "";

  const content = (
    <div className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white">
        {image ? (
          <img src={image} alt={line.productname || "Order item"} className="h-full w-full object-cover" />
        ) : (
          <PackageCheck className="h-5 w-5 text-[var(--color-muted)]" />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{line.productname || "Product"}</h3>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Qty: {Number(line.quantity || 0)}
          {line.orderstatus ? (
            <>
              <span aria-hidden="true"> . </span>
              <span className="font-semibold text-[var(--color-secondary)]">{formatStatus(line.orderstatus)}</span>
            </>
          ) : null}
        </p>
      </div>
      <p className="ml-auto shrink-0 text-sm font-semibold text-[var(--color-text)]">{formatCurrency(line.orderamount)}</p>
    </div>
  );

  if (!productPath) return content;

  return (
    <Link
      to={productPath}
      className="block rounded-[var(--radius-sm)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      aria-label={`View ${line.productname || "product"} details`}
    >
      {content}
    </Link>
  );
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

export default Orders;

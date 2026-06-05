import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";
import { Button } from "../components/ui/button";
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

const getOrderIdentifier = (order?: OrderSummary | null) => order?.id ?? order?.orderid ?? "";
const getOrderKey = (order: OrderSummary | undefined | null, index: number) => String(order?.orderid ?? order?.id ?? index);

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
  const [statusMessage, setStatusMessage] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["orders", userId],
    queryFn: () => orderService.listUserDetails(userId!),
    enabled: Boolean(userId),
  });

  const orders = useMemo(() => {
    const rawOrders = Array.isArray(ordersQuery.data?.data) ? ordersQuery.data.data : [];
    return rawOrders
      .map(normalizeOrderDetails)
      .filter((details): details is OrderDetails => Boolean(details))
      .sort((a, b) => Number(b.order.createddate || 0) - Number(a.order.createddate || 0));
  }, [ordersQuery.data?.data]);

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
      setStatusMessage("Order cancellation requested.");
      queryClient.invalidateQueries({ queryKey: ["orders", userId] });
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
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Account</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">Orders</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Manage order history, tracking, and purchased items.</p>
          </div>
          <Link to="/account" className="text-sm font-bold text-[var(--color-secondary)] hover:text-[var(--color-text)]">
            Back to account
          </Link>
        </div>

        <section className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
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
            <div className="space-y-5">
              {orders.map((details, index) => {
                const orderKey = getOrderKey(details.order, index);
                const displayedDetails = detailsByOrder[orderKey] ?? details;
                const tracking = trackingByOrder[orderKey];
                const trackingError = trackingErrorByOrder[orderKey];
                const detailsError = detailsErrorByOrder[orderKey];
                const cancelError = cancelErrorByOrder[orderKey];
                const hasLoadedDetails = Boolean(detailsByOrder[orderKey]);
                const isExpanded = expandedOrderKey === orderKey;

                return (
                  <OrderCard
                    key={orderKey}
                    details={displayedDetails}
                    tracking={tracking}
                    trackingError={trackingError}
                    detailsError={detailsError}
                    cancelError={cancelError}
                    isTracking={trackingOrderKey === orderKey}
                    isLoadingDetails={detailsOrderKey === orderKey}
                    isCancelling={cancelOrderKey === orderKey}
                    isExpanded={isExpanded}
                    onTrack={() => {
                      setExpandedOrderKey(orderKey);
                      handleTrackOrder(displayedDetails, index);
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
  details,
  tracking,
  trackingError,
  detailsError,
  cancelError,
  isTracking,
  isLoadingDetails,
  isCancelling,
  isExpanded,
  onTrack,
  onToggleDetails,
  onCancel,
}: {
  details: OrderDetails;
  tracking?: TrackingDetails;
  trackingError?: string;
  detailsError?: string;
  cancelError?: string;
  isTracking: boolean;
  isLoadingDetails: boolean;
  isCancelling: boolean;
  isExpanded: boolean;
  onTrack: () => void;
  onToggleDetails: () => void;
  onCancel: () => void;
}) {
  const { order, orderlines = [], address } = details;
  const invoiceUrl = getString(order, ["invoiceurl", "invoice_url", "order_invoice_url", "invoiceUrl"]);
  const statusHistory = getStatusHistory(details, tracking);
  const cancellable = isOrderCancellable(order.orderstatus);

  return (
    <article className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white">
      <div
        className={`grid gap-4 bg-[var(--color-primary)]/10 p-4 lg:grid-cols-[1fr_auto] lg:items-center ${
          isExpanded || detailsError || cancelError ? "border-b border-[var(--color-border)]" : ""
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetaBlock icon={<ReceiptText className="h-4 w-4" />} label="Order" value={String(order.orderid ?? order.id ?? "Order")} />
          <MetaBlock icon={<CalendarDays className="h-4 w-4" />} label="Placed on" value={formatDate(order.createddate)} />
          <MetaBlock icon={<PackageCheck className="h-4 w-4" />} label="Status" value={formatStatus(order.orderstatus)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--color-secondary)] shadow-sm">
            {formatCurrency(order.orderamount)}
          </span>
          {invoiceUrl ? (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-secondary)] bg-white px-4 text-sm font-semibold text-[var(--color-secondary)] transition hover:bg-[var(--color-secondary)] hover:text-white"
            >
              Invoice
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <span className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-muted)]">
              Invoice pending
            </span>
          )}
          <Button variant="secondary" className="gap-2" disabled={isTracking} onClick={onTrack}>
            {isTracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Track
          </Button>
          <Button variant="secondary" className="gap-2" disabled={isLoadingDetails} onClick={onToggleDetails}>
            {isLoadingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
            {isExpanded ? "Hide details" : "Details"}
          </Button>
          {cancellable && (
            <Button variant="ghost" className="gap-2 text-red-600 hover:bg-red-50" disabled={isCancelling} onClick={onCancel}>
              {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Cancel
            </Button>
          )}
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
        <div className="grid gap-5 p-4 lg:grid-cols-[1.4fr_0.9fr]">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[var(--color-text)]">Order Line Items</h2>
              <span className="text-xs font-semibold text-[var(--color-muted)]">{orderlines.length} item(s)</span>
            </div>

            {orderlines.length > 0 ? (
              <div className="mt-3 divide-y divide-[var(--color-border)] rounded-[var(--radius-sm)] border border-[var(--color-border)]">
                {orderlines.map((line, index) => (
                  <OrderLineRow key={String(line.id ?? line.orderlinenumber ?? index)} line={line} />
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
                Line items are not available for this order.
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <AddressPanel address={address} />
            <TrackingPanel tracking={tracking} trackingError={trackingError} />
            {statusHistory.length > 0 && <StatusHistory history={statusHistory} />}
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
  const normalized = (status || "").toLowerCase();
  if (!normalized) return true;

  return !["cancelled", "canceled", "delivered", "completed", "refunded", "shipped"].some((blocked) =>
    normalized.includes(blocked)
  );
}

function MetaBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[var(--color-secondary)] shadow-sm">{icon}</span>
      <span>
        <span className="block text-xs font-semibold text-[var(--color-muted)]">{label}</span>
        <span className="mt-0.5 block text-sm font-bold text-[var(--color-text)]">{value}</span>
      </span>
    </div>
  );
}

function OrderLineRow({ line }: { line: OrderLine }) {
  const image = getLineImage(line);

  return (
    <div className="grid gap-3 p-3 sm:grid-cols-[64px_1fr_auto] sm:items-center">
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface)]">
        {image ? (
          <img src={image} alt={line.productname || "Order item"} className="h-full w-full object-cover" />
        ) : (
          <PackageCheck className="h-6 w-6 text-[var(--color-secondary)]" />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-bold text-[var(--color-text)]">{line.productname || "Product"}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Qty {Number(line.quantity || 0)}</p>
        <p className="mt-1 text-xs font-semibold text-[var(--color-secondary)]">{formatStatus(line.orderstatus)}</p>
      </div>
      <p className="text-sm font-bold text-[var(--color-secondary)] sm:text-right">{formatCurrency(line.orderamount)}</p>
    </div>
  );
}

function AddressPanel({ address }: { address?: OrderAddress | null }) {
  if (!address) {
    return (
      <section className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
          <MapPin className="h-4 w-4 text-[var(--color-secondary)]" />
          Delivery Address
        </h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">Address details are unavailable.</p>
      </section>
    );
  }

  const addressLine = [address.doornumber, address.address, address.landmark, address.city, address.state]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
        <MapPin className="h-4 w-4 text-[var(--color-secondary)]" />
        Delivery Address
      </h2>
      <p className="mt-3 text-sm font-bold text-[var(--color-text)]">{address.name || "Customer"}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
        {addressLine}
        {address.pincode ? ` - ${address.pincode}` : ""}
      </p>
      {address.mobilenumber && <p className="mt-2 text-xs font-semibold text-[var(--color-secondary)]">{address.mobilenumber}</p>}
    </section>
  );
}

function TrackingPanel({ tracking, trackingError }: { tracking?: TrackingDetails; trackingError?: string }) {
  if (trackingError) {
    return (
      <section className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
        {trackingError}
      </section>
    );
  }

  if (!tracking) {
    return (
      <section className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
          <Truck className="h-4 w-4 text-[var(--color-secondary)]" />
          Tracking
        </h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">Click Track to fetch the latest delivery information.</p>
      </section>
    );
  }

  const ekart = tracking.ekart_tracking;
  const trackingLink = tracking.public_tracking_link;

  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
        <Truck className="h-4 w-4 text-[var(--color-secondary)]" />
        Tracking
      </h2>
      <div className="mt-3 space-y-2 text-sm">
        <p className="font-bold text-[var(--color-text)]">{formatStatus(tracking.order_status || ekart?.status)}</p>
        {tracking.tracking_id && <p className="text-[var(--color-muted)]">Tracking ID: {tracking.tracking_id}</p>}
        {tracking.vendor && <p className="text-[var(--color-muted)]">Courier: {tracking.vendor}</p>}
        {ekart?.current_location && <p className="text-[var(--color-muted)]">Location: {ekart.current_location}</p>}
        {ekart?.description && <p className="leading-6 text-[var(--color-muted)]">{ekart.description}</p>}
      </div>
      {trackingLink && (
        <a
          href={trackingLink}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-secondary)] hover:text-[var(--color-text)]"
        >
          Open courier tracking
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </section>
  );
}

function StatusHistory({ history }: { history: unknown[] }) {
  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
        <RefreshCw className="h-4 w-4 text-[var(--color-secondary)]" />
        Status History
      </h2>
      <div className="mt-3 space-y-3">
        {history.slice(0, 4).map((item, index) => {
          const row = isRecord(item) ? item : {};
          const status = getString(row, ["status", "orderstatus", "order_status"]) || `Update ${index + 1}`;
          const date = getString(row, ["createddate", "created_at", "date", "time"]);
          const description = getString(row, ["description", "remarks", "message"]);

          return (
            <div key={index} className="border-l-2 border-[var(--color-primary)] pl-3">
              <p className="text-sm font-bold text-[var(--color-text)]">{formatStatus(status)}</p>
              {date && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{formatDate(date)}</p>}
              {description && <p className="mt-1 text-sm leading-5 text-[var(--color-muted)]">{description}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getLineImage(line: OrderLine) {
  const direct = getString(line, ["image", "productimage", "product_image"]);
  if (direct) return direct;

  return line.small?.[0] || line.medium?.[0] || line.large?.[0] || "";
}

function getStatusHistory(details: OrderDetails, tracking?: TrackingDetails) {
  const candidates = [
    details.status_history,
    details.statusHistory,
    details.order.status_history,
    details.order.statusHistory,
    tracking?.ekart_tracking?.status_history,
  ];

  return candidates.find((candidate): candidate is unknown[] => Array.isArray(candidate) && candidate.length > 0) ?? [];
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

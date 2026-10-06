import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, ChevronUp, CreditCard, Hash, Package, ReceiptText, UserRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { PageSkeleton } from "../components/PageSkeleton";
import { paymentService, type PaymentResponseData } from "../services/paymentService";
import { orderService, type OrderDetails, type OrderSummary } from "../services/orderService";
import { sessionService } from "../services/sessionService";
import { clearSelectedCartPromotion } from "../lib/cartPromotions";
import { saveWalletApplied } from "../lib/walletSelection";
import { AccountPageHeader } from "../components/AccountPageHeader";
import { ACCOUNT_PAGE_CONTAINER, ACCOUNT_PAGE_MAIN } from "../lib/accountLayout";

const PAYMENTS_PAGE_SIZE = 10;

const getStatusText = (data?: PaymentResponseData | null) =>
  data?.status || data?.message || data?.paymentData?.state || "Status received";

const isGatewayPaymentSuccessful = (data?: PaymentResponseData | null) => {
  const statusText = getStatusText(data).toLowerCase();
  return (
    statusText === "success" ||
    statusText.includes("payment_success") ||
    statusText.includes("completed")
  );
};

const isSuccessfulPayment = (data?: PaymentResponseData | null) =>
  isGatewayPaymentSuccessful(data) && data?.orderCreation?.status !== "failed";

const isPendingPayment = (data?: PaymentResponseData | null) => {
  const statusText = getStatusText(data).toLowerCase();
  return (
    statusText.includes("pending") ||
    statusText.includes("initiated") ||
    statusText.includes("processing")
  );
};

const formatCurrency = (value?: number | string | null, source: "rupees" | "paise" = "rupees", showZero = false) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || (!showZero && amount === 0)) return "Not available";

  const rupees = source === "paise" ? amount / 100 : amount;
  return `Rs. ${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDateTime = (value?: number | string | null) => {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "Not available";

  const millis = timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPaymentTimestamp = (details: OrderDetails) => {
  const history = Array.isArray(details.order.status_history)
    ? details.order.status_history
    : Array.isArray(details.status_history)
      ? details.status_history
      : [];
  const completed = history
    .filter((entry) => entry && typeof entry === "object" && /payment.*completed/i.test(String((entry as Record<string, unknown>).new_status || "")))
    .map((entry) => Number((entry as Record<string, unknown>).changed_date))
    .find((value) => Number.isFinite(value) && value > 0);
  return completed || details.order.createddate;
};

const formatStatus = (status?: string | null) => {
  if (!status) return "Processing";

  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const PAYMENT_MODE_LABELS: Record<string, string> = {
  phonepe: "PhonePe",
  cod: "Cash on delivery",
  wallet: "Nivaana Wallet",
  upi: "UPI",
  card: "Card",
  cash: "Cash",
  promotion: "Promotion",
};

const formatPaymentMode = (mode: string) =>
  PAYMENT_MODE_LABELS[mode.toLowerCase()] || (mode ? formatStatus(mode) : "Online");

const getOrderIdentifier = (order?: OrderSummary | null) => order?.id ?? order?.orderid ?? "";

/** Payment gateway reference (e.g. TXN_…), the ID support asks for. */
const getMerchantTransactionId = (order?: OrderSummary | null) =>
  getString(order, ["merchanttransactionid", "merchantTransactionId"]);

/** Nivaana transaction record ID (e.g. NIVAANA-TRAN-…). */
const getTransactionId = (order?: OrderSummary | null) =>
  getString(order, ["transactionid", "transactionId"]);

const getOrderAmount = (order?: OrderSummary | null) =>
  getNumber(order, ["orderamount", "amount", "totalamount", "grandtotal", "grandTotal"]);

const getWalletAmountApplied = (order?: OrderSummary | null) =>
  getNumber(order, ["wallet_amount_applied", "wallet_discount_total"]);

const getOrderTotalAmount = (order?: OrderSummary | null) =>
  (getOrderAmount(order) ?? 0) + (getWalletAmountApplied(order) ?? 0);

/**
 * Orders that represent a payment by the customer: replacement shipments are
 * free, and cash-on-delivery counts only once the cash has been collected.
 */
const isPaymentRecord = (order: OrderSummary) => {
  const mode = getString(order, ["mode"]).toLowerCase();
  if (mode === "replacement" || String(order.orderid ?? "").startsWith("REP-REP-")) return false;
  if (mode === "cod") return Boolean(getNumber(order, ["cod_payment_received_date"]));
  return getBoolean(order, ["ispaymentsucceed"]);
};

const Payments: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [session] = useState(() => sessionService.getSession());
  const [statusData, setStatusData] = useState<PaymentResponseData | null>(null);
  const [expandedPaymentKey, setExpandedPaymentKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "error">("neutral");
  const reconciliationAttemptsRef = useRef(0);
  const userId = session?.user.id;
  const returnedPaymentStatus = searchParams.get("payment");
  const returnedMerchantTransactionId = searchParams.get("merchantTransactionId") || "";

  // Payments come from the customer's own orders, loaded 10 at a time (newest first).
  const ordersQuery = useInfiniteQuery({
    queryKey: ["payments", userId, "history"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => orderService.listUserDetails(userId!, pageParam, PAYMENTS_PAGE_SIZE),
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNext ? Number(lastPage.pagination.page) + 1 : undefined,
    enabled: Boolean(userId),
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = ordersQuery;

  // Scroll marker held in state so the observer re-attaches whenever it mounts.
  const [loadMoreNode, setLoadMoreNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loadMoreNode || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(loadMoreNode);
    return () => observer.disconnect();
  }, [loadMoreNode, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const paymentHistory = useMemo(() => {
    const rawOrders = (ordersQuery.data?.pages ?? []).flatMap((page) => (Array.isArray(page.data) ? page.data : []));
    const seen = new Set<string>();

    return rawOrders
      .map(normalizeOrderDetails)
      .filter((details): details is OrderDetails => Boolean(details))
      .filter((details) => isPaymentRecord(details.order))
      // A new order can shift page boundaries; keep the first copy of each order.
      .filter((details) => {
        const key = String(getOrderIdentifier(details.order));
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => Number(b.order.createddate || 0) - Number(a.order.createddate || 0));
  }, [ordersQuery.data?.pages]);

  const statusMutation = useMutation({
    mutationFn: async (merchantTransactionId: string) => {
      const statusResponse = await paymentService.getStatus(merchantTransactionId);
      return statusResponse.data;
    },
    onSuccess: async (response) => {
      if (
        isGatewayPaymentSuccessful(response) &&
        response.orderCreation?.status === "failed" &&
        reconciliationAttemptsRef.current < 6
      ) {
        reconciliationAttemptsRef.current += 1;
        setStatusData(null);
        setMessageTone("neutral");
        setMessage("Payment received. Finalizing your order...");
        window.setTimeout(() => {
          statusMutation.mutate(returnedMerchantTransactionId);
        }, 1500);
        return;
      }

      setStatusData(response);
      reconciliationAttemptsRef.current = 0;
      setMessageTone(response.orderCreation?.status === "failed" ? "error" : "neutral");
      setMessage(
        response.orderCreation?.status === "failed"
          ? `Payment succeeded, but the order could not be finalized. ${response.orderCreation.error || "Please contact support with the transaction ID."}`
          : isSuccessfulPayment(response)
            ? ""
            : getStatusText(response)
      );

      if (isSuccessfulPayment(response)) {
        clearSelectedCartPromotion(session?.user.id);
        saveWalletApplied(session?.user.id, false);

        if (session?.user.id) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["cart", session.user.id] }),
            queryClient.invalidateQueries({ queryKey: ["orders", session.user.id] }),
            queryClient.invalidateQueries({ queryKey: ["payments", session.user.id] }),
            queryClient.invalidateQueries({ queryKey: ["wallet"] }),
            queryClient.invalidateQueries({ queryKey: ["wallet-discount-quote"] }),
          ]);
          await queryClient.refetchQueries({
            queryKey: ["cart", session.user.id],
            type: "all",
          });
        }

      }
    },
    onError: (error) => {
      setStatusData(null);
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not check payment status.");
    },
  });

  useEffect(() => {
    if (
      !returnedMerchantTransactionId ||
      statusMutation.isPending ||
      statusData ||
      reconciliationAttemptsRef.current > 0
    ) return;

    setMessage(
      returnedPaymentStatus === "failure"
        ? "Payment was not completed. Checking the latest status..."
        : "Checking payment status..."
    );
    setMessageTone("neutral");
    statusMutation.mutate(returnedMerchantTransactionId);
  }, [returnedMerchantTransactionId, returnedPaymentStatus, statusData, statusMutation]);

  useEffect(() => {
    if (!returnedMerchantTransactionId || !isPendingPayment(statusData)) return;

    const timer = window.setTimeout(() => {
      setStatusData(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [returnedMerchantTransactionId, statusData]);

  if (!session) {
    return (
      <main className={ACCOUNT_PAGE_MAIN}>
        <section className="mx-auto max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <UserRound className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
          <h1 className="mt-5 text-2xl font-bold text-[var(--color-text)]">Login to view payments</h1>
          <Link to="/login" className="mt-6 inline-flex">
            <Button>Login with OTP</Button>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={ACCOUNT_PAGE_MAIN}>
      <section className={ACCOUNT_PAGE_CONTAINER}>
        <AccountPageHeader currentPage="Payments" title="Payments" subtitle="Review completed payments and transaction details." />
        {(message || statusData) && (
          <div
            className={`mt-8 rounded-[var(--radius-md)] border bg-white p-4 text-sm font-semibold ${
              messageTone === "error" || (statusData && !isSuccessfulPayment(statusData))
                ? "border-red-200 text-red-600"
                : statusData && isSuccessfulPayment(statusData)
                  ? "border-green-200 text-green-700"
                  : "border-amber-200 text-amber-700"
            }`}
          >
            {message || `Payment status: ${getStatusText(statusData)}`}
          </div>
        )}

        <section className="mt-8">
          {ordersQuery.isLoading ? (
            <PageSkeleton variant="payments" count={4} hideHeader />
          ) : ordersQuery.isError ? (
            <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-600">
              Could not load payment history. Please try again.
            </div>
          ) : paymentHistory.length > 0 ? (
            <div className="space-y-3">
              {paymentHistory.map((details, index) => {
                const key = String(getOrderIdentifier(details.order) || index);
                const isExpanded = expandedPaymentKey === key;
                return (
                  <PaymentCard
                    key={key}
                    details={details}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedPaymentKey(isExpanded ? null : key)}
                  />
                );
              })}
              {/* Next page: scroll marker, placeholders while loading, and a manual fallback. */}
              <div ref={setLoadMoreNode} className="h-1 w-full" aria-hidden="true" />
              {isFetchingNextPage && <PageSkeleton variant="payments" count={2} hideHeader />}
              {hasNextPage && !isFetchingNextPage && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    className="h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                  >
                    Load more payments
                  </button>
                </div>
              )}
            </div>
          ) : hasNextPage ? (
            // Loaded pages held only non-payment orders; keep loading older ones.
            <div>
              <div ref={setLoadMoreNode} className="h-1 w-full" aria-hidden="true" />
              <PageSkeleton variant="payments" count={2} hideHeader />
            </div>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center">
              <ReceiptText className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
              <h2 className="mt-4 text-xl font-bold text-[var(--color-text)]">No payments yet</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">Payments for your orders will appear here.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

function PaymentCard({
  details,
  isExpanded,
  onToggle,
}: {
  details: OrderDetails;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { order } = details;
  const orderNumber = String(order.orderid ?? order.id ?? "Order");
  const merchantTransactionId = getMerchantTransactionId(order);
  const mode = getString(order, ["mode", "paymentmode", "paymentMode"]);
  const refundAmount = getNumber(order, ["refund_amount"]) ?? 0;
  const cancelled = /cancel/i.test(String(order.orderstatus || ""));
  // Opens Orders with this order expanded (it loads older pages until the order is found).
  const orderLink = `/orders?orderId=${encodeURIComponent(String(getOrderIdentifier(order) || orderNumber))}`;

  return (
    <article className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white transition hover:border-[var(--color-muted)]">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ReceiptText className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
            <Link
              to={orderLink}
              className="min-w-0 break-words text-sm font-semibold text-[var(--color-text)] underline-offset-2 hover:text-[var(--color-secondary)] hover:underline"
            >
              {orderNumber}
            </Link>
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">Paid</span>
            {refundAmount > 0 ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                Refunded {formatCurrency(refundAmount)}
              </span>
            ) : cancelled ? (
              <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-muted)]">
                Order cancelled
              </span>
            ) : null}
          </div>
          <span className="text-base font-bold text-[var(--color-text)]">{formatCurrency(getOrderTotalAmount(order))}</span>
        </div>

        <div className="mt-4 grid gap-4 border-t border-[var(--color-border)] pt-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-center">
          <PaymentFact icon={Hash} label="Transaction ID" value={merchantTransactionId || "—"} mono />
          <PaymentFact icon={CalendarDays} label="Paid on" value={formatDateTime(getPaymentTimestamp(details))} />
          <PaymentFact icon={CreditCard} label="Payment method" value={formatPaymentMode(mode)} />
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              to={orderLink}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-secondary)] bg-white px-4 text-sm font-semibold text-[var(--color-secondary)] transition hover:bg-[var(--color-secondary)] hover:text-white sm:flex-none"
            >
              <Package className="h-4 w-4" />
              View order
            </Link>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isExpanded}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)] sm:flex-none"
            >
              {isExpanded ? "Hide details" : "Details"}
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      {isExpanded && <PaymentDetails details={details} />}
    </article>
  );
}

function PaymentFact({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className={`mt-1 break-all text-sm font-semibold text-[var(--color-text)] ${mono ? "font-mono text-[13px]" : ""}`}>{value}</p>
    </div>
  );
}

function PaymentDetails({ details }: { details: OrderDetails }) {
  const { order, orderlines = [] } = details;
  const orderAmount = getOrderAmount(order);
  const walletAmount = getWalletAmountApplied(order) ?? 0;
  const transactionId = getTransactionId(order);
  const itemsTotal = getNumber(order, ["items_total", "itemsTotal", "productamount", "productAmount"]);
  const discountTotal = getNumber(order, ["promotion_discount_total", "discountamount", "discountAmount"]);
  const shippingCost = getNumber(order, ["shipping_cost", "shippingCost"]);
  const gstAmount = getNumber(order, ["total_gst_amount", "taxAmount", "taxamount"]);
  const refundAmount = getNumber(order, ["refund_amount"]) ?? 0;

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PaymentMeta label="Reference" value={transactionId || "—"} />
        <PaymentMeta label="Order status" value={formatStatus(order.orderstatus)} />
        <PaymentMeta label="Items total" value={formatCurrency(itemsTotal, "rupees", true)} />
        <PaymentMeta label="Discount" value={formatCurrency(discountTotal, "rupees", true)} />
        <PaymentMeta label="Shipping" value={formatCurrency(shippingCost, "rupees", true)} />
        <PaymentMeta label="GST" value={formatCurrency(gstAmount, "rupees", true)} />
        {walletAmount > 0 && <PaymentMeta label="Paid from wallet" value={formatCurrency(walletAmount)} />}
        <PaymentMeta label={walletAmount > 0 ? "Paid online" : "Amount paid"} value={formatCurrency(orderAmount, "rupees", true)} />
        {refundAmount > 0 && <PaymentMeta label="Refunded" value={formatCurrency(refundAmount)} />}
      </div>

      {orderlines.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Items</p>
          <div className="mt-2 divide-y divide-[var(--color-border)] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white">
            {orderlines.map((line, index) => (
              <div key={String(line.id ?? line.orderlinenumber ?? index)} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <p className="text-sm font-semibold text-[var(--color-text)]">{line.productname || "Product"}</p>
                <p className="text-sm text-[var(--color-muted)] sm:text-right">Qty {Number(line.quantity || 0)}</p>
                <p className="text-sm font-semibold text-[var(--color-text)] sm:min-w-24 sm:text-right">{formatCurrency(line.orderamount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeOrderDetails(raw: unknown): OrderDetails | null {
  if (!isRecord(raw)) return null;

  const nestedOrder = isRecord(raw.order) ? raw.order : null;
  const orderSource = nestedOrder ?? raw;
  const id = getNumber(orderSource, ["id"]);
  const orderid = getString(orderSource, ["orderid", "uniqueordderid", "uniqueorderid"]);

  if (!id && !orderid) return null;

  return {
    ...raw,
    order: {
      ...orderSource,
      id,
      orderid,
      orderamount: getNumber(orderSource, ["orderamount", "amount", "totalamount", "grandtotal", "grandTotal"]),
      orderstatus: getString(orderSource, ["orderstatus", "status"]),
      createddate: getNumber(orderSource, ["createddate", "ordereddate", "paymentdate"]),
      modifieddate: getNumber(orderSource, ["modifieddate", "updateddate"]),
    },
    orderlines: Array.isArray(raw.orderlines) ? raw.orderlines : [],
    address: isRecord(raw.address) ? raw.address : null,
    status_history: Array.isArray(raw.status_history) ? raw.status_history : undefined,
    statusHistory: Array.isArray(raw.statusHistory) ? raw.statusHistory : undefined,
  };
}

function PaymentMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function getString(source: Record<string, unknown> | undefined | null, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
}

function getNumber(source: Record<string, unknown> | undefined | null, keys: string[]) {
  if (!source) return undefined;

  for (const key of keys) {
    const value = source[key];
    const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return undefined;
}

function getBoolean(source: Record<string, unknown> | undefined | null, keys: string[]) {
  if (!source) return false;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "success", "completed"].includes(normalized)) return true;
      if (["false", "0", "no", "failed", "pending"].includes(normalized)) return false;
    }
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default Payments;

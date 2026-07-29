import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ReceiptText, UserRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { paymentService, type PaymentResponseData, type TransactionRecord } from "../services/paymentService";
import { orderService, type OrderDetails, type OrderSummary } from "../services/orderService";
import { sessionService } from "../services/sessionService";

const PENDING_TRANSACTION_KEY = "nivaana_pending_payment_transaction";

const getStatusText = (data?: PaymentResponseData | null) =>
  data?.status || data?.message || data?.paymentData?.state || "Status received";

const isSuccessfulPayment = (data?: PaymentResponseData | null) => {
  const statusText = getStatusText(data).toLowerCase();
  const paymentSucceeded =
    statusText === "success" ||
    statusText.includes("payment_success") ||
    statusText.includes("completed");
  return paymentSucceeded && data?.orderCreation?.status !== "failed";
};

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

const formatStatus = (status?: string | null) => {
  if (!status) return "Processing";

  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getOrderIdentifier = (order?: OrderSummary | null) => order?.id ?? order?.orderid ?? "";

const getOrderMerchantTransactionId = (order?: OrderSummary | null) =>
  getString(order, ["merchanttransactionid", "merchantTransactionId"]);

const getOrderGatewayTransactionId = (order?: OrderSummary | null) =>
  getString(order, ["transactionid", "transactionId"]);

const getOrderAmount = (order?: OrderSummary | null) =>
  getNumber(order, ["orderamount", "amount", "totalamount", "grandtotal", "grandTotal"]);

const getTransactionMerchantTransactionId = (transaction?: TransactionRecord | null) =>
  transaction?.merchanttransactionid || getString(transaction, ["merchantTransactionId"]);

const getTransactionGatewayTransactionId = (transaction?: TransactionRecord | null) =>
  transaction?.transactionid || getString(transaction, ["transactionId"]);

const getDisplayTransactionId = (order?: OrderSummary | null, transaction?: TransactionRecord | null) =>
  getOrderMerchantTransactionId(order) ||
  getTransactionMerchantTransactionId(transaction) ||
  getOrderGatewayTransactionId(order) ||
  getTransactionGatewayTransactionId(transaction);

const getTransactionRawAmount = (transaction?: TransactionRecord | null) =>
  transaction?.amount ?? transaction?.transactiondata?.originalPayload?.transaction?.amount;

const getTimestampMillis = (value?: number | string | null) => {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0;
  return timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
};

const findMatchingTransaction = (order: OrderSummary, transactions: TransactionRecord[]) => {
  const merchantTransactionId = getOrderMerchantTransactionId(order);
  if (merchantTransactionId) {
    const exactMatch = transactions.find(
      (transaction) => getTransactionMerchantTransactionId(transaction) === merchantTransactionId
    );
    if (exactMatch) return exactMatch;
  }

  const gatewayTransactionId = getOrderGatewayTransactionId(order);
  if (gatewayTransactionId) {
    const exactMatch = transactions.find(
      (transaction) => getTransactionGatewayTransactionId(transaction) === gatewayTransactionId
    );
    if (exactMatch) return exactMatch;
  }

  const orderAmount = Number(getOrderAmount(order));
  const orderTime = getTimestampMillis(order.createddate);

  const candidates = transactions
    .filter((transaction) => {
      const transactionAmount = Number(getTransactionRawAmount(transaction));
      return Number.isFinite(orderAmount) && Number.isFinite(transactionAmount) && transactionAmount === orderAmount;
    })
    .map((transaction) => ({
      transaction,
      diff: orderTime ? Math.abs(getTimestampMillis(transaction.createddate) - orderTime) : 0,
    }))
    .filter((candidate) => !orderTime || candidate.diff <= 60 * 60 * 1000)
    .sort((a, b) => a.diff - b.diff);

  return candidates[0]?.transaction ?? null;
};

const Payments: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session] = useState(() => sessionService.getSession());
  const [statusData, setStatusData] = useState<PaymentResponseData | null>(null);
  const [expandedPaymentKey, setExpandedPaymentKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const userId = session?.user.id;
  const returnedPaymentStatus = searchParams.get("payment");
  const [pendingMerchantTransactionId, setPendingMerchantTransactionId] = useState(() =>
    searchParams.get("merchantTransactionId") || localStorage.getItem(PENDING_TRANSACTION_KEY) || ""
  );
  const returnedMerchantTransactionId = searchParams.get("merchantTransactionId") || pendingMerchantTransactionId;

  const ordersQuery = useQuery({
    queryKey: ["payments", userId],
    queryFn: () => orderService.listUserDetails(userId!),
    enabled: Boolean(userId),
  });

  const transactionsQuery = useQuery({
    queryKey: ["payment-transactions", userId],
    queryFn: () => paymentService.listUserTransactions(userId!, 1, 50),
    enabled: Boolean(userId),
  });

  const paymentHistory = useMemo(() => {
    const rawOrders = Array.isArray(ordersQuery.data?.data) ? ordersQuery.data.data : [];
    const transactions = Array.isArray(transactionsQuery.data?.data) ? transactionsQuery.data.data : [];
    const byOrderId = new Map<string, OrderDetails>();

    rawOrders
      .map(normalizeOrderDetails)
      .filter((details): details is OrderDetails => Boolean(details))
      .forEach((details, index) => {
        const identifier = String(getOrderIdentifier(details.order) || index);
        const existing = byOrderId.get(identifier);

        if (!existing || Number(details.order.createddate || 0) > Number(existing.order.createddate || 0)) {
          byOrderId.set(identifier, details);
        }
      });

    return Array.from(byOrderId.values())
      .map((details) => ({
        details,
        transaction: findMatchingTransaction(details.order, transactions),
      }))
      .sort((a, b) => Number(b.details.order.createddate || 0) - Number(a.details.order.createddate || 0));
  }, [ordersQuery.data?.data, transactionsQuery.data?.data]);

  const statusMutation = useMutation({
    mutationFn: async (merchantTransactionId: string) => {
      const statusResponse = await paymentService.getStatus(merchantTransactionId);
      return statusResponse.data;
    },
    onSuccess: (response) => {
      setStatusData(response);
      setMessage(isSuccessfulPayment(response) ? "" : getStatusText(response));

      if (isSuccessfulPayment(response)) {
        localStorage.removeItem(PENDING_TRANSACTION_KEY);
        setPendingMerchantTransactionId("");

        if (session?.user.id) {
          queryClient.invalidateQueries({ queryKey: ["cart", session.user.id] });
          queryClient.invalidateQueries({ queryKey: ["orders", session.user.id] });
          queryClient.invalidateQueries({ queryKey: ["payments", session.user.id] });
          queryClient.invalidateQueries({ queryKey: ["payment-transactions", session.user.id] });
        }

        window.setTimeout(() => navigate("/", { replace: true }), 1200);
      }
    },
    onError: (error) => {
      setStatusData(null);
      setMessage(error instanceof Error ? error.message : "Could not check payment status.");
    },
  });

  useEffect(() => {
    if (!returnedMerchantTransactionId || statusMutation.isPending || statusData) return;

    setMessage(
      returnedPaymentStatus === "failure"
        ? "Payment was not completed. Checking the latest status..."
        : "Checking payment status..."
    );
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
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-12">
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
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Account</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">Payments</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Review completed payments and transaction details.</p>
          </div>
          <Link to="/account" className="text-sm font-bold text-[var(--color-secondary)] hover:text-[var(--color-text)]">
            Back to account
          </Link>
        </div>

        {(message || statusData) && (
          <div
            className={`mt-6 rounded-[var(--radius-md)] border bg-white p-4 text-sm font-semibold ${
              message || (statusData && !isSuccessfulPayment(statusData)) ? "border-red-200 text-red-600" : "border-green-200 text-green-700"
            }`}
          >
            {message || `Payment status: ${getStatusText(statusData)}`}
          </div>
        )}

        <section className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text)]">Payment History</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">Completed payments grouped by order, matching order history.</p>
            </div>
            {ordersQuery.isFetching && <Loader2 className="h-5 w-5 animate-spin text-[var(--color-secondary)]" />}
          </div>

          {ordersQuery.isLoading ? (
            <div className="mt-5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-4 text-sm font-semibold text-[var(--color-muted)]">
              Loading payment history
            </div>
          ) : ordersQuery.isError ? (
            <div className="mt-5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-600">
              Could not load payment history. Please try again.
            </div>
          ) : paymentHistory.length > 0 ? (
            <div className="mt-5 divide-y divide-[var(--color-border)] rounded-[var(--radius-sm)] border border-[var(--color-border)]">
              {paymentHistory.map(({ details, transaction }, index) => {
                const { order } = details;
                const orderIdentifier = String(order.orderid ?? order.id ?? "Order");
                const merchantTransactionId =
                  getOrderMerchantTransactionId(order) || getTransactionMerchantTransactionId(transaction);
                const transactionLabel = getDisplayTransactionId(order, transaction);
                const amount = getOrderAmount(order);
                const key = String(getOrderIdentifier(order) || transactionLabel || index);
                const isExpanded = expandedPaymentKey === key;

                return (
                  <article key={key} className="p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="grid min-w-0 gap-3 md:grid-cols-[1.1fr_1.2fr_0.8fr_0.9fr] md:items-center">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--color-muted)]">Order</p>
                          <p className="break-words text-sm font-bold text-[var(--color-text)]">{orderIdentifier}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--color-muted)]">Transaction</p>
                          <p className="break-words text-sm font-bold text-[var(--color-text)]">{transactionLabel || "Not available from order API"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--color-muted)]">Amount</p>
                          <p className="text-sm font-bold text-[var(--color-secondary)]">{formatCurrency(amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--color-muted)]">Paid on</p>
                          <p className="text-sm text-[var(--color-muted)]">{formatDateTime(order.createddate)}</p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--color-text)] md:col-span-4">
                          {formatStatus(order.orderstatus)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Button
                          variant="secondary"
                          className="gap-2"
                          onClick={() => setExpandedPaymentKey(isExpanded ? null : key)}
                        >
                          <ReceiptText className="h-4 w-4" />
                          {isExpanded ? "Hide details" : "Payment details"}
                        </Button>
                        {merchantTransactionId && (
                          <Button
                            variant="secondary"
                            className="gap-2"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              statusMutation.mutate(merchantTransactionId);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Refresh status
                          </Button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <PaymentDetails
                        details={details}
                        transaction={transaction}
                        merchantTransactionId={merchantTransactionId}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted)]">
              No completed payment history found yet.
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

function PaymentDetails({
  details,
  transaction,
  merchantTransactionId,
}: {
  details: OrderDetails;
  transaction?: TransactionRecord | null;
  merchantTransactionId: string;
}) {
  const { order, orderlines = [] } = details;
  const transactionAmount = getTransactionRawAmount(transaction);
  const orderAmount = getOrderAmount(order);
  const gatewayTransactionId = getOrderGatewayTransactionId(order) || getTransactionGatewayTransactionId(transaction);
  const paymentMode = getString(order, ["mode", "paymentmode", "paymentMode"]) || "Online";
  const paymentSucceeded = getBoolean(order, ["ispaymentsucceed", "isPaymentSucceed", "paymentSuccess"]);
  const paymentStatus = paymentSucceeded ? "Completed" : formatStatus(getString(order, ["paymentstatus", "paymentStatus", "orderstatus", "status"]));
  const itemsTotal = getNumber(order, ["items_total", "itemsTotal", "productamount", "productAmount"]);
  const discountTotal = getNumber(order, ["promotion_discount_total", "discountamount", "discountAmount"]);
  const shippingCost = getNumber(order, ["shipping_cost", "shippingCost"]);
  const gstAmount = getNumber(order, ["total_gst_amount", "taxAmount", "taxamount"]);

  return (
    <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-primary)]/10 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PaymentMeta label="Order" value={String(order.orderid ?? order.id ?? "Order")} />
        <PaymentMeta label="Merchant Transaction ID" value={merchantTransactionId || "Not available"} />
        <PaymentMeta label="Gateway Transaction ID" value={gatewayTransactionId || "Not available"} />
        <PaymentMeta label="Amount" value={formatCurrency(transactionAmount ?? orderAmount)} />
        <PaymentMeta label="Payment Status" value={paymentStatus} />
        <PaymentMeta label="Order Status" value={formatStatus(order.orderstatus)} />
        <PaymentMeta label="Payment Mode" value={paymentMode} />
        <PaymentMeta label="Transaction Date" value={formatDateTime(transaction?.createddate ?? order.createddate)} />
        <PaymentMeta label="Last Updated" value={formatDateTime(transaction?.modifieddate ?? order.modifieddate)} />
        <PaymentMeta label="Items Total" value={formatCurrency(itemsTotal, "rupees", true)} />
        <PaymentMeta label="Discount" value={formatCurrency(discountTotal, "rupees", true)} />
        <PaymentMeta label="Shipping" value={formatCurrency(shippingCost, "rupees", true)} />
        <PaymentMeta label="GST" value={formatCurrency(gstAmount, "rupees", true)} />
        <PaymentMeta label="Source" value={transaction ? "PhonePe transaction matched to order" : "Order record"} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Order Line Items</p>
        {orderlines.length > 0 ? (
          <div className="mt-2 divide-y divide-[var(--color-border)] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white">
            {orderlines.map((line, index) => (
              <div key={String(line.id ?? line.orderlinenumber ?? index)} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <p className="text-sm font-bold text-[var(--color-text)]">{line.productname || "Product"}</p>
                <p className="text-sm text-[var(--color-muted)]">Qty {Number(line.quantity || 0)}</p>
                <p className="text-sm font-bold text-[var(--color-secondary)]">{formatCurrency(line.orderamount)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-[var(--radius-sm)] bg-white p-3 text-sm text-[var(--color-muted)]">
            Line items are available in order history for this payment.
          </p>
        )}
      </div>
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
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[var(--color-text)]">{value}</p>
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";
import { paymentService, type PaymentResponseData } from "../services/paymentService";
import { orderService } from "../services/orderService";
import { sessionService } from "../services/sessionService";
import { clearSelectedCartPromotion } from "../lib/cartPromotions";
import { saveWalletApplied } from "../lib/walletSelection";

const MAX_STATUS_CHECKS = 10;

const normalizedStatus = (data?: PaymentResponseData) =>
  String(data?.status || data?.paymentData?.state || data?.message || "").toLowerCase();

const isPaymentSuccessful = (data?: PaymentResponseData) => {
  const status = normalizedStatus(data);
  return status === "success" || status.includes("payment_success") || status.includes("completed");
};

const isPaymentPending = (data?: PaymentResponseData) => {
  const status = normalizedStatus(data);
  return !status || status.includes("pending") || status.includes("initiated") || status.includes("processing");
};

const isPaymentFailed = (data?: PaymentResponseData) => {
  const status = normalizedStatus(data);
  return status.includes("failed") || status.includes("error") || status.includes("declined") || status.includes("cancel");
};

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Not available";
  return `Rs. ${amount.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 })}`;
};

const formatDateTime = (value?: number | string | null) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Not available";
  const date = new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPaymentMode = (value?: string | null) => {
  if (!value) return "Online payment";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const CheckoutConfirmation: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const session = sessionService.getSession();
  const merchantTransactionId = searchParams.get("merchantTransactionId") || "";
  const directOrderId = searchParams.get("orderId") || "";
  const returnedPayment = (searchParams.get("payment") || "").toLowerCase();
  const returnIndicatesSuccess = returnedPayment === "success";
  const missingReference = !merchantTransactionId && !directOrderId;
  const [statusChecks, setStatusChecks] = useState(0);
  const cleanupCompletedRef = useRef(false);
  const celebrationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const celebrationIntervalRef = useRef<number | null>(null);
  const celebrationRef = useRef<confetti.CreateTypes | null>(null);

  const paymentStatusQuery = useQuery({
    queryKey: ["checkout-confirmation-payment", merchantTransactionId],
    queryFn: () => paymentService.getStatus(merchantTransactionId),
    enabled: Boolean(merchantTransactionId),
    retry: 1,
  });

  const paymentStatus = paymentStatusQuery.data?.data;
  const reconciledOrderId = paymentStatus?.orderCreation?.orderId || paymentStatus?.orderData?.orderId;
  const orderId = directOrderId || (reconciledOrderId ? String(reconciledOrderId) : "");
  const paymentSucceeded = Boolean(directOrderId) || isPaymentSuccessful(paymentStatus);
  const orderFinalizationFailed = paymentStatus?.orderCreation?.status === "failed";
  const shouldPoll = Boolean(
    merchantTransactionId &&
      statusChecks < MAX_STATUS_CHECKS &&
      (isPaymentPending(paymentStatus) || (paymentSucceeded && (!orderId || orderFinalizationFailed)))
  );

  useEffect(() => {
    if (!shouldPoll || paymentStatusQuery.isFetching) return;
    const delay = statusChecks < 2 ? 1500 : 2500;
    const timer = window.setTimeout(async () => {
      setStatusChecks((current) => current + 1);
      await paymentStatusQuery.refetch();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [paymentStatusQuery, shouldPoll, statusChecks]);

  const orderQuery = useQuery({
    queryKey: ["checkout-confirmation-order", orderId],
    queryFn: () => orderService.details(orderId),
    enabled: Boolean(orderId),
    retry: 3,
    retryDelay: 1200,
  });

  useEffect(() => {
    if (!paymentSucceeded || !orderId || cleanupCompletedRef.current) return;
    cleanupCompletedRef.current = true;
    clearSelectedCartPromotion(session?.user.id);
    saveWalletApplied(session?.user.id, false);
    if (!session?.user.id) return;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cart", session.user.id] }),
      queryClient.invalidateQueries({ queryKey: ["orders", session.user.id] }),
      queryClient.invalidateQueries({ queryKey: ["payments", session.user.id] }),
      queryClient.invalidateQueries({ queryKey: ["payment-transactions", session.user.id] }),
      queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      queryClient.invalidateQueries({ queryKey: ["wallet-discount-quote"] }),
    ]);
  }, [orderId, paymentSucceeded, queryClient, session?.user.id]);

  const details = orderQuery.data?.data;
  const order = details?.order;
  const displayOrderNumber = String(order?.orderid || order?.id || orderId || "");
  const orderLink = displayOrderNumber
    ? `/orders?orderId=${encodeURIComponent(String(order?.id || displayOrderNumber))}`
    : "/orders";
  const transactionId = merchantTransactionId || order?.merchanttransactionid || order?.transactionid || "Not available";
  const amountPaid = order?.cost_breakdown?.final_payable_amount ?? order?.orderamount ?? paymentStatus?.amount;
  const paymentMode = formatPaymentMode(
    order?.mode || paymentStatus?.paymentMode || paymentStatus?.paymentData?.paymentInstrument?.type
  );

  const state = useMemo<"checking" | "success" | "failure" | "delayed">(() => {
    if (orderId && paymentSucceeded) return "success";
    if (missingReference || paymentStatusQuery.isError || isPaymentFailed(paymentStatus) || (returnedPayment === "failure" && !paymentStatusQuery.isFetching)) {
      return "failure";
    }
    if (statusChecks >= MAX_STATUS_CHECKS || (paymentSucceeded && orderFinalizationFailed && !shouldPoll)) return "delayed";
    return "checking";
  }, [missingReference, orderFinalizationFailed, orderId, paymentStatus, paymentStatusQuery.isError, paymentStatusQuery.isFetching, paymentSucceeded, returnedPayment, shouldPoll, statusChecks]);

  const stopCelebration = useCallback(() => {
    if (celebrationIntervalRef.current !== null) {
      window.clearInterval(celebrationIntervalRef.current);
      celebrationIntervalRef.current = null;
    }
    celebrationRef.current?.reset();
    celebrationRef.current = null;
  }, []);

  useEffect(() => {
    if (state !== "success" || !celebrationCanvasRef.current) return;

    stopCelebration();
    const fire = confetti.create(celebrationCanvasRef.current, {
      resize: true,
      useWorker: true,
      disableForReducedMotion: true,
    });
    celebrationRef.current = fire;

    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults: confetti.Options = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 0,
      colors: ["#fbbc05", "#15803d", "#485470", "#ffffff"],
    };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const launch = () => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        stopCelebration();
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      void fire({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      void fire({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    };

    launch();
    celebrationIntervalRef.current = window.setInterval(launch, 250);
    return stopCelebration;
  }, [state, stopCelebration]);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[var(--color-surface)] px-4 py-8 sm:py-12">
      <canvas ref={celebrationCanvasRef} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden="true" />
      <section className="relative z-10 mx-auto max-w-5xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">Checkout</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text)] sm:text-3xl">Order confirmation</h1>

        <div className="mt-7 flex max-w-xl items-center" aria-label="Checkout progress">
          <ConfirmationStep label="Cart" state="done" value="1" />
          <span className="mx-3 h-px flex-1 bg-green-200" />
          <ConfirmationStep label="Checkout" state="done" value="2" />
          <span className="mx-3 h-px flex-1 bg-green-200" />
          <ConfirmationStep label="Confirmation" state={state === "success" ? "done" : "active"} value="3" />
        </div>

        {state === "checking" && (
          <StatusPanel
            icon={<Loader2 className="h-12 w-12 animate-spin" />}
            title={paymentSucceeded || returnIndicatesSuccess ? "Payment received" : "Confirming your payment"}
            message={paymentSucceeded || returnIndicatesSuccess ? "Your payment is complete. We are preparing your order details now." : "Please stay on this page while we verify the transaction."}
            tone="pending"
          />
        )}

        {state === "failure" && (
          <StatusPanel
            icon={<AlertCircle className="h-12 w-12" />}
            title="Payment was not completed"
            message="Your order has not been confirmed. You can return to checkout or review your payment history."
            tone="error"
          >
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <LinkButton to="/checkout" primary>Return to checkout</LinkButton>
              <LinkButton to="/payments">Payment history</LinkButton>
            </div>
          </StatusPanel>
        )}

        {state === "delayed" && (
          <StatusPanel
            icon={<Clock3 className="h-12 w-12" />}
            title="Order confirmation is taking longer"
            message="We could not finish loading the order yet. If your account was debited, do not pay again. Check Orders or Payments shortly."
            tone="pending"
          >
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <LinkButton to="/orders" primary>View orders</LinkButton>
              <LinkButton to="/payments">Payment history</LinkButton>
            </div>
          </StatusPanel>
        )}

        {state === "success" && (
          <div className="mt-8 space-y-6" onClickCapture={stopCelebration}>
            <section className="rounded-[var(--radius-lg)] border border-green-200 bg-white p-6 text-center shadow-[var(--shadow-card)] sm:p-9">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-100 text-green-700">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-[var(--color-text)] sm:text-3xl">Order placed successfully</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
                Thank you for shopping with Nivaana. Your payment and order have been confirmed.
              </p>
              {displayOrderNumber && (
                <Link to={orderLink} className="mt-5 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-800 hover:bg-green-100">
                  <PackageCheck className="h-4 w-4" />
                  {displayOrderNumber}
                </Link>
              )}
            </section>

            <section className="rounded-[var(--radius-lg)] border border-green-200 bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
              <div className="flex items-center gap-3 border-b border-green-100 pb-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-green-50 text-green-700"><ReceiptText className="h-5 w-5" /></div>
                <div><h2 className="font-bold text-[var(--color-text)]">Transaction details</h2><p className="text-xs text-[var(--color-muted)]">Payment verified securely</p></div>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Order number" value={displayOrderNumber || "Loading"} />
                <Detail label="Amount paid" value={formatCurrency(amountPaid)} accent />
                <Detail label="Payment method" value={paymentMode} />
                <Detail label="Order date" value={formatDateTime(order?.createddate)} />
              </div>
              <div className="mt-5 rounded-[var(--radius-sm)] bg-green-50 px-4 py-3">
                <p className="text-xs font-semibold text-green-800">Transaction ID</p>
                <p className="mt-1 break-all text-sm text-green-900">{transactionId}</p>
              </div>
            </section>

            {orderQuery.isLoading && (
              <div className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-muted)]">
                <Loader2 className="h-5 w-5 animate-spin text-green-700" /> Loading order details
              </div>
            )}

            {details && (
              <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
                  <div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-[var(--color-secondary)]" /><h2 className="font-bold text-[var(--color-text)]">Order items</h2></div>
                  <div className="mt-4 divide-y divide-[var(--color-border)]">
                    {(details.orderlines || []).map((item, index) => (
                      <div key={String(item.id || `${item.productid}-${index}`)} className="flex items-start justify-between gap-4 py-4">
                        <div className="min-w-0"><p className="font-semibold text-[var(--color-text)]">{item.productname || "Product"}</p><p className="mt-1 text-xs text-[var(--color-muted)]">Quantity: {item.quantity || 1}</p></div>
                        <p className="shrink-0 font-semibold text-[var(--color-text)]">{formatCurrency(item.orderamount ?? item.productamount)}</p>
                      </div>
                    ))}
                  </div>
                  {order?.cost_breakdown && (
                    <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
                      <SummaryRow label="Items total" value={formatCurrency(order.cost_breakdown.original_cart_value)} />
                      {order.cost_breakdown.total_discount > 0 && <SummaryRow label="Total discount" value={`-${formatCurrency(order.cost_breakdown.total_discount)}`} green />}
                      <SummaryRow label="Shipping" value={order.cost_breakdown.delivery_charges === 0 ? "Free" : formatCurrency(order.cost_breakdown.delivery_charges)} />
                      <SummaryRow label="Final amount paid" value={formatCurrency(order.cost_breakdown.final_payable_amount)} strong />
                    </div>
                  )}
                </section>

                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
                  <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[var(--color-secondary)]" /><h2 className="font-bold text-[var(--color-text)]">Delivery address</h2></div>
                  {details.address ? (
                    <div className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                      <p className="font-bold text-[var(--color-text)]">{details.address.name || "Customer"}</p>
                      <p>{[details.address.doornumber, details.address.address, details.address.landmark].filter(Boolean).join(", ")}</p>
                      <p>{[details.address.city, details.address.state, details.address.pincode].filter(Boolean).join(", ")}</p>
                      {details.address.mobilenumber && <p className="mt-2">Mobile: {details.address.mobilenumber}</p>}
                    </div>
                  ) : <p className="mt-4 text-sm text-[var(--color-muted)]">Address details are being prepared.</p>}
                </section>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <LinkButton to={orderLink} primary>View order</LinkButton>
              <LinkButton to="/products">Continue shopping</LinkButton>
              <LinkButton to="/payments">Payments</LinkButton>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

function ConfirmationStep({ label, state, value }: { label: string; state: "done" | "active"; value: string }) {
  const done = state === "done";
  return (
    <div className={`flex shrink-0 items-center gap-2 text-xs font-semibold ${done ? "text-green-700" : "text-[var(--color-text)]"}`}>
      <span className={`grid h-7 w-7 place-items-center rounded-full border ${done ? "border-green-200 bg-green-50 text-green-700" : "border-green-500 bg-white text-green-700 ring-4 ring-green-50"}`}>
        {done ? <Check className="h-4 w-4" /> : value}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function StatusPanel({ icon, title, message, tone, children }: { icon: React.ReactNode; title: string; message: string; tone: "pending" | "error"; children?: React.ReactNode }) {
  const error = tone === "error";
  return (
    <section className={`mt-8 rounded-[var(--radius-lg)] border bg-white p-7 text-center shadow-[var(--shadow-card)] sm:p-10 ${error ? "border-red-200" : "border-amber-200"}`}>
      <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${error ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{icon}</div>
      <h2 className="mt-5 text-2xl font-bold text-[var(--color-text)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-muted)]">{message}</p>
      {children}
    </section>
  );
}

function Detail({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-xs font-semibold text-[var(--color-muted)]">{label}</p><p className={`mt-1 break-words font-bold ${accent ? "text-green-700" : "text-[var(--color-text)]"}`}>{value}</p></div>;
}

function SummaryRow({ label, value, green = false, strong = false }: { label: string; value: string; green?: boolean; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "border-t border-[var(--color-border)] pt-3 text-base font-bold" : ""}`}><span className="text-[var(--color-muted)]">{label}</span><span className={green ? "font-semibold text-green-700" : "font-semibold text-[var(--color-text)]"}>{value}</span></div>;
}

function LinkButton({ to, children, primary = false }: { to: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link to={to} className={`inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] border px-6 text-sm font-semibold shadow-sm transition sm:min-w-[180px] ${primary ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-text)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]" : "border-[var(--color-border)] bg-white text-[var(--color-secondary)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card)]"}`}>
      {children}
    </Link>
  );
}

export default CheckoutConfirmation;

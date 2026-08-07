import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, CheckCircle2, Gift, History, LockKeyhole, ShieldCheck, Ticket, WalletCards, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "../components/toastApi";
import { couponWalletService, type CouponPreview, type CustomerWallet, type WalletActivityResponse, type WalletCoupon } from "../services/couponWalletService";

const formatCurrency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

const formatDate = (value?: string | number | null) => {
  if (!value) return "No expiry";
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "No expiry" : date.toLocaleDateString("en-IN");
};

const formatDateTime = (value?: string | number | null) => {
  if (!value) return "-";
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const couponErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Coupon could not be checked.";
  if (message.includes("ASSIGNED_TO_ANOTHER")) return "This personalized coupon is not available for this account.";
  if (message.includes("ALREADY_CLAIMED") || message.includes("COUPON_CLAIMED")) return "This coupon has already been added to a wallet.";
  if (message.includes("COUPON_INACTIVE")) return "This coupon is temporarily inactive.";
  if (message.includes("COUPON_REVOKED")) return "This coupon has been revoked.";
  if (message.includes("COUPON_EXPIRED")) return "This coupon has expired.";
  if (message.includes("COUPON_SCHEDULED")) return "This coupon is not active yet.";
  if (message.includes("NOT_AVAILABLE_ON_THIS_CHANNEL")) return "This coupon is not available on the website.";
  if (message.includes("NOT_WALLET_CREDIT")) return "This code cannot be converted into wallet credit.";
  if (message.includes("ACCOUNT_INACTIVE")) return "Your account is inactive. Contact support before adding a coupon.";
  if (message.includes("INVALID_MINIMUM")) return "This coupon has invalid redemption conditions. Contact support.";
  if (message.includes("NOT_FOUND")) return "Coupon code not found. Check the code and try again.";
  return message;
};

export default function Wallet() {
  const queryClient = useQueryClient();
  const [wallet, setWallet] = useState<CustomerWallet | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [claimingCode, setClaimingCode] = useState("");
  const [checkingCode, setCheckingCode] = useState("");
  const [preview, setPreview] = useState<CouponPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCreditId, setHistoryCreditId] = useState<number | undefined>();
  const [historyCreditName, setHistoryCreditName] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [history, setHistory] = useState<WalletActivityResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const loadWallet = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await couponWalletService.getWallet();
      setWallet(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Your wallet could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadWallet(); }, []);

  useEffect(() => {
    if (!historyOpen) return;
    let active = true;
    setHistoryLoading(true);
    setHistoryError("");
    couponWalletService.getActivity(historyPage, 10, historyCreditId)
      .then((response) => { if (active) setHistory(response.data); })
      .catch((activityError) => { if (active) setHistoryError(activityError instanceof Error ? activityError.message : "Wallet history could not be loaded."); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [historyCreditId, historyOpen, historyPage]);

  useEffect(() => {
    if (!historyOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setHistoryOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [historyOpen]);

  const openHistory = (creditId?: number, creditName = "") => {
    setHistoryCreditId(creditId);
    setHistoryCreditName(creditName);
    setHistoryPage(1);
    setHistory(null);
    setHistoryOpen(true);
  };

  const availableWalletCredits = (wallet?.credits || []).filter((coupon) => {
    const credit = coupon.wallet_credit;
    if (!credit || Number(credit.remaining_amount || 0) <= 0) return false;
    const expiryValue = Number(credit.expires_at || 0);
    const expired = credit.status === "expired" || (expiryValue > 0 && expiryValue * (expiryValue < 1_000_000_000_000 ? 1000 : 1) < Date.now());
    return !expired && ["active", "partially_used"].includes(credit.status);
  });

  const checkCoupon = async (couponCode: string) => {
    const normalized = couponCode.trim().toUpperCase();
    setPreview(null);
    setPreviewError("");
    if (normalized.length < 4) {
      setPreviewError("Enter a valid coupon code.");
      return;
    }
    setCode(normalized);
    setCheckingCode(normalized);
    try {
      const response = await couponWalletService.preview(normalized);
      setPreview(response.data);
    } catch (previewFailure) {
      setPreviewError(couponErrorMessage(previewFailure));
    } finally {
      setCheckingCode("");
    }
  };

  const claimCoupon = async (couponCode: string) => {
    const normalized = couponCode.trim().toUpperCase();
    setClaimingCode(normalized);
    try {
      const response = await couponWalletService.claim(normalized);
      const amount = Number(response.data.wallet_credit?.original_amount || 0);
      toast.success(`${formatCurrency(amount)} added to your wallet.`);
      setCode("");
      setPreview(null);
      setPreviewError("");
      await loadWallet();
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
    } catch (claimError) {
      setPreview(null);
      setPreviewError(couponErrorMessage(claimError));
    } finally {
      setClaimingCode("");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary)]/25 text-[var(--color-secondary)]"><WalletCards className="h-6 w-6" /></span>
          <div><h1 className="text-3xl font-bold text-[var(--color-text)]">My Wallet</h1><p className="mt-1 text-sm text-[var(--color-muted)]">Add personalized Nivaana coupons and use the credit on eligible orders.</p></div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          <div className="space-y-6">
            <section className="rounded-[var(--radius-lg)] bg-[var(--color-secondary)] p-7 text-white shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold text-white/70">Available wallet balance</p>
              <p className="mt-2 text-4xl font-bold text-[var(--color-primary)]">{formatCurrency(wallet?.balance || 0)}</p>
              <p className="mt-4 flex items-center gap-2 text-xs text-white/70"><LockKeyhole className="h-4 w-4" />Promotional and refund credits. Customer top-ups are not supported.</p>
            </section>

            <form className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]" onSubmit={(event) => { event.preventDefault(); void checkCoupon(code); }}>
              <label htmlFor="wallet-coupon-code" className="text-sm font-bold text-[var(--color-text)]">Add a printed or messaged coupon</label>
              <p className="mt-1 text-sm text-[var(--color-muted)]">The code must be assigned to this signed-in account.</p>
              <input
                id="wallet-coupon-code"
                value={code}
                onChange={(event) => { setCode(event.target.value.toUpperCase()); setPreview(null); setPreviewError(""); }}
                onPaste={(event) => { event.preventDefault(); const pastedCode = event.clipboardData.getData("text").trim().toUpperCase(); setCode(pastedCode); void checkCoupon(pastedCode); }}
                autoComplete="off"
                maxLength={100}
                placeholder="Enter personalized coupon code"
                className="mt-4 h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 font-mono uppercase outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
              {!preview && <Button type="submit" className="mt-3 w-full gap-2" disabled={Boolean(checkingCode || claimingCode)}><ShieldCheck className="h-4 w-4" />{checkingCode ? "Checking all conditions…" : "Check Coupon"}</Button>}
              {previewError && <p className="mt-3 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{previewError}</p>}
              {preview && <CouponPreviewCard preview={preview} claiming={Boolean(claimingCode)} onConfirm={() => void claimCoupon(preview.code)} />}
            </form>
          </div>

          <div className="space-y-6">
            {error && <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            {loading ? <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-sm text-[var(--color-muted)]">Loading your wallet…</div> : <>
              <WalletSection title="Available to add" empty="No personalized coupons are waiting for you." coupons={wallet?.available_coupons || []} render={(coupon) => <AvailableCoupon key={coupon.id} coupon={coupon} checking={checkingCode === coupon.code} onReview={() => void checkCoupon(coupon.code)} />} />
              <WalletSection title="Available wallet credits" action={<button type="button" onClick={() => openHistory()} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#d5a800] bg-[#fff8d6] px-3.5 text-sm font-bold text-[#4b421f] transition hover:bg-[#ffefad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbc05] focus-visible:ring-offset-2"><History className="h-4 w-4" />Redemption history</button>} empty="No wallet credit is currently available." coupons={availableWalletCredits} render={(coupon) => <CreditCoupon key={coupon.id} coupon={coupon} onViewUsage={() => openHistory(coupon.wallet_credit?.id, coupon.promotion.name || "Coupon wallet credit")} />} />
            </>}
          </div>
        </div>
      </section>
      {historyOpen && <WalletHistoryModal history={history} loading={historyLoading} error={historyError} filterName={historyCreditName} page={historyPage} onPageChange={setHistoryPage} onClearFilter={() => { setHistoryCreditId(undefined); setHistoryCreditName(""); setHistoryPage(1); }} onClose={() => setHistoryOpen(false)} />}
    </main>
  );
}

function CouponPreviewCard({ preview, claiming, onConfirm }: { preview: CouponPreview; claiming: boolean; onConfirm: () => void }) {
  return <div className="mt-4 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-4" role="status">
    <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" /><div><p className="text-sm font-bold text-green-900">Eligible for your account</p><h3 className="mt-1 text-lg font-bold text-[var(--color-text)]">{preview.name}</h3></div></div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-[var(--color-muted)]">Wallet credit</p><p className="font-bold">{formatCurrency(preview.amount)}</p></div><div><p className="text-xs text-[var(--color-muted)]">Minimum cart</p><p className="font-bold">{preview.minimum_cart_amount > 0 ? formatCurrency(preview.minimum_cart_amount) : "No minimum"}</p></div><div><p className="text-xs text-[var(--color-muted)]">Valid from</p><p className="font-bold">{formatDate(preview.valid_from)}</p></div><div><p className="text-xs text-[var(--color-muted)]">Claim by</p><p className="font-bold">{formatDate(preview.valid_until)}</p></div></div>
    <Button type="button" className="mt-4 w-full gap-2" disabled={claiming} onClick={onConfirm}><Gift className="h-4 w-4" />{claiming ? "Adding…" : `Add ${formatCurrency(preview.amount)} to Wallet`}</Button>
  </div>;
}

function WalletSection({ title, action, empty, coupons, render }: { title: string; action?: ReactNode; empty: string; coupons: WalletCoupon[]; render: (coupon: WalletCoupon) => ReactNode }) {
  return <section><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>{action}</div><div className="mt-3 space-y-3">{coupons.length ? coupons.map(render) : <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-muted)]">{empty}</div>}</div></section>;
}

function AvailableCoupon({ coupon, checking, onReview }: { coupon: WalletCoupon; checking: boolean; onReview: () => void }) {
  const amount = Number(coupon.promotion.action?.value || 0);
  const minimum = coupon.promotion.conditions?.find((condition) => condition.attribute === "cart.total_value")?.value;
  return <article className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">Personalized for your account</p><h3 className="mt-1 text-lg font-bold">{coupon.promotion.name || "Nivaana wallet coupon"}</h3><p className="mt-2 text-2xl font-bold text-[var(--color-secondary)]">{formatCurrency(amount)}</p><p className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted)]"><CalendarClock className="h-4 w-4" />Claim by {formatDate(coupon.end_date)}{minimum ? ` · Minimum cart ${formatCurrency(Number(minimum))}` : ""}</p></div><Button className="shrink-0 gap-2" onClick={onReview} disabled={checking || coupon.status !== "available"}><Ticket className="h-4 w-4" />{coupon.status === "scheduled" ? "Not active yet" : checking ? "Checking…" : "Review Coupon"}</Button></article>;
}

function CreditCoupon({ coupon, onViewUsage }: { coupon: WalletCoupon; onViewUsage: () => void }) {
  const credit = coupon.wallet_credit!;
  const original = Number(credit.original_amount || 0);
  const remaining = Number(credit.remaining_amount || 0);
  const used = Math.max(0, original - remaining);
  const expiryValue = Number(credit.expires_at || 0);
  const isExpired = credit.status === "expired" || (expiryValue > 0 && expiryValue * (expiryValue < 1_000_000_000_000 ? 1000 : 1) < Date.now());
  const status = remaining <= 0 ? "Fully used" : isExpired ? "Expired" : used > 0 ? "Partially used" : "Available";
  const statusStyle = status === "Available" ? "bg-green-100 text-green-700" : status === "Partially used" ? "bg-amber-100 text-amber-800" : status === "Expired" ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-700";
  return <article className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold">{coupon.promotion.name || "Coupon wallet credit"}</p><p className="mt-1 text-xs text-[var(--color-muted)]">Added {formatDate(coupon.claimed_at)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle}`}>{status}</span></div><div className="mt-4 grid grid-cols-3 gap-3"><div><p className="text-xs text-[var(--color-muted)]">Original</p><p className="font-bold">{formatCurrency(original)}</p></div><div><p className="text-xs text-[var(--color-muted)]">Used</p><p className="font-bold">{formatCurrency(used)}</p></div><div><p className="text-xs text-[var(--color-muted)]">Remaining</p><p className="text-xl font-bold text-[var(--color-secondary)]">{formatCurrency(remaining)}</p></div></div><div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-[var(--color-border)] pt-3 sm:flex-row sm:items-end"><p className="text-xs text-[var(--color-muted)]">{credit.minimum_cart_amount > 0 ? `Minimum cart ${formatCurrency(credit.minimum_cart_amount)}` : "No minimum cart"}<br />{credit.expires_at ? `Expires ${formatDate(credit.expires_at)}` : "No expiry"}</p>{used > 0 && <button type="button" onClick={onViewUsage} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#cbd2df] bg-white px-3 text-xs font-bold text-[#34415c] transition hover:border-[#aeb8c9] hover:bg-[#f5f7fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbc05] focus-visible:ring-offset-2"><History className="h-3.5 w-3.5" />View usage</button>}</div></article>;
}

function WalletHistoryModal({ history, loading, error, filterName, page, onPageChange, onClearFilter, onClose }: { history: WalletActivityResponse | null; loading: boolean; error: string; filterName: string; page: number; onPageChange: (page: number) => void; onClearFilter: () => void; onClose: () => void }) {
  const pagination = history?.pagination;
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-[#111827]/55 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="wallet-history-title" className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
      <header className="flex items-start justify-between gap-4 border-b border-[#e5e9f0] px-5 py-4"><div><h2 id="wallet-history-title" className="text-lg font-extrabold text-[#172033]">{filterName ? "Wallet activity" : "Wallet history"}</h2><p className="mt-1 text-xs text-[#68748a]">{filterName || "Credits received, used on orders, and restored after cancellation."}</p>{filterName && <button type="button" onClick={onClearFilter} className="mt-3 inline-flex h-8 items-center rounded-lg border border-[#cbd2df] px-3 text-xs font-bold text-[#34415c] hover:bg-[#f5f7fa]">Show all activity</button>}</div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#f1f3f7] text-[#26344f]" aria-label="Close wallet history"><X className="h-5 w-5" /></button></header>
      <div className="overflow-y-auto px-5 py-4">{loading ? <p className="py-10 text-center text-sm text-[#68748a]">Loading wallet history…</p> : error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : !history?.activity.length ? <p className="py-10 text-center text-sm text-[#68748a]">No wallet activity yet.</p> : <div className="space-y-2.5">{history.activity.map((item) => {
        const incoming = item.type === "cancellation_reversal" || item.type === "refund_credit";
        const title = item.type === "refund_credit" ? `Refund credit for Order #${item.order_id || "—"}` : item.type === "cancellation_reversal" ? `Restored after Order #${item.order_id || "—"} cancellation` : `Used on Order #${item.order_id || "—"}`;
        return <article key={item.id} className="flex items-start gap-3 rounded-xl border border-[#e5e9f0] p-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${incoming ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{incoming ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#172033]">{title}</p><p className="mt-0.5 truncate text-xs text-[#68748a]">{item.coupon_name} · {item.coupon_code}</p></div><p className={`shrink-0 font-extrabold ${incoming ? "text-green-700" : "text-[#172033]"}`}>{incoming ? "+" : "-"}{formatCurrency(Math.abs(item.amount))}</p></div><div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#68748a]"><span>{formatDateTime(item.occurred_at)}</span><span>Credit left {formatCurrency(item.credit_balance_after)}</span></div></div></article>;
      })}</div>}</div>
      {pagination && pagination.totalPages > 1 && <footer className="flex items-center justify-between border-t border-[#e5e9f0] px-5 py-3"><button type="button" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40">Previous</button><span className="text-xs text-[#68748a]">Page {pagination.page} of {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => onPageChange(page + 1)} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40">Next</button></footer>}
    </section>
  </div>;
}

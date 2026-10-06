import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Smartphone } from "lucide-react";
import { authService } from "../services/authService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { Button } from "../components/ui/button";
import { INVALID_MOBILE_MESSAGE, isValidIndianMobile, normalizeIndianMobileInput } from "../lib/phone";

const Login: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobile, setMobile] = useState("");
  const [cooldownMobile, setCooldownMobile] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [requiresName, setRequiresName] = useState(false);
  const [requiresEmail, setRequiresEmail] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isCooldownActive = mobile.length === 10 && mobile === cooldownMobile && resendTimer > 0;
  const isWaitMessage = message.toLowerCase().includes("wait") || message.toLowerCase().includes("cooldown");
  const displayMessage = isWaitMessage
    ? (isCooldownActive ? `Please wait ${resendTimer} second${resendTimer === 1 ? "" : "s"} before requesting a new OTP.` : "")
    : message;

  React.useEffect(() => {
    if (resendTimer <= 0) {
      setMessage((prev) => (prev.toLowerCase().includes("wait") ? "" : prev));
      return;
    }
    const interval = window.setInterval(() => {
      setResendTimer((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          setMessage((m) => (m.toLowerCase().includes("wait") ? "" : m));
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [resendTimer]);

  const changeMobileNumber = () => {
    setOtpSent(false);
    setRequiresName(false);
    setRequiresEmail(false);
    setOtp("");
    setName("");
    setEmail("");
    setMessage("");
  };

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidIndianMobile(mobile)) {
      setMessage(INVALID_MOBILE_MESSAGE);
      return;
    }

    if (isCooldownActive) {
      setMessage(`Please wait ${resendTimer} seconds before requesting a new OTP.`);
      return;
    }

    setLoading(true);
    setMessage("");
    setCooldownMobile(mobile);

    try {
      const response = await authService.requestOTP(Number(mobile));
      setRequiresName(Boolean(response.data.requiresName ?? response.data.isNewUser));
      setRequiresEmail(Boolean(response.data.requiresEmail));
      const cooldown = Math.max(0, response.data.canResendAfter ?? 60);
      setCooldownMobile(mobile);
      setResendTimer(cooldown);
      setOtpSent(true);
      setMessage("OTP sent successfully.");
    } catch (err: any) {
      const errMsg = err?.message || "Unable to send OTP. Please check the mobile number.";
      setMessage(errMsg);
      const cooldown =
        err?.retryAfter ??
        (typeof errMsg === "string" && errMsg.match(/(\d+)\s*second/i)
          ? parseInt(errMsg.match(/(\d+)\s*second/i)![1], 10)
          : 0);
      if (cooldown > 0) {
        setCooldownMobile(mobile);
        setResendTimer(cooldown);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading || mobile.length < 10) return;
    setLoading(true);
    setMessage("");
    setCooldownMobile(mobile);

    try {
      const response = await authService.requestOTP(Number(mobile));
      const cooldown = Math.max(0, response.data.canResendAfter ?? 60);
      setCooldownMobile(mobile);
      setResendTimer(cooldown);
      setOtp("");
      setMessage("New OTP sent successfully.");
    } catch (err: any) {
      const errMsg = err?.message || "Unable to resend OTP. Please try again.";
      setMessage(errMsg);
      const cooldown =
        err?.retryAfter ??
        (typeof errMsg === "string" && errMsg.match(/(\d+)\s*second/i)
          ? parseInt(errMsg.match(/(\d+)\s*second/i)![1], 10)
          : 0);
      if (cooldown > 0) {
        setCooldownMobile(mobile);
        setResendTimer(cooldown);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.length < 4) {
      setMessage("Please enter the 4-digit OTP.");
      return;
    }

    if (requiresName && name.trim().replace(/\s+/g, " ").length < 2) {
      setMessage("Please enter your name.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const hadGuestCartItems = guestStoreService.getCart().length > 0;
      await authService.verifyOTP(
        Number(mobile),
        Number(otp),
        requiresName ? name : undefined,
        requiresEmail && email.trim() ? email.trim() : undefined,
      );
      const session = sessionService.getSession();
      if (session) {
        await guestStoreService.mergeToUser(session.user.id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["cart", session.user.id] }),
          queryClient.invalidateQueries({ queryKey: ["wishlist", session.user.id] }),
        ]);
      }
      const requestedReturn = (location.state as { from?: unknown } | null)?.from;
      const safeReturn =
        typeof requestedReturn === "string" &&
        requestedReturn.startsWith("/") &&
        !requestedReturn.startsWith("//")
          ? requestedReturn
          : null;
      navigate(safeReturn || (hadGuestCartItems ? "/cart" : "/"), {
        replace: true,
      });
    } catch {
      setMessage("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-white px-4 py-4 font-sans sm:px-6 lg:h-[calc(100dvh-5rem)] lg:max-h-[calc(100dvh-5rem)]">
      <div className="w-full min-w-0 max-w-[22rem] sm:max-w-[32rem]">
        {/* Header */}
        <div className="flex items-center justify-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            aria-hidden="true"
          >
            <Smartphone className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <h1 className="text-2xl font-bold leading-tight text-[#070707] sm:text-3xl">
            Login with OTP
          </h1>
        </div>

        <form className="mt-5 sm:mt-6" onSubmit={otpSent ? verifyOtp : requestOtp}>
          {/* STEP 1: MOBILE NUMBER ENTRY */}
          {!otpSent ? (
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#33271b]"
                htmlFor="mobile"
              >
                Mobile Number
              </label>
              <div className="mt-2 flex h-11 overflow-hidden rounded-[var(--radius-sm)] border border-[#d6cfc2] bg-white transition focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20">
                <div className="flex min-w-[4.5rem] items-center justify-center border-r border-[#e1d9cc] bg-[#fbf7ef] text-xs font-semibold text-[#3f3122]">
                  IN&nbsp;<span className="text-sm">+91</span>
                </div>
                <input
                  id="mobile"
                  value={mobile}
                  onChange={(event) => {
                    const cleaned = normalizeIndianMobileInput(event.target.value);
                    setMobile(cleaned);
                    if (message) setMessage("");
                  }}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  className="min-w-0 flex-1 px-3 text-sm text-[#33271b] outline-none placeholder:text-[#b9aea0]"
                  required
                  autoFocus
                />
              </div>
              <p className="mt-1.5 text-xs text-[#9b9188]">
                We'll send a 4-digit one-time password to this number.
              </p>
            </div>
          ) : (
            /* STEP 2: OTP & DETAILS ENTRY (Compact, Non-scrollable Layout) */
            <div className="space-y-3">
              {/* Row 1: Mobile Number (with clean Change action) + Enter OTP */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      className="text-xs font-semibold uppercase tracking-[0.14em] text-[#33271b]"
                      htmlFor="mobile-locked"
                    >
                      Mobile Number
                    </label>
                    <button
                      type="button"
                      onClick={changeMobileNumber}
                      disabled={loading}
                      className="text-xs font-semibold text-[#a87d15] hover:text-[#84610d] hover:underline disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                  <div className="mt-1.5 flex h-11 overflow-hidden rounded-[var(--radius-sm)] border border-[#e1d9cc] bg-[#fbf9f5]">
                    <div className="flex min-w-[4.25rem] items-center justify-center border-r border-[#e8e2d6] bg-[#f5efe4] text-xs font-semibold text-[#5c4935]">
                      IN +91
                    </div>
                    <input
                      id="mobile-locked"
                      value={mobile}
                      readOnly
                      aria-readonly="true"
                      className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-[#4a3f33] outline-none cursor-default"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#33271b]"
                      htmlFor="otp"
                    >
                      Enter OTP
                    </label>
                    {resendTimer > 0 ? (
                      <span className="text-xs font-medium text-[#8f857a]">
                        Resend in <span className="font-semibold text-[#5c4935]">{resendTimer}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="text-xs font-semibold text-[#a87d15] hover:text-[#84610d] hover:underline disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <input
                    id="otp"
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="4-digit OTP"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[#d6cfc2] bg-white px-3 text-sm text-[#33271b] outline-none transition placeholder:text-[#b9aea0] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Row 2: Customer Name (mandatory if requiresName) & Email ID (optional if requiresEmail) */}
              {(requiresName || requiresEmail) && (
                <div
                  className={`grid grid-cols-1 gap-3 ${
                    requiresName && requiresEmail ? "sm:grid-cols-2" : ""
                  }`}
                >
                  {requiresName && (
                    <div>
                      <label
                        className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#33271b]"
                        htmlFor="name"
                      >
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        value={name}
                        onChange={(event) =>
                          setName(event.target.value.slice(0, 100))
                        }
                        placeholder="Enter your full name"
                        autoComplete="name"
                        minLength={2}
                        maxLength={100}
                        className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[#d6cfc2] bg-white px-3 text-sm text-[#33271b] outline-none transition placeholder:text-[#b9aea0] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                        required
                      />
                    </div>
                  )}

                  {requiresEmail && (
                    <div>
                      <label
                        className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#33271b]"
                        htmlFor="email"
                      >
                        Email ID{" "}
                        <span className="font-normal normal-case tracking-normal text-[#766c63]">
                          (Optional)
                        </span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value.slice(0, 255))
                        }
                        placeholder="Enter your email address"
                        autoComplete="email"
                        maxLength={255}
                        className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-[#d6cfc2] bg-white px-3 text-sm text-[#33271b] outline-none transition placeholder:text-[#b9aea0] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feedback message */}
          {displayMessage && (
            <p
              className={`mt-2.5 text-xs font-medium sm:text-sm ${
                displayMessage.toLowerCase().includes("fail") ||
                displayMessage.toLowerCase().includes("error") ||
                displayMessage.toLowerCase().includes("wait") ||
                displayMessage.toLowerCase().includes("unable")
                  ? "text-[#b24838]"
                  : "text-[#2e7d32]"
              }`}
            >
              {displayMessage}
            </p>
          )}

          {/* Submit Button */}
          <Button
            className="mt-4 h-11 w-full bg-[var(--color-primary)] text-sm font-semibold text-black shadow-none hover:bg-[var(--color-primary)]/90 hover:text-black hover:shadow-none disabled:bg-[var(--color-primary)]/60 disabled:text-black/70 sm:mt-5"
            disabled={loading || (!otpSent && isCooldownActive)}
          >
            {loading
              ? "Please wait..."
              : otpSent
              ? "Verify OTP"
              : isCooldownActive
              ? `Wait ${resendTimer}s before resending`
              : "Send OTP"}
          </Button>
        </form>

        {/* Footer legal text */}
        <p className="mx-auto mt-4 max-w-[28rem] text-center text-xs leading-5 text-[#9a8e80] sm:mt-6 sm:text-sm">
          By continuing, you agree to Nivaana's{" "}
          <Link
            className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]/80"
            to="/terms"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]/80"
            to="/privacy"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
};

export default Login;

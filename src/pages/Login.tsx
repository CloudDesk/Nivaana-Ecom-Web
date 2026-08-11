import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone } from "lucide-react";
import { authService } from "../services/authService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { Button } from "../components/ui/button";

const Login: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [requiresName, setRequiresName] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const changeMobileNumber = () => {
    setOtpSent(false);
    setRequiresName(false);
    setOtp("");
    setName("");
    setMessage("");
  };

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mobile.length < 10) {
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await authService.requestOTP(Number(mobile));
      setRequiresName(Boolean(response.data.requiresName ?? response.data.isNewUser));
      setOtpSent(true);
      setMessage("OTP sent successfully.");
    } catch {
      setMessage("Unable to send OTP. Please check the mobile number.");
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
      await authService.verifyOTP(Number(mobile), Number(otp), requiresName ? name : undefined);
      const session = sessionService.getSession();
      if (session) {
        await guestStoreService.mergeToUser(session.user.id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["cart", session.user.id] }),
          queryClient.invalidateQueries({ queryKey: ["wishlist", session.user.id] }),
        ]);
      }
      navigate(hadGuestCartItems ? "/cart" : "/", { replace: true });
    } catch {
      setMessage("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-white px-6 py-12 font-sans lg:min-h-[calc(100vh-5rem)]">
      <div className="w-full min-w-0 max-w-[21.375rem] sm:max-w-[28rem]">
        <div className="flex items-center justify-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/10 text-[var(--color-primary)]" aria-hidden="true">
            <Smartphone className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <h1 className="text-3xl font-bold leading-tight text-[#070707] sm:text-4xl">
            Login with OTP
          </h1>
        </div>

        <form className="mt-8" onSubmit={otpSent ? verifyOtp : requestOtp}>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#33271b]" htmlFor="mobile">
            Mobile Number
          </label>
          <div className="mt-3 flex h-12 overflow-hidden rounded-[var(--radius-sm)] border border-[#d6cfc2] bg-white transition focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20">
            <div className="flex min-w-[4.75rem] items-center justify-center border-r border-[#e1d9cc] bg-[#fbf7ef] text-xs font-semibold text-[#3f3122]">
              IN&nbsp;<span className="text-sm">+91</span>
            </div>
            <input
              id="mobile"
              value={mobile}
              onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              autoComplete="tel"
              readOnly={otpSent}
              aria-readonly={otpSent}
              className={`min-w-0 flex-1 px-4 text-sm text-[#33271b] outline-none placeholder:text-[#b9aea0] ${
                otpSent ? "cursor-not-allowed bg-[#f4f1eb] text-[#766c63]" : "bg-white"
              }`}
              required
            />
          </div>
          <p className="mt-2 text-sm text-[#9b9188]">
            {otpSent
              ? `OTP sent to +91 ${mobile}.`
              : "We'll send a one-time password to this number."}
          </p>

          {otpSent && (
            <button
              type="button"
              onClick={changeMobileNumber}
              disabled={loading}
              className="mt-3 inline-flex items-center gap-2 bg-transparent p-0 text-sm font-semibold text-[#766c63] shadow-none transition hover:bg-transparent hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to change mobile number
            </button>
          )}

          {otpSent && (
            <>
              {requiresName && (
                <div className="mt-5">
                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#33271b]" htmlFor="name">
                    Customer Name
                  </label>
                  <input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value.slice(0, 100))}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    className="mt-3 h-12 w-full rounded-[var(--radius-sm)] border border-[#d6cfc2] bg-white px-4 text-sm text-[#33271b] outline-none transition placeholder:text-[#b9aea0] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                  />
                </div>
              )}

              <div className="mt-5">
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#33271b]" htmlFor="otp">
                  One-Time Password
                </label>
                <input
                  id="otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4-digit OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="mt-3 h-12 w-full rounded-[var(--radius-sm)] border border-[#d6cfc2] bg-white px-4 text-sm text-[#33271b] outline-none transition placeholder:text-[#b9aea0] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  required
                />
              </div>
            </>
          )}

          {message && <p className="mt-4 text-sm font-medium text-[#766c63]">{message}</p>}

          <Button
            className="mt-6 h-12 w-full bg-[var(--color-primary)] text-sm font-semibold text-black shadow-none hover:bg-[var(--color-primary)]/90 hover:text-black hover:shadow-none disabled:bg-[var(--color-primary)]/60 disabled:text-black/70"
            disabled={loading}
          >
            {loading ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}
          </Button>
        </form>

        <p className="mx-auto mt-8 max-w-[30rem] text-center text-sm leading-6 text-[#9a8e80]">
          By continuing, you agree to Nivaana's{" "}
          <Link className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]/80" to="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]/80" to="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
};

export default Login;

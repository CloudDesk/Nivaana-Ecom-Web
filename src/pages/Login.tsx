import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Smartphone } from "lucide-react";
import { authService } from "../services/authService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { Button } from "../components/ui/button";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const session = sessionService.getSession();
  const locationState = location.state && typeof location.state === "object" ? (location.state as { from?: unknown }).from : null;
  const redirectParam = searchParams.get("redirect");
  const redirectTarget =
    typeof locationState === "string" && locationState.startsWith("/") && locationState !== "/login"
      ? locationState
      : redirectParam?.startsWith("/") && redirectParam !== "/login"
        ? redirectParam
        : "/account";

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mobile.length < 10) {
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await authService.requestOTP(Number(mobile));
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

    setLoading(true);
    setMessage("");

    try {
      await authService.verifyOTP(Number(mobile), Number(otp));
      const session = sessionService.getSession();
      if (session) {
        await guestStoreService.mergeToUser(session.user.id);
      }
      navigate(redirectTarget, { replace: true });
    } catch {
      setMessage("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate, redirectTarget, session]);

  if (session) return null;

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-[#f7f6f2] px-6 py-12 lg:min-h-[calc(100vh-5rem)]">
      <div className="w-full min-w-0 max-w-[21.375rem] sm:max-w-[28rem]">
        <div className="flex items-center justify-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[#edca78] bg-[#fff8e8] text-[#d29210]" aria-hidden="true">
            <Smartphone className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <h1 className="font-['Cormorant_Garamond'] text-3xl font-bold leading-tight text-[#070707] sm:text-4xl">
            Login with OTP
          </h1>
        </div>

        <form className="mt-8" onSubmit={otpSent ? verifyOtp : requestOtp}>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#33271b]" htmlFor="mobile">
            Mobile Number
          </label>
          <div className="mt-3 flex h-12 overflow-hidden rounded-[var(--radius-sm)] border border-[#d6cfc2] bg-white transition focus-within:border-[#d29210] focus-within:ring-2 focus-within:ring-[#d29210]/15">
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
              className="min-w-0 flex-1 px-4 text-sm text-[#33271b] outline-none placeholder:text-[#b9aea0]"
              required
            />
          </div>
          <p className="mt-2 text-sm text-[#9b9188]">We'll send a one-time password to this number.</p>

          {otpSent && (
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
                className="mt-3 h-12 w-full rounded-[var(--radius-sm)] border border-[#d6cfc2] bg-white px-4 text-sm text-[#33271b] outline-none transition placeholder:text-[#b9aea0] focus:border-[#d29210] focus:ring-2 focus:ring-[#d29210]/15"
                required
              />
            </div>
          )}

          {message && <p className="mt-4 text-sm font-medium text-[#766c63]">{message}</p>}

          <Button
            className="mt-6 h-12 w-full bg-[#d29210] text-sm font-bold text-white shadow-none hover:bg-[#b97f0e] hover:shadow-none"
            disabled={loading}
          >
            {loading ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}
          </Button>
        </form>

        <p className="mx-auto mt-8 max-w-[30rem] text-center text-sm leading-6 text-[#9a8e80]">
          By continuing, you agree to Nivaana's{" "}
          <Link className="font-medium text-[#c17c00] hover:text-[#9e6500]" to="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="font-medium text-[#c17c00] hover:text-[#9e6500]" to="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
};

export default Login;

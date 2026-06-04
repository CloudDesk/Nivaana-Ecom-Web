import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone } from "lucide-react";
import { authService } from "../services/authService";
import { sessionService } from "../services/sessionService";
import { guestStoreService } from "../services/guestStoreService";
import { Button } from "../components/ui/button";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const session = sessionService.getSession();

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
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
    setLoading(true);
    setMessage("");

    try {
      await authService.verifyOTP(Number(mobile), Number(otp));
      const session = sessionService.getSession();
      if (session) {
        await guestStoreService.mergeToUser(session.user.id);
      }
      navigate("/", { replace: true });
    } catch {
      setMessage("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      navigate("/account", { replace: true });
    }
  }, [navigate, session]);

  if (session) return null;

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-12">
      <section className="mx-auto max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-card)]">
        <Smartphone className="h-8 w-8 text-[var(--color-secondary)]" />
        <h1 className="mt-5 text-2xl font-bold text-[var(--color-text)]">Login with OTP</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
          Use your mobile number to access cart, wishlist, and checkout.
        </p>

        <form className="mt-6 space-y-4" onSubmit={otpSent ? verifyOtp : requestOtp}>
          <input
            value={mobile}
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 text-sm outline-none focus:border-[var(--color-secondary)]"
            required
          />
          {otpSent && (
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit OTP"
              className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 text-sm outline-none focus:border-[var(--color-secondary)]"
              required
            />
          )}
          {message && <p className="text-sm text-[var(--color-muted)]">{message}</p>}
          <Button className="w-full" disabled={loading || mobile.length < 10}>
            {loading ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}
          </Button>
        </form>
      </section>
    </main>
  );
};

export default Login;

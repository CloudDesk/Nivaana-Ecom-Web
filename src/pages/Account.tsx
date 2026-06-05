import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, Heart, LogOut, MapPin, PackageCheck, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { getUserDisplayName, sessionService, type AuthSession } from "../services/sessionService";

const Account: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(() => sessionService.getSession());

  useEffect(() => {
    const refresh = () => setSession(sessionService.getSession());
    window.addEventListener("nivaana-session-change", refresh);
    return () => window.removeEventListener("nivaana-session-change", refresh);
  }, []);

  const handleLogout = () => {
    sessionService.clearSession();
    navigate("/", { replace: true });
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-12">
        <section className="mx-auto max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <UserRound className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
          <h1 className="mt-5 text-2xl font-bold text-[var(--color-text)]">Welcome, Guest</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Sign in to access your profile, cart, wishlist, and checkout.
          </p>
          <Link to="/login" className="mt-6 inline-flex">
            <Button>Sign In</Button>
          </Link>
        </section>
      </main>
    );
  }

  const user = session.user;
  const displayName = getUserDisplayName(user);
  const email = user.useremail?.trim();
  const mobile = user.usermobilenumber?.toString();

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">My Account</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Manage your Nivaana profile and shopping shortcuts.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary)]/30 text-[var(--color-secondary)]">
              <UserRound className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-[var(--color-text)]">{displayName}</h2>
            <div className="mt-3 space-y-1 text-sm text-[var(--color-muted)]">
              {email && <p>{email}</p>}
              {mobile && <p>{mobile}</p>}
              {user.isbusinessuser && <p>Business user</p>}
            </div>
            <Button variant="secondary" className="mt-6 w-full gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]">
            <AccountLink
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Cart"
              description="Review saved cart items and continue checkout."
              to="/cart"
            />
            <AccountLink
              icon={<Heart className="h-5 w-5" />}
              title="Wishlist"
              description="See products you saved for later."
              to="/wishlist"
            />
            <AccountLink
              icon={<PackageCheck className="h-5 w-5" />}
              title="Orders"
              description="View order history, tracking, and purchased items."
              to="/orders"
            />
            <AccountLink
              icon={<CreditCard className="h-5 w-5" />}
              title="Payments"
              description="Check pending online payment status."
              to="/payments"
            />
            <AccountLink
              icon={<MapPin className="h-5 w-5" />}
              title="Saved Addresses"
              description="Manage your delivery addresses for checkout."
              to="/addresses"
            />
            <AccountLink
              icon={<Trash2 className="h-5 w-5" />}
              title="Delete My Account"
              description="Request account deletion using mobile OTP verification."
              to="/delete-my-account"
            />
          </section>
        </div>
      </section>
    </main>
  );
};

function AccountLink({
  icon,
  title,
  description,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-[var(--radius-sm)] px-4 py-4 transition hover:bg-[var(--color-surface)]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[var(--color-text)]">{title}</span>
        <span className="mt-1 block text-sm text-[var(--color-muted)]">{description}</span>
      </span>
    </Link>
  );
}

export default Account;

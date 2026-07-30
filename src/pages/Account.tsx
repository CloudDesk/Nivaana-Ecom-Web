import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, CreditCard, Heart, Info, LogOut, MapPin, PackageCheck, Pencil, ShoppingBag, TicketPercent, Trash2, UserRound, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { getUserDisplayName, hasRequiredUserName, sessionService, type AuthSession } from "../services/sessionService";
import { userService } from "../services/userService";

const Account: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<AuthSession | null>(() => sessionService.getSession());
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    const refresh = () => setSession(sessionService.getSession());
    window.addEventListener("nivaana-session-change", refresh);
    return () => window.removeEventListener("nivaana-session-change", refresh);
  }, []);

  useEffect(() => {
    if (session && !hasRequiredUserName(session.user)) {
      setFirstName(session.user.firstname?.trim() || "");
      setLastName(session.user.lastname?.trim() || "");
      setIsEditingName(true);
    }
  }, [session]);

  const handleLogout = () => {
    sessionService.clearSession();
    navigate("/", { replace: true });
  };

  const beginNameEdit = () => {
    const currentUser = session?.user;
    setFirstName(currentUser?.firstname?.trim() || "");
    setLastName(currentUser?.lastname?.trim() || "");
    setNameMessage("");
    setNameError("");
    setIsEditingName(true);
  };

  const cancelNameEdit = () => {
    if (!hasRequiredUserName(session?.user)) return;
    setIsEditingName(false);
    setNameError("");
  };

  const handleNameUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (trimmedFirstName.length < 2) {
      setNameError("First name is required and must contain at least 2 characters.");
      setNameMessage("");
      return;
    }

    setSavingName(true);
    setNameError("");
    setNameMessage("");

    try {
      const response = await userService.updateProfile(session.user.id, {
        firstname: trimmedFirstName || null,
        lastname: trimmedLastName || null,
      });
      const updatedUser = response.data || {
        ...session.user,
        firstname: trimmedFirstName || null,
        lastname: trimmedLastName || null,
      };
      sessionService.saveSession({
        token: session.token,
        refreshToken: session.refreshToken,
        user: updatedUser,
      });
      setSession({ ...session, user: updatedUser });
      setIsEditingName(false);
      setNameMessage("Name updated successfully.");

      const routeState =
        location.state && typeof location.state === "object"
          ? (location.state as { from?: unknown })
          : null;
      const returnTo =
        typeof routeState?.from === "string" &&
        routeState.from.startsWith("/") &&
        !routeState.from.startsWith("/account")
          ? routeState.from
          : null;
      if (returnTo) {
        navigate(returnTo, { replace: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update name. Please try again.";
      setNameError(message);
    } finally {
      setSavingName(false);
    }
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
  const requiresName = !hasRequiredUserName(user);
  const displayName = getUserDisplayName(user);
  const email = user.useremail?.trim();
  const mobile = user.usermobilenumber?.toString();

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">My Account</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Manage your Nivaana profile and shopping shortcuts.</p>

        {requiresName && (
          <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 p-4 text-amber-950" role="status">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-200" aria-hidden="true">
              <Info className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold">Complete your profile</p>
              <p className="mt-1 text-sm leading-6">
                Your name is mandatory for orders, invoices, delivery, and payment verification. Enter your first name below to continue.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary)]/30 text-[var(--color-secondary)]">
              <UserRound className="h-8 w-8" />
            </div>
            <div className="mt-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Profile name</p>
                <h2 className="mt-1 break-words text-xl font-bold text-[var(--color-text)]">
                  {requiresName ? "Name required" : displayName}
                </h2>
              </div>
              {!isEditingName && (
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                  onClick={beginNameEdit}
                  aria-label="Edit profile name"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>

            {isEditingName && (
              <form className="mt-4 space-y-3" onSubmit={handleNameUpdate}>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]" htmlFor="account-first-name">
                    First name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="account-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    placeholder="Enter first name"
                    autoComplete="given-name"
                    minLength={2}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]" htmlFor="account-last-name">
                    Last name
                  </label>
                  <input
                    id="account-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    placeholder="Enter last name"
                    autoComplete="family-name"
                  />
                </div>
                <div className={requiresName ? "" : "grid grid-cols-2 gap-2"}>
                  <Button type="submit" className="gap-2 px-3" disabled={savingName}>
                    <Check className="h-4 w-4" />
                    {savingName ? "Saving" : "Save"}
                  </Button>
                  {!requiresName && (
                    <Button type="button" variant="ghost" className="gap-2 px-3" onClick={cancelNameEdit} disabled={savingName}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
            {(nameMessage || nameError) && (
              <p className={nameError ? "mt-3 text-sm font-medium text-red-600" : "mt-3 text-sm font-medium text-green-700"}>
                {nameError || nameMessage}
              </p>
            )}
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
              icon={<TicketPercent className="h-5 w-5" />}
              title="Promotions"
              description="View offers that apply to your current cart."
              to="/promotions"
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

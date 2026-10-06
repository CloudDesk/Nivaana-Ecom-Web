import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface AccountBreadcrumbProps {
  currentPage: string;
  className?: string;
}

export const AccountBreadcrumb: React.FC<AccountBreadcrumbProps> = ({
  currentPage,
  className = "",
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`mb-4 flex items-center gap-1.5 text-xs font-semibold sm:text-sm ${className}`}
    >
      <Link
        to="/account"
        className="flex items-center gap-1 text-[var(--color-muted)] transition-colors hover:text-[var(--color-secondary)] hover:underline"
      >
        Account
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted)]/70" />
      <span className="text-[var(--color-text)] font-semibold">{currentPage}</span>
    </nav>
  );
};

export default AccountBreadcrumb;

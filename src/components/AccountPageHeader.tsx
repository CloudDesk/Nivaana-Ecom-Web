import React from "react";
import { AccountBreadcrumb } from "./AccountBreadcrumb";

/** Shared title block for account pages (layout classes: lib/accountLayout.ts). */
export function AccountPageHeader({
  currentPage,
  title,
  subtitle,
  action,
}: {
  /** Breadcrumb label; omit on the My Account page itself. */
  currentPage?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional element on the right of the title (e.g. a page action). */
  action?: React.ReactNode;
}) {
  return (
    <header>
      {currentPage && <AccountBreadcrumb currentPage={currentPage} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-[var(--color-text)]">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-[var(--color-muted)]">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export default AccountPageHeader;

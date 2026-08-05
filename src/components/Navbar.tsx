import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Heart,
  House,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { brandLogoGoogleYellow as logoIcon } from "../assets/config.js";
import { theme } from "../config/theme.config";
import { getProductDisplayName } from "../lib/productDisplay";
import { cn } from "../lib/utils";
import { cartService } from "../services/cartService";
import { couponWalletService } from "../services/couponWalletService";
import { guestStoreService } from "../services/guestStoreService";
import { platformProductService } from "../services/productPlatformService";
import { getUserDisplayName, sessionService } from "../services/sessionService";
import { buildCategoryGroups } from "./categoryNavigationData";
import { Button } from "./ui/button";

const countDistinctProducts = (items: Array<{ productid: number }>) =>
  new Set(items.map((item) => item.productid)).size;

const desktopNavLinkClass =
  "group relative inline-flex h-10 items-center whitespace-nowrap px-3 text-sm font-semibold text-black transition-colors after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-left after:scale-x-0 after:rounded-full after:bg-black after:transition-transform after:duration-200 hover:text-black hover:after:scale-x-100 xl:px-4 xl:text-base";

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeCategoryHeading, setActiveCategoryHeading] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [, setStoreVersion] = useState(0);
  const categoryCloseTimer = React.useRef<number | null>(null);
  const scrollTickingRef = React.useRef(false);
  const session = sessionService.getSession();

  const scrollHomeToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  const handleHomeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setActiveCategoryHeading(null);

    if (location.pathname === "/" && !location.search && !location.hash) {
      event.preventDefault();
      scrollHomeToTop();
    }
  };

  const { data: productResponse } = useQuery({
    queryKey: ["navbar-search-products"],
    queryFn: () => platformProductService.getProducts(1, 50),
    staleTime: 1000 * 60,
  });

  const categoryTreeQuery = useQuery({
    queryKey: ["product-category-tree", "sortorder-v3"],
    queryFn: () => platformProductService.getCategoryTree(),
    staleTime: 1000 * 60,
  });
  const categoryGroups = useMemo(
    () => buildCategoryGroups(categoryTreeQuery.data?.data),
    [categoryTreeQuery.data?.data]
  );

  const cartQuery = useQuery({
    queryKey: ["cart", session?.user.id],
    queryFn: () => cartService.getCart(session!.user.id),
    enabled: Boolean(session),
    staleTime: 1000 * 60,
  });

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", session?.user.id],
    queryFn: () => cartService.getWishlist(session!.user.id),
    enabled: Boolean(session),
    staleTime: 1000 * 60,
  });

  const walletQuery = useQuery({
    queryKey: ["wallet", session?.user.id],
    queryFn: () => couponWalletService.getWallet(),
    enabled: Boolean(session),
    staleTime: 1000 * 30,
  });

  const guestCartCount = countDistinctProducts(guestStoreService.getCart());
  const guestWishlistCount = countDistinctProducts(guestStoreService.getWishlist());
  const cartCount = session ? countDistinctProducts(cartQuery.data?.data ?? []) : guestCartCount;
  const wishlistCount = session ? countDistinctProducts(wishlistQuery.data?.data ?? []) : guestWishlistCount;
  const accountLabel = session ? getUserDisplayName(session.user) : "Account";
  const walletBalance = Number(walletQuery.data?.data.balance || 0);
  const isHomeRoute = location.pathname === "/" && !location.search && !location.hash;
  const isWishlistRoute = location.pathname === "/wishlist";
  const isAccountRoute = location.pathname === "/account" || location.pathname === "/login";
  const isCartRoute = location.pathname === "/cart";
  const isWalletRoute = location.pathname === "/wallet";
  const showsCategoryRail = location.pathname === "/products" || location.pathname.startsWith("/products/");
  const searchSuggestions = (productResponse?.data ?? [])
    .filter((product) => {
      const query = searchTerm.trim().toLowerCase();
      if (query.length < 2) return false;
      return [
        product.name,
        product.category,
        product.subcategory,
        product.subsubcategory,
        product.fragnancetype,
        product.brand,
        product.puc,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .slice(0, 6);

  useEffect(() => {
    const onScroll = () => {
      if (scrollTickingRef.current) return;

      scrollTickingRef.current = true;
      window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 16);
        scrollTickingRef.current = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const refresh = () => setStoreVersion((version) => version + 1);
    window.addEventListener("nivaana-guest-store-change", refresh);
    window.addEventListener("nivaana-session-change", refresh);
    return () => {
      window.removeEventListener("nivaana-guest-store-change", refresh);
      window.removeEventListener("nivaana-session-change", refresh);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveCategoryHeading(null);
    setIsSearchOpen(false);
  }, [location.hash, location.pathname, location.search]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
    setSearchTerm("");
    setIsSearchOpen(false);
  };

  const handleSuggestionClick = (query: string) => {
    setSearchTerm("");
    setIsSearchOpen(false);
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  const openCategoriesMenu = (heading: string) => {
    window.clearTimeout(categoryCloseTimer.current ?? undefined);
    setActiveCategoryHeading(heading);
  };

  const closeCategoriesMenu = () => {
    window.clearTimeout(categoryCloseTimer.current ?? undefined);
    categoryCloseTimer.current = window.setTimeout(() => {
      setActiveCategoryHeading(null);
    }, 120);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  };

  const searchBox = (inputClassName: string, dropdownClassName = "") => (
    <>
      <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#fbbc05]" />
      <input
        aria-label="Search products"
        placeholder="Search"
        value={searchTerm}
        onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
        onChange={(event) => {
          setSearchTerm(event.target.value);
          setIsSearchOpen(true);
        }}
        onFocus={() => setIsSearchOpen(true)}
        className={inputClassName}
      />
      {isSearchOpen && searchSuggestions.length > 0 && (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-hover)]",
            dropdownClassName || "right-0"
          )}
        >
          {searchSuggestions.map((product) => {
            const displayName = getProductDisplayName(product);

            return (
              <button
                key={product.id}
                type="button"
                className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition hover:bg-[var(--color-surface)]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionClick(product.name)}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/25 text-xs font-bold text-[var(--color-secondary)]">
                  {displayName.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
                    {displayName}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full max-w-full bg-[#33405d] [transform:none]">
      <motion.nav
        className={cn(
          "w-full border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
          isScrolled
            ? "border-[#fbbc05]/20 bg-[#33405d]/95 shadow-[var(--shadow-header)] backdrop-blur"
            : "border-[#fbbc05]/15 bg-[#33405d]/95 backdrop-blur-md"
        )}
      >
        <div className={cn(theme.layout.container, "flex h-[4.5rem] items-center justify-between gap-2 lg:h-24 lg:gap-4")}>
          <button
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#fbbc05]/30 bg-[#26324a] text-[#fbbc05] lg:hidden"
            onClick={() => {
              setIsMobileMenuOpen((value) => !value);
              setIsSearchOpen(false);
            }}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="navbar-brand-logo header-brand-logo" onClick={handleHomeClick} aria-label="Nivaana home">
            <img src={logoIcon} alt="" className="navbar-brand-icon" loading="eager" />
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center px-4 md:flex">
            <form className="relative w-full max-w-[420px] xl:max-w-[520px]" onSubmit={handleSearchSubmit}>
              {searchBox(
                "h-12 w-full rounded-full border border-[#fbbc05]/25 bg-[#26324a] pl-12 pr-5 text-base font-semibold text-[#fbbc05] outline-none placeholder:text-[#fbbc05] transition focus:border-[#fbbc05]",
                "w-full"
              )}
            </form>
          </div>

          <div className="hidden items-center gap-3 md:flex lg:pr-6 xl:pr-10">
            <Link to="/" onClick={handleHomeClick}>
              <Button
                variant="icon"
                aria-label="Home"
                className={cn(
                  "relative w-12 min-h-12 border border-[#fbbc05]/25 bg-[#26324a] text-[#fbbc05] hover:bg-[#3f4d6c] hover:text-[#fbbc05]",
                  isHomeRoute && "bg-[#fbbc05] text-[#26324a] hover:bg-[#fbbc05] hover:text-[#26324a]"
                )}
              >
                <House className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/wishlist">
              <Button
                variant="icon"
                aria-label="Wishlist"
                className={cn(
                  "relative w-12 min-h-12 border border-[#fbbc05]/25 bg-[#26324a] text-[#fbbc05] hover:bg-[#3f4d6c] hover:text-[#fbbc05]",
                  isWishlistRoute && "bg-[#fbbc05] text-[#26324a] hover:bg-[#fbbc05] hover:text-[#26324a]"
                )}
              >
                <Heart className="h-5 w-5" />
                <Badge count={wishlistCount} />
              </Button>
            </Link>
            {session && <Link to="/wallet">
              <Button
                variant="secondary"
                aria-label={`Wallet balance ${formatWalletBalance(walletBalance)}`}
                className={cn(
                  "h-12 min-h-12 gap-2 rounded-full border border-[#fbbc05]/25 bg-[#26324a] px-3 text-[#fbbc05] hover:bg-[#3f4d6c] hover:text-[#fbbc05]",
                  isWalletRoute && "border-[#fbbc05] bg-[#fbbc05] text-[#26324a] hover:bg-[#fbbc05] hover:text-[#26324a]"
                )}
              >
                <WalletCards className="h-5 w-5 shrink-0" />
                <span className={cn("rounded-full bg-[#fbbc05] px-2 py-1 text-xs font-bold text-[#26324a]", isWalletRoute && "bg-[#26324a] text-[#fbbc05]")}>{walletQuery.isLoading ? "…" : formatWalletBalance(walletBalance)}</span>
              </Button>
            </Link>}
            <Link to={session ? "/account" : "/login"}>
              <Button
                variant={session ? "secondary" : "icon"}
                aria-label={session ? `Account for ${accountLabel}` : "Account"}
                className={cn(
                  "min-h-12",
                  session
                    ? "h-12 max-w-52 gap-2 rounded-full border-[#fbbc05]/25 bg-[#26324a] px-4 text-[#fbbc05] hover:bg-[#3f4d6c] hover:text-[#fbbc05]"
                    : "w-12 border border-[#fbbc05]/25 bg-[#26324a] text-[#fbbc05] hover:bg-[#3f4d6c] hover:text-[#fbbc05]",
                  isAccountRoute && "border-[#fbbc05] bg-[#fbbc05] text-[#26324a] hover:bg-[#fbbc05] hover:text-[#26324a]"
                )}
              >
                <UserRound className={cn("h-5 w-5 shrink-0 text-[#fbbc05]", isAccountRoute && "text-[#26324a]")} />
                {session && <span className={cn("truncate text-sm font-bold text-[#fbbc05]", isAccountRoute && "text-[#26324a]")}>{accountLabel}</span>}
              </Button>
            </Link>
            <Link to="/cart">
              <Button
                variant="icon"
                aria-label="Cart"
                className={cn(
                  "relative w-12 min-h-12 border border-[#fbbc05]/25 bg-[#26324a] text-[#fbbc05] hover:bg-[#3f4d6c] hover:text-[#fbbc05]",
                  isCartRoute && "bg-[#fbbc05] text-[#26324a] hover:bg-[#fbbc05] hover:text-[#26324a]"
                )}
              >
                <ShoppingBag className="h-5 w-5" />
                <Badge count={cartCount} />
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#fbbc05]/25 bg-[#26324a] text-[#fbbc05] shadow-sm transition hover:bg-[#3f4d6c] hover:text-[#fbbc05]"
              onClick={() => {
                setIsSearchOpen((value) => !value);
                setIsMobileMenuOpen(false);
              }}
              aria-label="Search products"
              aria-expanded={isSearchOpen}
            >
              <Search className="h-5 w-5" />
            </button>
            {session && <Link
              to="/wallet"
              aria-label={`Wallet balance ${formatWalletBalance(walletBalance)}`}
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-full border border-[#fbbc05]/25 bg-[#26324a] text-[#fbbc05] shadow-sm transition hover:bg-[#3f4d6c] hover:text-[#fbbc05]",
                isWalletRoute && "bg-[#fbbc05] text-[#26324a] hover:bg-[#fbbc05] hover:text-[#26324a]"
              )}
            >
              <WalletCards className="h-5 w-5" />
              <WalletBalanceBadge balance={walletBalance} loading={walletQuery.isLoading} />
            </Link>}
            <Link
              to={session ? "/account" : "/login"}
              aria-label={session ? `Account for ${accountLabel}` : "Account"}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full border border-[#fbbc05]/25 bg-[#26324a] text-[#fbbc05] shadow-sm transition hover:bg-[#3f4d6c] hover:text-[#fbbc05]",
                isAccountRoute && "bg-[#fbbc05] text-[#26324a] hover:bg-[#fbbc05] hover:text-[#26324a]"
              )}
            >
              <UserRound className="h-5 w-5" />
            </Link>
            <Link
              to="/cart"
              aria-label="Cart"
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-full border border-[#fbbc05]/25 bg-[#26324a] text-[#fbbc05] shadow-sm transition hover:bg-[#3f4d6c] hover:text-[#fbbc05]",
                isCartRoute && "bg-[#fbbc05] text-[#26324a] hover:bg-[#fbbc05] hover:text-[#26324a]"
              )}
            >
              <ShoppingBag className="h-5 w-5" />
              <Badge count={cartCount} />
            </Link>
          </div>
        </div>
      </motion.nav>

      {!showsCategoryRail && (
      <div className="relative z-40 hidden border-b border-[#e5e7eb] bg-white lg:block">
        <div className={cn(theme.layout.container, "flex h-11 items-center justify-center gap-1 overflow-visible whitespace-nowrap")}>
          {categoryGroups.map((group) => (
            <div
              key={group.heading}
              className="relative flex h-11 items-center"
              onMouseEnter={() => group.links.length > 0 && openCategoriesMenu(group.heading)}
              onMouseLeave={closeCategoriesMenu}
              onFocus={() => group.links.length > 0 && openCategoriesMenu(group.heading)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setActiveCategoryHeading(null);
                }
              }}
            >
              <div
                className={cn(
                  "inline-flex h-10 items-center overflow-hidden transition"
                )}
              >
                <Link
                  to={group.to}
                  className={cn(
                    desktopNavLinkClass,
                    "pr-1 after:right-1",
                    activeCategoryHeading === group.heading && "text-black after:scale-x-100"
                  )}
                >
                  {group.heading}
                </Link>
                {group.links.length > 0 && (
                  <button
                    type="button"
                    className="grid h-10 w-8 place-items-center bg-transparent p-0 text-black transition hover:text-black"
                    aria-label={`Show ${group.heading} subcategories`}
                    aria-expanded={activeCategoryHeading === group.heading}
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveCategoryHeading((current) => (current === group.heading ? null : group.heading));
                    }}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        activeCategoryHeading === group.heading && "rotate-180"
                      )}
                    />
                  </button>
                )}
              </div>
              <AnimatePresence>
                {group.links.length > 0 && activeCategoryHeading === group.heading && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="absolute left-0 top-full z-50 mt-[1px] w-max min-w-full max-w-[min(26rem,calc(100vw-2rem))] rounded-[2px] border border-[#e5e7eb] bg-white px-5 py-3 shadow-[var(--shadow-hover)]"
                  >
                    <Link
                      to={group.to}
                      className="mb-2 block whitespace-nowrap text-sm font-semibold text-black transition hover:text-[#485470]"
                    >
                      {group.heading}
                    </Link>
                    <div className="h-px scale-y-[0.35] bg-[#e5e7eb]" />
                    <div className="mt-2 grid gap-1">
                      {group.links.map((item) => (
                        <div key={item.label}>
                          <Link
                            to={item.to}
                            className="block whitespace-nowrap px-1.5 py-1 text-sm font-semibold leading-snug text-black transition-colors hover:text-[#485470]"
                          >
                            {item.label}
                          </Link>
                          {item.children && (
                            <div className="ml-2 mt-1 space-y-1 border-l-[0.5px] border-[#e5e7eb] pl-2">
                              {item.children.map((child) => (
                                <Link
                                  key={child.label}
                                  to={child.to}
                                  className="block whitespace-nowrap px-1.5 py-0.5 text-xs font-semibold leading-snug text-black transition-colors hover:text-[#485470]"
                                >
                                  {child.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
      )}

      <AnimatePresence>
        {isSearchOpen && !isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="border-b border-[#fbbc05]/20 bg-[#33405d] px-4 py-3 shadow-[var(--shadow-card)] md:hidden"
          >
            <form className={cn(theme.layout.container, "relative")} onSubmit={handleSearchSubmit}>
              {searchBox("h-12 w-full rounded-full border border-[#fbbc05]/25 bg-[#26324a] pl-14 pr-5 text-base font-semibold text-[#fbbc05] outline-none placeholder:text-[#fbbc05] focus:border-[#fbbc05] md:ml-auto md:w-[420px]")}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-h-[calc(100vh_-_4.5rem)] overflow-y-auto overscroll-contain border-b border-[#fbbc05]/20 bg-[#33405d] shadow-[var(--shadow-card)] lg:hidden"
          >
            <div className={cn(theme.layout.container, "space-y-2 py-4")}>
              <form className="relative mb-3" onSubmit={handleSearchSubmit}>
                {searchBox("h-12 w-full rounded-full border border-[#fbbc05]/25 bg-[#26324a] pl-14 pr-5 text-base font-semibold text-[#fbbc05] outline-none placeholder:text-[#fbbc05] focus:border-[#fbbc05]")}
              </form>
              <details className="rounded-[var(--radius-sm)] px-3 py-3">
                <summary className="cursor-pointer text-base font-semibold text-[#fbbc05]">
                  Categories
                </summary>
                <div className="mt-4 space-y-5">
                  {categoryGroups.map((group) => (
                    <div key={group.heading}>
                      <Link
                        to={group.to}
                        onClick={closeMobileMenu}
                        className="mb-2 block text-base font-bold text-[#fbbc05] hover:text-[#ffe0a0]"
                      >
                        {group.heading}
                      </Link>
                      <div className="space-y-1">
                        {group.links.map((item) => (
                          <div key={item.label}>
                            <Link
                              to={item.to}
                              onClick={closeMobileMenu}
                              className="block rounded-[var(--radius-sm)] px-2 py-2 text-base text-[#ffe0a0] hover:bg-[#26324a] hover:text-[#fbbc05]"
                            >
                              {item.label}
                            </Link>
                            {item.children && (
                              <div className="ml-3 space-y-1 border-l-[0.5px] border-[#fbbc05]/30 pl-3">
                                {item.children.map((child) => (
                                  <Link
                                    key={child.label}
                                    to={child.to}
                                    onClick={closeMobileMenu}
                                    className="block rounded-[var(--radius-sm)] px-2 py-2 text-sm text-[#ffe0a0]/80 hover:bg-[#26324a] hover:text-[#fbbc05]"
                                  >
                                    {child.label}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
              <Link
                to="/"
                onClick={handleHomeClick}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[#ffe0a0] hover:bg-[#26324a] hover:text-[#fbbc05]"
              >
                <House className="h-5 w-5" />
                Home
              </Link>
              <Link
                to={session ? "/account" : "/login"}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[#ffe0a0] hover:bg-[#26324a] hover:text-[#fbbc05]"
              >
                <UserRound className="h-5 w-5" />
                {session ? accountLabel : "Login"}
              </Link>
              <Link
                to="/wishlist"
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[#ffe0a0] hover:bg-[#26324a] hover:text-[#fbbc05]"
              >
                <Heart className="h-5 w-5" />
                Wishlist
                {wishlistCount > 0 && <span className="ml-auto text-xs font-bold">{wishlistCount}</span>}
              </Link>
              {session && <Link
                to="/wallet"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[#ffe0a0] hover:bg-[#26324a] hover:text-[#fbbc05]"
              >
                <WalletCards className="h-5 w-5" />
                My Wallet
                <span className="ml-auto rounded-full bg-[#fbbc05] px-2.5 py-1 text-xs font-bold text-[#26324a]">{walletQuery.isLoading ? "…" : formatWalletBalance(walletBalance)}</span>
              </Link>}
              <Link
                to="/cart"
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[#ffe0a0] hover:bg-[#26324a] hover:text-[#fbbc05]"
              >
                <ShoppingBag className="h-5 w-5" />
                Cart
                {cartCount > 0 && <span className="ml-auto text-xs font-bold">{cartCount}</span>}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-[var(--color-secondary)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function formatWalletBalance(balance: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: balance % 1 === 0 ? 0 : 2,
  }).format(balance);
}

function WalletBalanceBadge({ balance, loading }: { balance: number; loading: boolean }) {
  return <span className="absolute -right-2 -top-1 min-w-7 rounded-full bg-[#fbbc05] px-1.5 py-0.5 text-[9px] font-bold leading-4 text-[#26324a]">{loading ? "…" : formatWalletBalance(balance)}</span>;
}

export default Navbar;

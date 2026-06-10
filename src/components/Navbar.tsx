import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/Logo.png";
import { theme } from "../config/theme.config";
import { cn } from "../lib/utils";
import { cartService } from "../services/cartService";
import { guestStoreService } from "../services/guestStoreService";
import { platformProductService } from "../services/productPlatformService";
import { getUserDisplayName, sessionService } from "../services/sessionService";
import { Button } from "./ui/button";

const categoryGroups = [
  {
    heading: "Home Fragrance",
    links: [
      { label: "All Home Fragrance", to: "/products?category=home_fragrance" },
      { label: "Incense Sticks", to: "/products?subcategory=incense" },
      { label: "Car & Room Fresheners", to: "/products?subcategory=car_%26_room_fresheners" },
      { label: "Fragrance Sachets", to: "/products?subcategory=fragrance_sachets" },
      { label: "Havan Cups", to: "/products?subcategory=havan_cups" },
    ],
  },
  {
    heading: "Aromatherapy",
    links: [
      { label: "All Aromatherapy", to: "/products?category=aromatherapy_%26_wellness" },
      { label: "Fragrance Blends", to: "/products?subcategory=fragrance_blends" },
      { label: "Essential Oils", to: "/products?subcategory=essential_oils" },
      { label: "Wellness Rituals", to: "/products?category=aromatherapy_%26_wellness" },
    ],
  },
  {
    heading: "Collections",
    links: [
      { label: "Best Sellers", to: "/products?collection=best-sellers" },
      { label: "New Arrivals", to: "/products?collection=new-arrivals" },
      { label: "Deal of the Day", to: "/products?collection=deals" },
      { label: "Gift Sets", to: "/products?collection=gift-sets" },
    ],
  },
];

const countDistinctProducts = (items: Array<{ productid: number }>) => new Set(items.map((item) => item.productid)).size;

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [, setStoreVersion] = useState(0);
  const categoryCloseTimer = React.useRef<number | null>(null);
  const session = sessionService.getSession();

  const { data: productResponse } = useQuery({
    queryKey: ["navbar-search-products"],
    queryFn: () => platformProductService.getProducts(1, 50),
    staleTime: 1000 * 60 * 10,
  });

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

  const guestCartCount = countDistinctProducts(guestStoreService.getCart());
  const guestWishlistCount = countDistinctProducts(guestStoreService.getWishlist());
  const cartCount = session ? countDistinctProducts(cartQuery.data?.data ?? []) : guestCartCount;
  const wishlistCount = session ? countDistinctProducts(wishlistQuery.data?.data ?? []) : guestWishlistCount;
  const accountLabel = session ? getUserDisplayName(session.user) : "Account";
  const isProductDetailsPage = /^\/products\/\d+/.test(location.pathname);

  const searchSuggestions = (productResponse?.data ?? [])
    .filter((product) => {
      const query = searchTerm.trim().toLowerCase();
      if (query.length < 2) return false;
      return [
        product.name,
        product.category,
        product.subcategory,
        product.fragnancetype,
        product.brand,
        product.puc,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .slice(0, 6);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
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
    setIsCategoriesOpen(false);
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

  const openCategoriesMenu = () => {
    window.clearTimeout(categoryCloseTimer.current ?? undefined);
    setIsCategoriesOpen(true);
  };

  const closeCategoriesMenu = () => {
    window.clearTimeout(categoryCloseTimer.current ?? undefined);
    categoryCloseTimer.current = window.setTimeout(() => {
      setIsCategoriesOpen(false);
    }, 120);
  };

  const searchBox = (inputClassName: string, dropdownClassName = "") => (
    <>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
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
          {searchSuggestions.map((product) => (
            <button
              key={product.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-surface)]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSuggestionClick(product.name)}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/25 text-xs font-bold text-[var(--color-secondary)]">
                {product.name.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
                  {product.name}
                </span>
                <span className="block truncate text-xs text-[var(--color-muted)]">
                  {product.subcategory?.replace(/_/g, " ") || product.category?.replace(/_/g, " ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <header className={cn("z-50", isProductDetailsPage ? "relative" : "sticky top-0")}>
      <motion.nav
        className={cn(
          "border-b transition duration-300",
          isScrolled
            ? "border-[var(--color-border)] bg-white/95 shadow-[var(--shadow-header)] backdrop-blur"
            : "border-white/40 bg-white/80 backdrop-blur-md"
        )}
      >
        <div className={cn(theme.layout.container, "flex h-[4.5rem] items-center justify-between gap-4 lg:h-24")}>
          <button
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-secondary)] lg:hidden"
            onClick={() => {
              setIsMobileMenuOpen((value) => !value);
              setIsSearchOpen(false);
            }}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="flex shrink-0 items-center" aria-label="Nivaana home">
            <img src={logo} alt="Nivaana" className="h-14 w-auto lg:h-20" loading="eager" />
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/"
              className="inline-flex h-12 items-center rounded-[var(--radius-sm)] px-5 text-lg font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            >
              Home
            </Link>
            <div className="relative" onMouseEnter={openCategoriesMenu} onMouseLeave={closeCategoriesMenu}>
              <button
                type="button"
                className={cn(
                  "inline-flex h-12 items-center gap-2 rounded-[var(--radius-sm)] px-5 text-lg font-semibold transition hover:bg-[var(--color-surface)]",
                  isCategoriesOpen ? "text-[var(--color-secondary)]" : "text-[var(--color-text)]"
                )}
                onClick={() => navigate("/products")}
                onFocus={openCategoriesMenu}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsCategoriesOpen(false);
                  }
                }}
                aria-expanded={isCategoriesOpen}
                aria-haspopup="true"
              >
                Products <ChevronDown className={cn("h-5 w-5 transition", isCategoriesOpen && "rotate-180")} />
              </button>
            </div>
            <Link
              to="/products?collection=deals"
              className="inline-flex h-12 items-center rounded-[var(--radius-sm)] px-5 text-lg font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            >
              Deals
            </Link>
            <Link
              to="/about"
              className="inline-flex h-12 items-center rounded-[var(--radius-sm)] px-5 text-lg font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            >
              About
            </Link>
            <Link
              to="/#contact"
              className="inline-flex h-12 items-center rounded-[var(--radius-sm)] px-5 text-lg font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            >
              Contact
            </Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <form className="relative hidden xl:block" onSubmit={handleSearchSubmit}>
              {searchBox(
                "h-12 w-64 rounded-full border border-[var(--color-border)] bg-white pl-12 pr-5 text-lg outline-none transition focus:border-[var(--color-secondary)]",
                "w-[400px]"
              )}
            </form>
            <Link to="/wishlist">
              <Button variant="icon" aria-label="Wishlist" className="relative w-12 min-h-12">
                <Heart className="h-5 w-5" />
                <Badge count={wishlistCount} />
              </Button>
            </Link>
            <Link to={session ? "/account" : "/login"}>
              <Button
                variant={session ? "secondary" : "icon"}
                aria-label={session ? `Account for ${accountLabel}` : "Account"}
                className={cn("min-h-12", session ? "h-12 max-w-52 gap-2 rounded-full px-4" : "w-12")}
              >
                <UserRound className="h-5 w-5 shrink-0" />
                {session && <span className="truncate text-sm font-bold">{accountLabel}</span>}
              </Button>
            </Link>
            <Link to="/cart">
              <Button variant="icon" aria-label="Cart" className="relative w-12 min-h-12">
                <ShoppingBag className="h-5 w-5" />
                <Badge count={cartCount} />
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[var(--color-secondary)] shadow-sm transition hover:bg-[var(--color-primary)]"
              onClick={() => {
                setIsSearchOpen((value) => !value);
                setIsMobileMenuOpen(false);
              }}
              aria-label="Search products"
              aria-expanded={isSearchOpen}
            >
              <Search className="h-5 w-5" />
            </button>
            <Link to={session ? "/account" : "/login"} aria-label={session ? `Account for ${accountLabel}` : "Account"} className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[var(--color-secondary)] shadow-sm transition hover:bg-[var(--color-primary)]">
              <UserRound className="h-5 w-5" />
            </Link>
            <Link to="/cart" aria-label="Cart" className="relative grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[var(--color-secondary)] shadow-sm transition hover:bg-[var(--color-primary)]">
              <ShoppingBag className="h-5 w-5" />
              <Badge count={cartCount} />
            </Link>
          </div>

        </div>
      </motion.nav>

      <AnimatePresence>
        {isSearchOpen && !isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="border-b border-[var(--color-border)] bg-white px-4 py-3 shadow-[var(--shadow-card)] md:hidden"
          >
            <form className="relative" onSubmit={handleSearchSubmit}>
              {searchBox("h-12 w-full rounded-full border border-[var(--color-border)] bg-white pl-12 pr-5 text-base outline-none focus:border-[var(--color-secondary)]")}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoriesOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="hidden border-b border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] lg:block"
            onMouseEnter={openCategoriesMenu}
            onMouseLeave={closeCategoriesMenu}
          >
            <div className={cn(theme.layout.container, "grid grid-cols-3 gap-12 py-10")}>
              {categoryGroups.map((group) => (
                <div key={group.heading}>
                  <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
                    {group.heading}
                  </h2>
                  <div className="space-y-3">
                    {group.links.map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        className="block text-base font-medium text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-b border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] lg:hidden"
          >
            <div className={cn(theme.layout.container, "space-y-2 py-4")}>
              <form className="relative mb-3" onSubmit={handleSearchSubmit}>
                {searchBox("h-12 w-full rounded-full border border-[var(--color-border)] pl-12 pr-5 text-base outline-none focus:border-[var(--color-secondary)]")}
              </form>
              <Link to="/" className="block rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-surface)]">
                Home
              </Link>
              <details className="rounded-[var(--radius-sm)] px-3 py-3">
                <summary className="cursor-pointer text-base font-semibold text-[var(--color-secondary)]">
                  Products
                </summary>
                <div className="mt-4 space-y-5">
                  {categoryGroups.map((group) => (
                    <div key={group.heading}>
                      <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        {group.heading}
                      </h2>
                      <div className="space-y-1">
                        {group.links.map((item) => (
                          <Link
                            key={item.label}
                            to={item.to}
                            className="block rounded-[var(--radius-sm)] px-2 py-2 text-base text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-secondary)]"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
              <Link
                to="/products?collection=deals"
                className="block rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-surface)]"
              >
                Deals
              </Link>
              <Link
                to="/about"
                className="block rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-surface)]"
              >
                About
              </Link>
              <Link
                to="/#contact"
                className="block rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-surface)]"
              >
                Contact
              </Link>
              <Link
                to={session ? "/account" : "/login"}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-surface)]"
              >
                <UserRound className="h-5 w-5" />
                {session ? accountLabel : "Login"}
              </Link>
              <Link
                to="/wishlist"
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-surface)]"
              >
                <Heart className="h-5 w-5" />
                Wishlist
                {wishlistCount > 0 && <span className="ml-auto text-xs font-bold">{wishlistCount}</span>}
              </Link>
              <Link
                to="/cart"
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-base font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-surface)]"
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
    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-[var(--color-secondary)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default Navbar;

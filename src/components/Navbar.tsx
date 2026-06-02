import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/Logo.png';
import type { Category } from '../types';
import { useAuth } from '../contexts/authContextCore';
import { useCart } from '../contexts/cartContextCore';
import { useWishlist } from '../contexts/wishlistContextCore';
import { picklistService } from '../services/picklistService';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { getCartCount } = useCart();
  const { getWishlistCount } = useWishlist();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [mobileProductMenuOpen, setMobileProductMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [utilityMenuOpen, setUtilityMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeMenuCategoryId, setActiveMenuCategoryId] = useState<string>();
  const [subcategoryMap, setSubcategoryMap] = useState<Record<string, Category[]>>({});
  const [searchInput, setSearchInput] = useState('');
  const desktopAccountMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileAccountMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopUtilityMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileUtilityMenuRef = useRef<HTMLDivElement | null>(null);
  const cartCount = getCartCount();
  const wishlistCount = getWishlistCount();
  const accountName = isAuthenticated
    ? user?.name || `+91 ${user?.phoneNumber}`
    : 'Guest';

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    const nextOpenState = !isMobileMenuOpen;
    setIsMobileMenuOpen(nextOpenState);

    if (!nextOpenState) {
      setMobileProductMenuOpen(false);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setMobileProductMenuOpen(false);
  };

  const closeProductMenu = () => {
    setProductMenuOpen(false);
  };

  const closeAccountMenu = () => {
    setAccountMenuOpen(false);
  };

  const closeUtilityMenu = () => {
    setUtilityMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    closeAccountMenu();
    closeUtilityMenu();
  };

  const handleMenuLinkClick = () => {
    closeMobileMenu();
    closeAccountMenu();
    closeUtilityMenu();
  };

  const toggleMobileProductMenu = () => {
    const nextOpenState = !mobileProductMenuOpen;
    setMobileProductMenuOpen(nextOpenState);

    if (nextOpenState && categories[0]) {
      void handleCategoryHover(activeMenuCategoryId || categories[0].id);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryItems = await picklistService.getCategories();
        setCategories(categoryItems);
        setActiveMenuCategoryId((current) => current || categoryItems[0]?.id);
      } catch (error) {
        console.error('Error fetching navbar categories:', error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchInput(location.pathname === '/products' ? params.get('q') || '' : '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const trimmedSearch = searchInput.trim();
      const isProductsPage = location.pathname === '/products';
      const params = isProductsPage
        ? new URLSearchParams(location.search)
        : new URLSearchParams();
      const currentSearch = params.get('q') || '';

      if (!trimmedSearch && !isProductsPage) {
        return;
      }

      if (trimmedSearch) {
        params.set('q', trimmedSearch);
      } else {
        params.delete('q');
      }

      if (currentSearch === trimmedSearch && isProductsPage) {
        return;
      }

      const queryString = params.toString();
      navigate(`/products${queryString ? `?${queryString}` : ''}`);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, location.search, navigate, searchInput]);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        !desktopAccountMenuRef.current?.contains(event.target as Node) &&
        !mobileAccountMenuRef.current?.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!utilityMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        !desktopUtilityMenuRef.current?.contains(event.target as Node) &&
        !mobileUtilityMenuRef.current?.contains(event.target as Node)
      ) {
        setUtilityMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [utilityMenuOpen]);

  const handleCategoryHover = async (categoryId: string) => {
    setActiveMenuCategoryId(categoryId);

    if (subcategoryMap[categoryId]) {
      return;
    }

    try {
      const subcategories = await picklistService.getSubcategories(categoryId);
      setSubcategoryMap((current) => ({
        ...current,
        [categoryId]: subcategories,
      }));
    } catch (error) {
      console.error('Error fetching navbar subcategories:', error);
      setSubcategoryMap((current) => ({
        ...current,
        [categoryId]: [],
      }));
    }
  };

  const activeMenuCategory = categories.find(
    (category) => category.id === activeMenuCategoryId,
  );
  const activeSubcategories = activeMenuCategoryId
    ? subcategoryMap[activeMenuCategoryId] || []
    : [];

  const renderSearchControl = (inputId: string, className = 'w-56 xl:w-72') => (
    <div className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-gold/80"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        />
      </svg>
      <input
        id={inputId}
        type="text"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search products"
        className="h-10 w-full rounded-md border border-primary-gold/70 bg-primary-blue/40 pl-10 pr-9 text-sm text-white placeholder:text-primary-gold/70 outline-none transition focus:border-primary-gold focus:ring-2 focus:ring-primary-gold/30"
      />
      {searchInput && (
        <button
          type="button"
          onClick={() => setSearchInput('')}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-primary-gold/80 transition hover:bg-primary-gold/10 hover:text-primary-gold"
          aria-label="Clear search"
          title="Clear search"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );

  const renderNavTooltip = (label: string) => (
    <span className="pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded-md bg-secondary-dark-gray px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {label}
    </span>
  );

  const cartIconLink = (
    <Link
      to="/cart"
      onClick={closeMobileMenu}
      aria-label="Cart"
      title="Cart"
      className={`group relative flex h-9 w-10 items-center justify-center rounded-md transition-colors duration-200 sm:h-10 sm:w-12 ${
        isActive('/cart')
          ? 'bg-primary-gold text-primary-blue'
          : 'border border-primary-gold text-primary-gold hover:bg-primary-gold hover:text-primary-blue'
      }`}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM9 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
        />
      </svg>
      {cartCount > 0 && (
        <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-primary-gold text-primary-blue text-xs font-bold flex items-center justify-center ring-2 ring-primary-blue">
          {cartCount}
        </span>
      )}
      {renderNavTooltip('Cart')}
    </Link>
  );

  const wishlistIconLink = (
    <Link
      to="/wishlist"
      onClick={closeMobileMenu}
      aria-label="Wishlist"
      title="Wishlist"
      className={`group relative flex h-9 w-10 items-center justify-center rounded-md transition-colors duration-200 sm:h-10 sm:w-12 ${
        isActive('/wishlist')
          ? 'bg-primary-gold text-primary-blue'
          : 'border border-primary-gold text-primary-gold hover:bg-primary-gold hover:text-primary-blue'
      }`}
    >
      <svg
        className="h-5 w-5"
        fill={isActive('/wishlist') ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733C11.285 4.876 9.623 3.75 7.688 3.75 5.098 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
      {wishlistCount > 0 && (
        <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-primary-gold text-primary-blue text-xs font-bold flex items-center justify-center ring-2 ring-primary-blue">
          {wishlistCount}
        </span>
      )}
      {renderNavTooltip('Wishlist')}
    </Link>
  );

  const renderMemberMenu = (menuRef: React.RefObject<HTMLDivElement | null>) => (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setAccountMenuOpen((current) => !current)}
        className={`group relative flex h-9 max-w-32 items-center gap-2 rounded-md border border-primary-gold px-2 text-xs font-semibold transition-colors duration-200 sm:h-10 sm:max-w-48 sm:px-3 sm:text-sm ${
          accountMenuOpen
            ? 'bg-primary-gold text-primary-blue'
            : 'text-primary-gold hover:bg-primary-gold hover:text-primary-blue'
        }`}
        aria-label="Open member menu"
        aria-expanded={accountMenuOpen}
        title={accountName}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 0 1 16.5 0"
          />
        </svg>
        <span className="hidden max-w-32 truncate lg:inline">
          {accountName}
        </span>
        {renderNavTooltip(accountName)}
      </button>

      {accountMenuOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-max min-w-0 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-secondary-light-gray bg-white shadow-2xl">
          <div className="p-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="block w-auto whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={handleMenuLinkClick}
                className="block rounded-md px-3 py-2 text-sm font-semibold text-primary-blue hover:bg-primary-gold/20"
              >
                Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderUtilityMenu = (menuRef: React.RefObject<HTMLDivElement | null>) => (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setUtilityMenuOpen((current) => !current)}
        className={`group relative flex h-9 w-10 items-center justify-center rounded-md border border-primary-gold transition-colors duration-200 sm:h-10 sm:w-12 ${
          utilityMenuOpen
            ? 'bg-primary-gold text-primary-blue'
            : 'text-primary-gold hover:bg-primary-gold hover:text-primary-blue'
        }`}
        aria-label="Open menu"
        aria-expanded={utilityMenuOpen}
        title="Menu"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 7h16M4 12h16M4 17h16"
          />
        </svg>
        {renderNavTooltip('Menu')}
      </button>

      {utilityMenuOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-lg border border-secondary-light-gray bg-white shadow-2xl">
          <div className="p-2">
            {isAuthenticated && (
              <div className="rounded-md px-3 py-2 text-sm font-semibold text-primary-blue">
                {accountName}
              </div>
            )}
            <Link
              to="/wishlist"
              onClick={handleMenuLinkClick}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-secondary-dark-gray hover:bg-primary-gold/20 hover:text-primary-blue"
            >
              <span>My Wish List</span>
              {wishlistCount > 0 && (
                <span className="rounded-full bg-primary-gold px-2 py-0.5 text-xs font-bold text-primary-blue">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              onClick={handleMenuLinkClick}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-secondary-dark-gray hover:bg-primary-gold/20 hover:text-primary-blue"
            >
              <span>My Cart Items</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-primary-gold px-2 py-0.5 text-xs font-bold text-primary-blue">
                  {cartCount}
                </span>
              )}
            </Link>
            <div className="my-2 h-px bg-secondary-light-gray" />
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold text-secondary-medium-gray"
              title="Orders page coming soon"
            >
              <span>Orders</span>
              <span className="rounded-full bg-secondary-extra-light-gray px-2 py-0.5 text-xs">
                Soon
              </span>
            </button>
            <Link
              to="/products"
              onClick={handleMenuLinkClick}
              className="block rounded-md px-3 py-2 text-sm font-semibold text-secondary-dark-gray hover:bg-primary-gold/20 hover:text-primary-blue"
            >
              Continue Shopping
            </Link>
            <Link
              to="/shipping"
              onClick={handleMenuLinkClick}
              className="block rounded-md px-3 py-2 text-sm font-semibold text-secondary-dark-gray hover:bg-primary-gold/20 hover:text-primary-blue"
            >
              Shipping & Policies
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <nav className="bg-primary-blue sticky top-0 z-50 shadow-lg">
      <div className="w-full px-2 sm:px-6 lg:px-10">
        <div className="relative flex h-16 items-center gap-2 sm:h-20 sm:gap-6">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center" onClick={closeMobileMenu}>
            <img 
              src={logo} 
              alt="Nivaana Logo" 
              className="h-9 w-auto transition-opacity duration-200 hover:opacity-90 sm:h-14"
            />
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="absolute left-[37%] hidden -translate-x-full lg:block">
            {renderSearchControl('navbar-product-search', 'w-52 xl:w-56')}
          </div>

          <div className="absolute left-1/2 hidden -translate-x-1/2 md:flex items-center gap-8">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive('/') 
                  ? 'text-primary-gold bg-primary-gold/10' 
                  : 'text-primary-gold hover:text-primary-gold/80 hover:bg-primary-gold/5'
              }`}
            >
              Home
            </Link>
            <div
              className="relative"
              onMouseEnter={() => {
                setProductMenuOpen(true);
                if (categories[0]) {
                  void handleCategoryHover(activeMenuCategoryId || categories[0].id);
                }
              }}
              onMouseLeave={closeProductMenu}
            >
              <Link
                to="/products"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive('/products') 
                    ? 'text-primary-gold bg-primary-gold/10' 
                    : 'text-primary-gold hover:text-primary-gold/80 hover:bg-primary-gold/5'
                }`}
              >
                Products
              </Link>

              {productMenuOpen && (
                <div className="absolute left-1/2 top-full z-50 w-[560px] -translate-x-1/2 pt-3">
                  <div className="grid grid-cols-[220px_1fr] overflow-hidden rounded-lg border border-secondary-light-gray bg-white shadow-2xl">
                    <div className="border-r border-secondary-light-gray bg-secondary-extra-light-gray p-3">
                      <Link
                        to="/products"
                        onClick={closeProductMenu}
                        className="block rounded-md px-3 py-2 text-sm font-semibold text-primary-blue hover:bg-primary-gold/20"
                      >
                        All Products
                      </Link>
                      <Link
                        to="/products?deals=true"
                        onClick={closeProductMenu}
                        className="block rounded-md px-3 py-2 text-sm font-semibold text-primary-blue hover:bg-primary-gold/20"
                      >
                        All Deals
                      </Link>
                      <div className="my-2 h-px bg-secondary-light-gray" />
                      {categories.map((category) => (
                        <Link
                          key={category.id}
                          to={`/products?category=${encodeURIComponent(category.id)}`}
                          onMouseEnter={() => void handleCategoryHover(category.id)}
                          onFocus={() => void handleCategoryHover(category.id)}
                          onClick={closeProductMenu}
                          className={`block rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                            activeMenuCategoryId === category.id
                              ? 'bg-primary-blue text-primary-gold'
                              : 'text-primary-blue hover:bg-primary-gold/20'
                          }`}
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>

                    <div className="p-4">
                      <div className="mb-3">
                        <p className="text-xs font-semibold uppercase text-secondary-medium-gray">
                          Subcategories
                        </p>
                        <h3 className="text-base font-semibold text-secondary-dark-gray">
                          {activeMenuCategory?.name || 'Products'}
                        </h3>
                      </div>

                      {activeMenuCategoryId && (
                        <Link
                          to={`/products?category=${encodeURIComponent(activeMenuCategoryId)}`}
                          onClick={closeProductMenu}
                          className="mb-2 block rounded-md px-3 py-2 text-sm font-semibold text-primary-blue hover:bg-primary-gold/20"
                        >
                          All {activeMenuCategory?.name || 'Products'}
                        </Link>
                      )}

                      <div className="grid grid-cols-1 gap-1">
                        {activeSubcategories.length > 0 ? (
                          activeSubcategories.map((subcategory) => (
                            <Link
                              key={subcategory.id}
                              to={`/products?category=${encodeURIComponent(activeMenuCategoryId || '')}&subcategory=${encodeURIComponent(subcategory.id)}`}
                              onClick={closeProductMenu}
                              className="rounded-md px-3 py-2 text-sm font-medium text-secondary-dark-gray hover:bg-primary-gold/20 hover:text-primary-blue"
                            >
                              {subcategory.name}
                            </Link>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-sm text-secondary-medium-gray">
                            Hover a category to view subcategories.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Link
              to="/about"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive('/about') 
                  ? 'text-primary-gold bg-primary-gold/10' 
                  : 'text-primary-gold hover:text-primary-gold/80 hover:bg-primary-gold/5'
              }`}
            >
              About Us
            </Link>
          </div>

          {/* Auth - Desktop */}
          <div className="ml-auto hidden md:flex items-center justify-end gap-3">
            {isAuthenticated ? (
              renderMemberMenu(desktopAccountMenuRef)
            ) : (
              <Link
                to="/login"
                className={`h-10 px-5 rounded-md text-sm font-semibold flex items-center transition-colors duration-200 ${
                  isActive('/login') || isActive('/login/otp')
                    ? 'bg-primary-gold text-primary-blue'
                    : 'border border-primary-gold text-primary-gold hover:bg-primary-gold hover:text-primary-blue'
                }`}
              >
                Login
              </Link>
            )}
            {wishlistIconLink}
            {cartIconLink}
            {renderUtilityMenu(desktopUtilityMenuRef)}
          </div>

          {/* Mobile actions */}
          <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-3 md:hidden">
            {isAuthenticated ? renderMemberMenu(mobileAccountMenuRef) : null}
            {wishlistIconLink}
            {cartIconLink}
            {renderUtilityMenu(mobileUtilityMenuRef)}
            <button 
              onClick={toggleMobileMenu}
              className="flex h-9 w-8 shrink-0 items-center justify-center text-primary-gold transition-colors duration-200 hover:text-primary-gold/80 focus:text-primary-gold/80 focus:outline-none sm:w-9"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                // Close icon (X)
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Hamburger icon
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation - Only visible when menu is open */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-primary-blue/95 backdrop-blur-sm">
              <div className="px-3 py-2">
                {renderSearchControl('mobile-product-search', 'w-full')}
              </div>
              <Link
                to="/"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActive('/') 
                    ? 'text-primary-gold bg-primary-gold/10' 
                    : 'text-primary-gold hover:text-primary-gold/80 hover:bg-primary-gold/5'
                }`}
              >
                Home
              </Link>
              <div>
                <div
                  className={`flex items-center rounded-md transition-colors duration-200 ${
                    isActive('/products')
                      ? 'bg-primary-gold/10'
                      : 'hover:bg-primary-gold/5'
                  }`}
                >
                  <Link
                    to="/products"
                    onClick={closeMobileMenu}
                    className="min-w-0 flex-1 px-3 py-2 text-base font-medium text-primary-gold hover:text-primary-gold/80"
                  >
                    Products
                  </Link>
                  <button
                    type="button"
                    onClick={toggleMobileProductMenu}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-primary-gold transition-colors duration-200 hover:bg-primary-gold/10 hover:text-primary-gold/80"
                    aria-label="Show product categories"
                    aria-expanded={mobileProductMenuOpen}
                    title="Product categories"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${
                        mobileProductMenuOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m6 9 6 6 6-6"
                      />
                    </svg>
                  </button>
                </div>

                {mobileProductMenuOpen && (
                  <div className="mx-3 mt-1 max-h-80 overflow-y-auto rounded-md border border-primary-gold/25 bg-primary-blue/50 p-2">
                    <Link
                      to="/products"
                      onClick={closeMobileMenu}
                      className="block rounded-md px-3 py-2 text-sm font-semibold text-primary-gold hover:bg-primary-gold/10"
                    >
                      All Products
                    </Link>
                    <Link
                      to="/products?deals=true"
                      onClick={closeMobileMenu}
                      className="block rounded-md px-3 py-2 text-sm font-semibold text-primary-gold hover:bg-primary-gold/10"
                    >
                      All Deals
                    </Link>
                    <div className="my-2 h-px bg-primary-gold/20" />

                    {categories.map((category) => {
                      const isActiveCategory = activeMenuCategoryId === category.id;
                      const categorySubcategories = subcategoryMap[category.id] || [];

                      return (
                        <div key={category.id}>
                          <button
                            type="button"
                            onClick={() => void handleCategoryHover(category.id)}
                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
                              isActiveCategory
                                ? 'bg-primary-gold text-primary-blue'
                                : 'text-primary-gold hover:bg-primary-gold/10'
                            }`}
                            aria-expanded={isActiveCategory}
                          >
                            <span>{category.name}</span>
                            <svg
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isActiveCategory ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m6 9 6 6 6-6"
                              />
                            </svg>
                          </button>

                          {isActiveCategory && (
                            <div className="mb-1 ml-3 mt-1 border-l border-primary-gold/25 pl-2">
                              <Link
                                to={`/products?category=${encodeURIComponent(category.id)}`}
                                onClick={closeMobileMenu}
                                className="block rounded-md px-3 py-2 text-sm font-medium text-primary-gold/90 hover:bg-primary-gold/10 hover:text-primary-gold"
                              >
                                All {category.name}
                              </Link>
                              {categorySubcategories.map((subcategory) => (
                                <Link
                                  key={subcategory.id}
                                  to={`/products?category=${encodeURIComponent(category.id)}&subcategory=${encodeURIComponent(subcategory.id)}`}
                                  onClick={closeMobileMenu}
                                  className="block rounded-md px-3 py-2 text-sm font-medium text-primary-gold/90 hover:bg-primary-gold/10 hover:text-primary-gold"
                                >
                                  {subcategory.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <Link
                to="/about"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActive('/about') 
                    ? 'text-primary-gold bg-primary-gold/10' 
                    : 'text-primary-gold hover:text-primary-gold/80 hover:bg-primary-gold/5'
                }`}
              >
                About Us
              </Link>
              {isAuthenticated ? (
                <>
                  <div className="px-3 pt-2 text-sm font-medium text-primary-gold/70">
                    {user?.name || `+91 ${user?.phoneNumber}`}
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-primary-gold hover:text-primary-gold/80 hover:bg-primary-gold/5 transition-colors duration-200"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    isActive('/login') || isActive('/login/otp')
                      ? 'text-primary-gold bg-primary-gold/10'
                      : 'text-primary-gold hover:text-primary-gold/80 hover:bg-primary-gold/5'
                  }`}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

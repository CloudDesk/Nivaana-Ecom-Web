import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/Logo.png';
import { useAuth } from '../contexts/authContextCore';
import { useCart } from '../contexts/cartContextCore';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { getCartCount } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartCount = getCartCount();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMobileMenu();
  };

  const cartIconLink = (
    <Link
      to="/cart"
      onClick={closeMobileMenu}
      aria-label="Cart"
      title="Cart"
      className={`relative h-12 w-12 rounded-md flex items-center justify-center transition-colors duration-200 ${
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
    </Link>
  );

  return (
    <nav className="bg-primary-blue sticky top-0 z-50 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-4 h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-self-start" onClick={closeMobileMenu}>
            <img 
              src={logo} 
              alt="Nivaana Logo" 
              className="h-14 w-auto hover:opacity-90 transition-opacity duration-200 "
            />
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex space-x-8">
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
          <div className="hidden md:flex items-center justify-end gap-3">
            {cartIconLink}
            {isAuthenticated ? (
              <>
                <span className="text-sm font-medium text-primary-gold/80 max-w-40 truncate">
                  {user?.name || `+91 ${user?.phoneNumber}`}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-12 px-5 rounded-md text-sm font-semibold border border-primary-gold text-primary-gold hover:bg-primary-gold hover:text-primary-blue transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className={`h-12 px-5 rounded-md text-sm font-semibold flex items-center transition-colors duration-200 ${
                  isActive('/login') || isActive('/login/otp')
                    ? 'bg-primary-gold text-primary-blue'
                    : 'border border-primary-gold text-primary-gold hover:bg-primary-gold hover:text-primary-blue'
                }`}
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center justify-end gap-3">
            {cartIconLink}
            <button 
              onClick={toggleMobileMenu}
              className="text-primary-gold hover:text-primary-gold/80 focus:outline-none focus:text-primary-gold/80 transition-colors duration-200"
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
              <Link
                to="/products"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActive('/products') 
                    ? 'text-primary-gold bg-primary-gold/10' 
                    : 'text-primary-gold hover:text-primary-gold/80 hover:bg-primary-gold/5'
                }`}
              >
                Products
              </Link>
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

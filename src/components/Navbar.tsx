import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/Logo.png';

const Navbar: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-primary-blue sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center" onClick={closeMobileMenu}>
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

          {/* Mobile menu button */}
          <div className="md:hidden">
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
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
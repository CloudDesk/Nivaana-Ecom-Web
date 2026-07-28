import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { brandLogoGoogleYellow as logoIcon } from '../assets/config.js';

const quickLinks = [
  { label: 'Home', to: '/' },
  { label: 'Products', to: '/products' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact Us', to: '/about#contact' },
];

const policyLinks = [
  { label: 'Terms and Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Shipping Policy', to: '/shipping' },
  { label: 'Cancellation and Refund Policy', to: '/cancellation' },
  { label: 'Return and Refund Policy', to: '/returns' },
  { label: 'Replacement and Exchange', to: '/replacement-exchange' },
  { label: 'Delete My Account', to: '/delete-my-account' },
];

const Footer: React.FC = () => {
  const location = useLocation();

  const handleHomeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === "/" && !location.search && !location.hash) {
      event.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };

  return (
    <footer id="contact" className="relative isolate overflow-hidden bg-[#33405d] text-[#fbbc05]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#26324a_0%,#3f4d6c_52%,#53617f_100%)]" aria-hidden="true" />
      <div className="absolute -left-20 -top-28 h-64 w-64 rounded-full border border-[#fbbc05]/18" aria-hidden="true" />
      <div className="absolute -bottom-28 right-[-6rem] h-80 w-80 rounded-full border border-[#fbbc05]/18" aria-hidden="true" />
      <div className="absolute right-1/3 top-6 h-48 w-48 rounded-full bg-[#fbbc05]/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 md:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" onClick={handleHomeClick} className="navbar-brand-logo footer-brand-logo mb-3" aria-label="Nivaana home">
              <img src={logoIcon} alt="" className="navbar-brand-icon footer-brand-icon" loading="eager" />
            </Link>
            <div className="max-w-md space-y-1 text-sm leading-6 text-[#ffe0a0]">
              <p className="font-semibold text-[#fbbc05]">VIP98 VENTURES LLP</p>
              <p>516D, Lakshmi Sundaram Nagar</p>
              <p>Narasingapuram Road, Pandiyanallore Post</p>
              <p>Sholinghur - 631102, Tamil Nadu</p>
              <p>Phone: +91 8925662553</p>
              <p>Email: support@nivaana.com</p>
            </div>
            {/* Social links hidden until real profile URLs are available for payment approval review. */}
          </div>

          {/* Quick Links */}
          <FooterLinkGroup title="Quick Links" links={quickLinks} onHomeClick={handleHomeClick} />

          {/* Policies */}
          <FooterLinkGroup title="Policies" links={policyLinks} />
        </div>

        {/* Bottom Bar */}
        <div className="mt-5 border-t border-[#fbbc05]/20 pt-4 text-center text-sm text-[#ffe0a0] md:mt-6 md:pt-5">
          <p>&copy; {new Date().getFullYear()} Nivaana. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

function FooterLinkGroup({
  title,
  links,
  onHomeClick,
}: {
  title: string;
  links: { label: string; to: string }[];
  onHomeClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const list = (
    <ul className="space-y-2 pb-3 pt-1 md:space-y-1.5 md:pb-0 md:pt-0">
      {links.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            onClick={link.to === "/" ? onHomeClick : undefined}
            className="text-sm leading-5 text-[#ffe0a0] transition-colors duration-200 hover:text-[#fbbc05]"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <details className="group border-t border-[#fbbc05]/20 py-2 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-[#fbbc05]">
          {title}
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        {list}
      </details>

      <div className="hidden md:block">
        <h4 className="mb-3 text-base font-semibold text-[#fbbc05] md:text-lg">{title}</h4>
        {list}
      </div>
    </div>
  );
}

export default Footer;

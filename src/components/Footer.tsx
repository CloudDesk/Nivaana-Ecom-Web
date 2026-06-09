import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import logo from '../assets/Logo.png';

const quickLinks = [
  { label: 'Home', to: '/' },
  { label: 'Products', to: '/products' },
  { label: 'About Us', to: '/about' },
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
  return (
    <footer id="contact" className="relative isolate overflow-hidden bg-[#33405d] text-[#f0c353]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#26324a_0%,#3f4d6c_52%,#53617f_100%)]" aria-hidden="true" />
      <div className="absolute -left-20 -top-28 h-64 w-64 rounded-full border border-[#f0c353]/18" aria-hidden="true" />
      <div className="absolute -bottom-28 right-[-6rem] h-80 w-80 rounded-full border border-[#f0c353]/18" aria-hidden="true" />
      <div className="absolute right-1/3 top-6 h-48 w-48 rounded-full bg-[#f0c353]/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 md:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-3 flex items-center">
              <img 
                src={logo} 
                alt="Nivaana Logo" 
                className="mr-4 h-14 w-auto md:h-16"
              />
            </div>
            <div className="mb-4 max-w-md">
              <h2 className="text-base font-bold text-[#f0c353] md:text-lg">Follow us On</h2>
            </div>
            <div className="flex space-x-4">
              <a href="#" aria-label="Follow Nivaana on Instagram" className="text-[#ffe0a0] transition-colors duration-200 hover:text-[#f0c353]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="#" aria-label="Follow Nivaana on Facebook" className="text-[#ffe0a0] transition-colors duration-200 hover:text-[#f0c353]">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.77l-.44 2.91h-2.33V22C18.34 21.24 22 17.08 22 12.06z" />
                </svg>
              </a>
              <a href="#" aria-label="Follow Nivaana on X" className="text-[#ffe0a0] transition-colors duration-200 hover:text-[#f0c353]">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.9 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.97 6.82H2.31l7.74-8.84L1.89 2.25h6.83l4.71 6.23 5.47-6.23Zm-1.16 17.52h1.83L7.72 4.13H5.75l11.99 15.64Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <FooterLinkGroup title="Quick Links" links={quickLinks} />

          {/* Policies */}
          <FooterLinkGroup title="Policies" links={policyLinks} />
        </div>

        {/* Bottom Bar */}
        <div className="mt-5 border-t border-[#f0c353]/20 pt-4 text-center text-sm text-[#ffe0a0] md:mt-6 md:pt-5">
          <p>&copy; 2024 Nivaana. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

function FooterLinkGroup({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  const list = (
    <ul className="space-y-2 pb-3 pt-1 md:space-y-1.5 md:pb-0 md:pt-0">
      {links.map((link) => (
        <li key={link.to}>
          <Link to={link.to} className="text-sm leading-5 text-[#ffe0a0] transition-colors duration-200 hover:text-[#f0c353]">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <details className="group border-t border-[#f0c353]/20 py-2 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-[#f0c353]">
          {title}
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        {list}
      </details>

      <div className="hidden md:block">
        <h4 className="mb-3 text-base font-semibold text-[#f0c353] md:text-lg">{title}</h4>
        {list}
      </div>
    </div>
  );
}

export default Footer;

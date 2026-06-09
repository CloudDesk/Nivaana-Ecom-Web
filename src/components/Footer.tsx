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
                className="mr-4 h-9 w-auto md:h-10"
              />
            </div>
            <div className="mb-4 max-w-md">
              <h2 className="text-base font-bold text-[#f0c353] md:text-lg">Join Nivaana</h2>
              <p className="mt-1.5 text-sm leading-5 text-[#ffe0a0]">
                Get product drops, festive offers, and fragrance notes.
              </p>
              <form className="mt-3 flex items-stretch">
                <input
                  type="email"
                  aria-label="Email address"
                  placeholder="Enter your email"
                  className="h-10 min-w-0 flex-1 rounded-l-[var(--radius-sm)] border border-r-0 border-[#ffe0a0]/70 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-[#ffe0a0]/70 focus:border-[#f0c353]"
                />
                <button
                  type="submit"
                  className="h-10 min-w-28 rounded-r-[var(--radius-sm)] border border-[#f0c353] bg-[#f0c353] px-4 text-sm font-bold text-[#26324a] transition hover:bg-[#ffd66b]"
                >
                  Subscribe
                </button>
              </form>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-[#ffe0a0] transition-colors duration-200 hover:text-[#f0c353]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-[#ffe0a0] transition-colors duration-200 hover:text-[#f0c353]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="text-[#ffe0a0] transition-colors duration-200 hover:text-[#f0c353]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
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

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/Logo.png';
import { useAuth } from '../contexts/authContextCore';

const LOGIN_PROMPT_SESSION_KEY = 'NIVAANA_LOGIN_PROMPT_HANDLED';

const getHasHandledPrompt = () => {
  return sessionStorage.getItem(LOGIN_PROMPT_SESSION_KEY) === 'true';
};

const StartupLoginModal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [initialPath] = useState(() => window.location.pathname);
  const [hasHandledPrompt, setHasHandledPrompt] = useState(getHasHandledPrompt);

  const isLoginPage = location.pathname === '/login' || location.pathname === '/login/otp';
  const isInitialPage = location.pathname === initialPath;
  const shouldShow =
    !isLoading && !isAuthenticated && !hasHandledPrompt && !isLoginPage && isInitialPage;

  useEffect(() => {
    if (!hasHandledPrompt && !isInitialPage) {
      sessionStorage.setItem(LOGIN_PROMPT_SESSION_KEY, 'true');
      setHasHandledPrompt(true);
    }
  }, [hasHandledPrompt, isInitialPage]);

  if (!shouldShow) {
    return null;
  }

  const closeModal = () => {
    sessionStorage.setItem(LOGIN_PROMPT_SESSION_KEY, 'true');
    setHasHandledPrompt(true);
  };

  const handleLogin = () => {
    closeModal();
    navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-login-title"
    >
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-secondary-medium-gray transition-colors duration-200 hover:bg-secondary-extra-light-gray hover:text-secondary-dark-gray"
          aria-label="Close login prompt"
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            &times;
          </span>
        </button>

        <div className="mb-6 flex justify-center">
          <img src={logo} alt="Nivaana" className="h-16 w-auto" />
        </div>

        <div className="mb-8 text-center">
          <h2
            id="startup-login-title"
            className="mb-3 text-2xl font-bold text-secondary-dark-gray"
          >
            Login to Nivaana
          </h2>
          <p className="text-sm leading-6 text-secondary-medium-gray">
            Sign in with your mobile number for a faster checkout, or continue browsing as a guest.
          </p>
        </div>

        <div className="space-y-3">
          <button type="button" onClick={handleLogin} className="w-full btn-primary">
            Login
          </button>
          <button
            type="button"
            onClick={closeModal}
            className="w-full rounded-lg border-2 border-primary-gold px-6 py-3 font-semibold text-primary-blue transition-colors duration-200 hover:bg-primary-gold/10"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartupLoginModal;

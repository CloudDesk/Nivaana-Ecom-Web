import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/authContextCore';
import { authStorage } from '../services/authStorage';
import { ApiRequestError } from '../services/apiService';

const getSafeRedirect = (redirect: string | null) => {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/';
  }

  return redirect;
};

const getRequestOtpErrorMessage = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    if (error.statusCode === 400) {
      return 'Invalid mobile number. Please check and try again.';
    }

    if (error.statusCode === 429) {
      return 'Too many OTP requests. Please wait and try again.';
    }

    return error.message || 'Failed to send OTP. Please try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Network error. Please check your connection.';
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, requestOtp } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = useMemo(
    () => getSafeRedirect(searchParams.get('redirect')),
    [searchParams],
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const cleanedMobile = mobileNumber.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await requestOtp(cleanedMobile);
      authStorage.setPendingLogin({
        mobileNumber: cleanedMobile,
        isNewUser: response.data.isNewUser,
        expiresIn: response.data.expiresIn,
        canResendAfter: response.data.canResendAfter,
        redirectPath,
      });

      navigate('/login/otp');
    } catch (requestError) {
      setError(getRequestOtpErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-12">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-secondary-dark-gray mb-2">
              Login with mobile
            </h1>
            <p className="text-secondary-medium-gray">
              Enter your Indian mobile number and we will send you a 4-digit OTP.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="mobileNumber"
                className="block text-sm font-medium text-secondary-dark-gray mb-2"
              >
                Mobile Number
              </label>
              <div className="flex rounded-lg border border-secondary-light-gray focus-within:ring-2 focus-within:ring-primary-gold focus-within:border-transparent">
                <span className="inline-flex items-center px-4 text-secondary-medium-gray border-r border-secondary-light-gray">
                  +91
                </span>
                <input
                  id="mobileNumber"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={mobileNumber}
                  onChange={(event) =>
                    setMobileNumber(
                      event.target.value.replace(/\D/g, '').slice(0, 10),
                    )
                  }
                  placeholder="9876543210"
                  className="w-full px-4 py-3 rounded-r-lg focus:outline-none"
                  disabled={isSubmitting}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || mobileNumber.length !== 10}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm font-medium text-primary-blue hover:text-primary-gold transition-colors duration-200"
            >
              Continue browsing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

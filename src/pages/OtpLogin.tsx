import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContextCore';
import { authStorage, type PendingLoginState } from '../services/authStorage';
import { ApiRequestError } from '../services/apiService';

const formatSeconds = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getOtpErrorMessage = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    if (error.statusCode === 400) {
      return 'Invalid OTP. Please check and try again.';
    }

    if (error.statusCode === 401) {
      return 'Invalid OTP. Please try again.';
    }

    if (error.statusCode === 410) {
      return 'OTP expired. Please request a new one.';
    }

    if (error.statusCode === 429) {
      return 'Too many OTP requests. Please wait and try again.';
    }

    return error.message || 'Failed to verify OTP. Please try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Network error. Please check your connection.';
};

const OtpLogin: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, requestOtp, verifyOtp } = useAuth();
  const [pendingLogin, setPendingLogin] = useState<PendingLoginState | null>(
    () => authStorage.getPendingLogin(),
  );
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(
    pendingLogin?.canResendAfter ?? 60,
  );
  const [expirySeconds, setExpirySeconds] = useState(
    pendingLogin?.expiresIn ?? 300,
  );

  useEffect(() => {
    if (!pendingLogin) {
      navigate('/login', { replace: true });
    }
  }, [navigate, pendingLogin]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(pendingLogin?.redirectPath || '/', { replace: true });
    }
  }, [isAuthenticated, navigate, pendingLogin?.redirectPath]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
      setExpirySeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!pendingLogin) {
      return;
    }

    setError('');
    setSuccess('');

    if (expirySeconds === 0) {
      setError('OTP expired. Please request a new one.');
      return;
    }

    if (!/^\d{4}$/.test(otp)) {
      setError('Please enter a valid 4-digit OTP');
      return;
    }

    setIsVerifying(true);

    try {
      await verifyOtp(pendingLogin.mobileNumber, otp);
      authStorage.clearPendingLogin();
      navigate(pendingLogin.redirectPath || '/', { replace: true });
    } catch (verifyError) {
      setError(getOtpErrorMessage(verifyError));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingLogin || resendCooldown > 0) {
      return;
    }

    setError('');
    setSuccess('');
    setIsResending(true);

    try {
      const response = await requestOtp(pendingLogin.mobileNumber);
      const nextPendingLogin = {
        ...pendingLogin,
        isNewUser: response.data.isNewUser,
        expiresIn: response.data.expiresIn,
        canResendAfter: response.data.canResendAfter,
      };

      authStorage.setPendingLogin(nextPendingLogin);
      setPendingLogin(nextPendingLogin);
      setOtp('');
      setResendCooldown(response.data.canResendAfter ?? 60);
      setExpirySeconds(response.data.expiresIn ?? 300);
      setSuccess('OTP sent successfully');
    } catch (resendError) {
      setError(getOtpErrorMessage(resendError));
    } finally {
      setIsResending(false);
    }
  };

  if (!pendingLogin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-12">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-secondary-dark-gray mb-2">
              Verify OTP
            </h1>
            <p className="text-secondary-medium-gray">
              Enter the 4-digit OTP sent to +91 {pendingLogin.mobileNumber}.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-secondary-dark-gray mb-2"
              >
                OTP
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="1234"
                className="w-full px-4 py-3 border border-secondary-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-gold focus:border-transparent text-center text-2xl tracking-widest"
                disabled={isVerifying}
                maxLength={4}
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm text-secondary-medium-gray">
              <span>Expires in {formatSeconds(expirySeconds)}</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isResending}
                className="font-medium text-primary-blue hover:text-primary-gold transition-colors duration-200 disabled:text-secondary-medium-gray disabled:cursor-not-allowed"
              >
                {isResending
                  ? 'Resending...'
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend OTP'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isVerifying || otp.length !== 4}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              to={`/login${
                pendingLogin.redirectPath && pendingLogin.redirectPath !== '/'
                  ? `?redirect=${encodeURIComponent(pendingLogin.redirectPath)}`
                  : ''
              }`}
              className="font-medium text-primary-blue hover:text-primary-gold transition-colors duration-200"
            >
              Change number
            </Link>
            <Link
              to="/"
              className="font-medium text-primary-blue hover:text-primary-gold transition-colors duration-200"
            >
              Continue browsing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpLogin;

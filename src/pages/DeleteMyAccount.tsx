import React, { useState } from 'react';
import { authService } from '../services/authService';
import type { User } from '../types';

type Step = 1 | 2 | 3;

const DeleteMyAccount: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDeleted, setIsDeleted] = useState<boolean>(false);

  // Validate phone number (10 digits)
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // Validate email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.requestOTP(parseInt(phoneNumber));
      if (response.success) {
        setSuccess(response.data.message || 'OTP sent successfully to your mobile number');
        setCurrentStep(2);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 4) {
      setError('Please enter a valid 4-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOTP(parseInt(phoneNumber), parseInt(otp));
      if (response.success && response.data.user) {
        setUser(response.data.user);
        setSuccess('OTP verified successfully');
        setCurrentStep(3);
        // Pre-fill email if user has one
        if (response.data.user.useremail) {
          setEmail(response.data.user.useremail);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 3: Delete Account
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('User information not found. Please start again.');
      return;
    }

    // If user doesn't have email, require email input
    if (!user.useremail && !email) {
      setError('Please provide your email address');
      return;
    }

    // Validate email if provided by user
    if (!user.useremail && email && !validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const emailToUse = user.useremail || email;
      const response = await authService.deleteAccount(user.id, emailToUse);
      if (response.success) {
        setSuccess('Your account has been successfully deleted. We\'re sorry to see you go!');
        setIsDeleted(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setCurrentStep(1);
    setPhoneNumber('');
    setOtp('');
    setEmail('');
    setUser(null);
    setError('');
    setSuccess('');
    setIsDeleted(false);
  };

  // Render success message after deletion
  if (isDeleted) {
    return (
      <div className="min-h-screen bg-secondary-extra-light-gray py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-secondary-dark-gray mb-4">Account Deleted Successfully</h2>
              <p className="text-secondary-medium-gray mb-8">{success}</p>
              <a
                href="/"
                className="btn-primary inline-block"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark-gray mb-6 text-center">
            Delete My Account
          </h1>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                        currentStep >= step
                          ? 'bg-primary-gold text-primary-blue'
                          : 'bg-secondary-light-gray text-secondary-medium-gray'
                      }`}
                    >
                      {step}
                    </div>
                    <div className="text-xs md:text-sm mt-2 text-center font-medium text-secondary-medium-gray">
                      {step === 1 && 'Phone Number'}
                      {step === 2 && 'Verify OTP'}
                      {step === 3 && 'Confirm'}
                    </div>
                  </div>
                  {step < 3 && (
                    <div
                      className={`h-1 flex-1 mx-2 transition-all ${
                        currentStep > step ? 'bg-primary-gold' : 'bg-secondary-light-gray'
                      }`}
                    ></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && !isDeleted && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Step 1: Phone Number */}
          {currentStep === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-primary-blue mb-4">
                  Enter Your Mobile Number
                </h2>
                <p className="text-secondary-medium-gray mb-6">
                  We'll send you an OTP to verify your identity before proceeding with account deletion.
                </p>
                <label htmlFor="phone" className="block text-sm font-medium text-secondary-dark-gray mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full px-4 py-3 border border-secondary-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-gold focus:border-transparent"
                  required
                  maxLength={10}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {currentStep === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-primary-blue mb-4">
                  Verify OTP
                </h2>
                <p className="text-secondary-medium-gray mb-6">
                  Enter the 4-digit OTP sent to +91 {phoneNumber}
                </p>
                <label htmlFor="otp" className="block text-sm font-medium text-secondary-dark-gray mb-2">
                  OTP
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-digit OTP"
                  className="w-full px-4 py-3 border border-secondary-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-gold focus:border-transparent text-center text-2xl tracking-widest"
                  required
                  maxLength={4}
                  disabled={loading}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 btn-secondary"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 4}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Confirm Deletion */}
          {currentStep === 3 && user && (
            <form onSubmit={handleDeleteAccount} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-primary-blue mb-4">
                  Confirm Account Deletion
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-600 font-semibold mb-2">⚠️ Warning: This action is irreversible!</p>
                  <p className="text-red-600 text-sm">
                    Deleting your account will permanently remove all your data, including order history, saved addresses, and preferences.
                  </p>
                </div>

                <div className="bg-secondary-extra-light-gray rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-secondary-dark-gray mb-2">Account Details</h3>
                  <p className="text-sm text-secondary-medium-gray">
                    <strong>Name:</strong> {user.firstname} {user.lastname}
                  </p>
                  <p className="text-sm text-secondary-medium-gray">
                    <strong>Mobile:</strong> +91 {user.usermobilenumber}
                  </p>
                  {user.useremail && (
                    <p className="text-sm text-secondary-medium-gray">
                      <strong>Email:</strong> {user.useremail}
                    </p>
                  )}
                </div>

                {/* Email input if user doesn't have email */}
                {!user.useremail && (
                  <div className="mb-6">
                    <label htmlFor="email" className="block text-sm font-medium text-secondary-dark-gray mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-4 py-3 border border-secondary-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-gold focus:border-transparent"
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-secondary-medium-gray mt-1">
                      We need your email to send you a confirmation of account deletion.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete My Account'}
                </button>
              </div>
            </form>
          )}

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-secondary-light-gray">
            <p className="text-sm text-secondary-medium-gray text-center">
              Need help? Contact us at{' '}
              <a href="mailto:support@nivaana.com" className="text-primary-gold hover:underline">
                support@nivaana.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteMyAccount;


import { useState, useEffect } from 'react';
import { ArrowRight, MailCheck, RefreshCw } from 'lucide-react';
import { apiUrl } from '../lib/api';

export default function EmailVerificationPage({ email, setCurrentPage }) {
  const [code, setCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);

  // Manage the 60-second countdown timer interval
  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleVerify = async (event) => {
    event.preventDefault();
    
    if (!email) {
      setStatusMessage('No email was provided for verification.');
      return;
    }

    if (code.trim().length !== 6) {
      setStatusMessage('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    setStatusMessage('');

    try {
      const response = await fetch(apiUrl('/api/auth/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatusMessage('Email verified successfully! Redirecting to login...');
        setTimeout(() => {
          setCurrentPage('login');
        }, 2000);
      } else {
        setStatusMessage(data.message || 'Verification failed.');
      }
    } catch {
      setStatusMessage('Unable to verify the code right now.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendSeconds > 0 || isResending || !email) return;

    setIsResending(true);
    setStatusMessage('');

    try {
      const response = await fetch(apiUrl('/api/auth/resend-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendSeconds(60);
        setStatusMessage('A fresh verification code has been dispatched to your email inbox.');
      } else {
        setStatusMessage(data.message || 'Unable to resend verification code.');
      }
    } catch {
      setStatusMessage('Unable to reach the server to resend the code.');
    } finally {
      setIsResending(false);
    }
  };

  const isSuccess = statusMessage.toLowerCase().includes('success') || statusMessage.toLowerCase().includes('dispatched');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(94,53,177,0.12),_transparent_35%),linear-gradient(135deg,_#f8f7ff_0%,_#ffffff_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-gray-100 bg-white p-8 shadow-[0_20px_70px_rgba(94,53,177,0.16)] sm:p-10 lg:p-12">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#5e35b1]/10 text-[#5e35b1]">
              <MailCheck size={28} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#5e35b1]">Verify Email</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-800">Check your inbox</h2>
            <p className="mt-2 text-sm text-gray-500">
              Enter the 6-digit code we sent to <span className="font-semibold text-[#5e35b1]">{email}</span>.
            </p>
          </div>

          {statusMessage && (
            <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${isSuccess ? 'border-green-200 bg-green-50 text-green-600' : 'border-red-200 bg-red-50 text-red-600'}`}>
              {statusMessage}
            </div>
          )}

          <form className="mx-auto max-w-md" onSubmit={handleVerify}>
            <label className="mb-2 block text-sm font-medium text-gray-700">Verification Code</label>
            <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${statusMessage && !isSuccess ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
              <MailCheck size={18} className="mr-3 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5e35b1] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5e35b1]/20 transition hover:bg-[#4a148c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isVerifying ? 'Verifying...' : 'Verify Account'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">Didn’t receive a code?</p>
            <button
              type="button"
              disabled={resendSeconds > 0 || isResending}
              onClick={handleResendCode}
              className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-[#5e35b1]/30 hover:bg-[#f8f7ff] hover:text-[#5e35b1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
              {resendSeconds > 0 ? `Resend Code in ${resendSeconds}s` : 'Resend Verification Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
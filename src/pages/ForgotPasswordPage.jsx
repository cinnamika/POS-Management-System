import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Lock, Mail, Send, ShieldCheck } from 'lucide-react';
import logoSrc from '../assets/OpistockLogo.png';
import { apiUrl } from '../lib/api';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function ForgotPasswordPage({ setCurrentPage }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleSendRecoveryCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (resendSeconds > 0) return;

    if (!isValidEmail(normalizedEmail)) {
      setStatusType('error');
      setStatusMessage('Please enter a valid email address.');
      return;
    }

    setIsSending(true);
    setStatusMessage('');
    setStatusType('');

    try {
      const response = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setRecoverySent(true);
        setResendSeconds(60);
        setStatusType('success');
        // FIX: Removed the raw leak code verification string output entirely
        setStatusMessage(data.message || 'Recovery code sent. Please check your email inbox.');
      } else {
        setStatusType('error');
        setStatusMessage(data.message || 'Unable to send recovery code.');
      }
    } catch {
      setStatusType('error');
      setStatusMessage('Unable to reach the server right now.');
    } finally {
      setIsSending(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!recoverySent) {
      setStatusType('error');
      setStatusMessage('Please send a recovery code first.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setStatusType('error');
      setStatusMessage('Please enter a valid email address.');
      return;
    }

    if (code.length !== 6) {
      setStatusType('error');
      setStatusMessage('Please enter the 6-digit recovery code.');
      return;
    }

    if (password !== confirmPassword) {
      setStatusType('error');
      setStatusMessage('Passwords do not match.');
      return;
    }

    setIsResetting(true);
    setStatusMessage('');
    setStatusType('');

    try {
      const response = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          code,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatusType('success');
        setStatusMessage(data.message || 'Password reset successfully.');
        window.setTimeout(() => setCurrentPage('login'), 700);
      } else {
        setStatusType('error');
        setStatusMessage(data.message || 'Unable to reset password.');
      }
    } catch {
      setStatusType('error');
      setStatusMessage('Unable to reach the server right now.');
    } finally {
      setIsResetting(false);
    }
  };

  const isSuccess = statusType === 'success';
  const recoveryFieldsDisabled = !recoverySent || isResetting;
  const sendButtonLabel = isSending
    ? 'Sending...'
    : resendSeconds > 0
      ? `Resend in ${resendSeconds}s`
      : recoverySent
        ? 'Resend Recovery Code'
        : 'Send Recovery Code';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(94,53,177,0.12),_transparent_35%),linear-gradient(135deg,_#f8f7ff_0%,_#ffffff_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-gray-100 bg-white p-8 shadow-[0_20px_70px_rgba(94,53,177,0.16)] sm:p-10 lg:p-12">
          <button
            type="button"
            onClick={() => setCurrentPage('login')}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-600 transition hover:border-[#5e35b1]/30 hover:bg-[#f8f7ff] hover:text-[#5e35b1]"
          >
            <ArrowLeft size={16} /> Back to Login
          </button>

          <div className="mb-8 text-center">
            <img src={logoSrc} alt="OpiStock" className="mx-auto h-16 w-16 object-contain" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-[#5e35b1]">Account Recovery</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-800">Forgot Password</h2>
            <p className="mt-2 text-sm text-gray-500">Enter your account email to receive a recovery code.</p>
          </div>

          {statusMessage && (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                isSuccess ? 'border-green-200 bg-green-50 text-green-600' : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              {statusMessage}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleResetPassword}>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email Address</label>
              <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition focus-within:border-[#5e35b1] focus-within:bg-white">
                <Mail size={18} className="mr-3 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setRecoverySent(false);
                    setResendSeconds(0);
                    setCode('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  placeholder="Enter your account email"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isSending || resendSeconds > 0}
              onClick={handleSendRecoveryCode}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5e35b1] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5e35b1]/20 transition hover:bg-[#4a148c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sendButtonLabel}
              <Send size={16} />
            </button>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Recovery Code</label>
              <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${recoveryFieldsDisabled ? 'border-gray-200 bg-gray-100 opacity-70' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                <ShieldCheck size={18} className="mr-3 text-gray-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={recoveryFieldsDisabled}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">New Password</label>
                <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${recoveryFieldsDisabled ? 'border-gray-200 bg-gray-100 opacity-70' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                  <Lock size={18} className="mr-3 text-gray-400" />
                  <input
                    type="password"
                    disabled={recoveryFieldsDisabled}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create new password"
                    className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Confirm Password</label>
                <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${recoveryFieldsDisabled ? 'border-gray-200 bg-gray-100 opacity-70' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                  <Lock size={18} className="mr-3 text-gray-400" />
                  <input
                    type="password"
                    disabled={recoveryFieldsDisabled}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={recoveryFieldsDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#5e35b1]/20 bg-white px-4 py-3 text-sm font-semibold text-[#5e35b1] transition hover:border-[#5e35b1]/40 hover:bg-[#f8f7ff] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isResetting ? 'Resetting...' : 'Reset Password'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
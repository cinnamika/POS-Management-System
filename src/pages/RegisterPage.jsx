import { useEffect, useState } from 'react';
import { ArrowRight, Lock, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { apiUrl } from '../lib/api';

const REGISTER_FORM_STORAGE_KEY = 'opi-register-form';

const readPersistedForm = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(REGISTER_FORM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writePersistedForm = (formData) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(REGISTER_FORM_STORAGE_KEY, JSON.stringify(formData));
  } catch {
    // Ignore storage errors and keep the app running.
  }
};

const clearPersistedForm = () => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(REGISTER_FORM_STORAGE_KEY);
  } catch {
    // Ignore storage errors and keep the app running.
  }
};

const initialFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  contactNumber: '',
  address: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const validateName = (value, isRequired = true) => {
  const trimmed = (value || '').trim();
  if (!trimmed && isRequired) return 'This field is required.';
  if (!trimmed) return '';
  if (!/^[A-Za-z]+(?: [A-Za-z]+)?$/.test(trimmed)) return 'Letters only and one space only.';
  if (trimmed.length < 2 || trimmed.length > 20) return 'Must be 2 to 20 characters.';
  if (/(.)\1\1/i.test(trimmed)) return 'No three identical letters in a row.';
  return '';
};

const validateContactNumber = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'This field is required.';
  if (!/^\d{11}$/.test(trimmed)) return 'Must be exactly 11 digits.';
  if (!trimmed.startsWith('09')) return 'Must start with 09.';
  return '';
};

const validateAddress = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'This field is required.';
  if (!/^[A-Za-z0-9,.'#/ -]+$/.test(trimmed)) return 'Use letters, numbers, spaces, commas, periods, hyphens, or apostrophes only.';
  if (trimmed.length > 100) return 'Maximum 100 characters.';
  return '';
};

const validateEmail = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'This field is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address.';
  return '';
};

const validatePassword = (value) => {
  const trimmed = value;
  if (!trimmed) return 'This field is required.';
  if (trimmed.length < 8 || trimmed.length > 50) return 'Must be 8 to 50 characters.';
  if (!/[A-Za-z]/.test(trimmed)) return 'Must contain at least one letter.';
  if (!/\d/.test(trimmed)) return 'Must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(trimmed)) return 'Must contain at least one special character.';
  return '';
};

export default function RegisterPage({ setCurrentPage, setPendingVerificationEmail }) {
  const persistedForm = readPersistedForm();
  const [formData, setFormData] = useState(persistedForm || initialFormState);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    writePersistedForm(formData);
  }, [formData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStatusMessage('');
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    const firstNameError = validateName(formData.firstName, true);
    if (firstNameError) nextErrors.firstName = firstNameError;

    const middleNameError = validateName(formData.middleName, false);
    if (middleNameError) nextErrors.middleName = middleNameError;

    const lastNameError = validateName(formData.lastName, true);
    if (lastNameError) nextErrors.lastName = lastNameError;

    const contactNumberError = validateContactNumber(formData.contactNumber);
    if (contactNumberError) nextErrors.contactNumber = contactNumberError;

    const addressError = validateAddress(formData.address);
    if (addressError) nextErrors.address = addressError;

    const emailError = validateEmail(formData.email);
    if (emailError) nextErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) nextErrors.password = passwordError;

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'This field is required.';
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage('Please correct the highlighted fields.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('');

    const targetEmail = formData.email.trim().toLowerCase();

    try {
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim(),
          lastName: formData.lastName.trim(),
          contactNumber: formData.contactNumber.trim(),
          address: formData.address.trim(),
          email: targetEmail,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        clearPersistedForm();
        setPendingVerificationEmail(targetEmail);
        // FIXED: Changed confirmation context status banner text
        setStatusMessage('Verification code sent! Please verify your identity.');
        setTimeout(() => setCurrentPage('verify'), 1500);
      } else {
        setStatusMessage(data.message || 'Registration failed.');
      }
    } catch {
      setStatusMessage('Unable to reach the server right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(94,53,177,0.12),_transparent_35%),linear-gradient(135deg,_#f8f7ff_0%,_#ffffff_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-gray-100 bg-white p-8 shadow-[0_20px_70px_rgba(94,53,177,0.16)] sm:p-10 lg:p-12">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#5e35b1]">Identity Verification</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-800">Register your account</h2>
            <p className="mt-2 text-sm text-gray-500">Fill in your details to get started.</p>
          </div>

          {statusMessage && (
            <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${statusMessage.includes('sent') ? 'border-green-200 bg-green-50 text-green-600' : 'border-red-200 bg-red-50 text-red-600'}`}>
              {statusMessage}
            </div>
          )}

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">First Name</label>
              <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${errors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                <UserRound size={18} className="mr-3 text-gray-400" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Middle Name</label>
              <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${errors.middleName ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                <UserRound size={18} className="mr-3 text-gray-400" />
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  placeholder="Enter middle name"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.middleName && <p className="mt-1 text-xs text-red-500">{errors.middleName}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Last Name</label>
              <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${errors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                <UserRound size={18} className="mr-3 text-gray-400" />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Contact Number</label>
              <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${errors.contactNumber ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                <Phone size={18} className="mr-3 text-gray-400" />
                <input
                  type="text"
                  name="contactNumber"
                  inputMode="numeric"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.contactNumber && <p className="mt-1 text-xs text-red-500">{errors.contactNumber}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Address</label>
              <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${errors.address ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                <MapPin size={18} className="mr-3 text-gray-400" />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Email Address</label>
              <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                <Mail size={18} className="mr-3 text-gray-400" />
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
              <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                <Lock size={18} className="mr-3 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create password"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Confirm Password</label>
              <div className={`flex items-center rounded-2xl border px-4 py-3 transition ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-[#5e35b1] focus-within:bg-white'}`}>
                <Lock size={18} className="mr-3 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5e35b1] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5e35b1]/20 transition hover:bg-[#4a148c] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Sending verification code...' : 'Get Verification Code'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button
              className="font-semibold text-[#5e35b1] transition hover:text-[#4a148c]"
              onClick={() => setCurrentPage('login')}
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
import express from 'express';
import { sendVerificationEmail, sendEmployeeIdEmail, sendPasswordRecoveryEmail } from './emailService.js';
import { generateCode } from './utilis/generateCode.js';
import { authenticateUser } from './authHelpers.js';

const router = express.Router();

const verificationStore = new Map();
const passwordRecoveryStore = new Map();
const registeredUsersByEmail = new Map();
const registeredUsersByEmployeeId = new Map();

const validateName = (value, isRequired = true) => {
  const trimmed = value?.trim() || '';
  if (!trimmed && isRequired) return 'This field is required.';
  if (!trimmed) return '';
  if (!/^[A-Za-z]+(?: [A-Za-z]+)?$/.test(trimmed)) return 'Letters only and one space only.';
  if (trimmed.length < 2 || trimmed.length > 20) return 'Must be 2 to 20 characters.';
  if (/(.)\1\1/i.test(trimmed)) return 'No three identical letters in a row.';
  return '';
};

const validateContactNumber = (value) => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return 'This field is required.';
  if (!/^\d{11}$/.test(trimmed)) return 'Must be exactly 11 digits.';
  if (!trimmed.startsWith('09')) return 'Must start with 09.';
  return '';
};

const validateAddress = (value) => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return 'This field is required.';
  if (!/^[A-Za-z0-9,.'#/ -]+$/.test(trimmed)) return 'Use letters, numbers, spaces, commas, periods, hyphens, or apostrophes only.';
  if (trimmed.length > 100) return 'Maximum 100 characters.';
  return '';
};

const validateEmail = (value) => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return 'This field is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address.';
  return '';
};

const validatePassword = (value) => {
  const trimmed = value || '';
  if (!trimmed) return 'This field is required.';
  if (trimmed.length < 8 || trimmed.length > 50) return 'Must be 8 to 50 characters.';
  if (!/[A-Za-z]/.test(trimmed)) return 'Must contain at least one letter.';
  if (!/\d/.test(trimmed)) return 'Must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(trimmed)) return 'Must contain at least one special character.';
  return '';
};

const validateRegistrationInput = (body) => {
  const errors = [];
  const firstNameError = validateName(body.firstName, true);
  const middleNameError = validateName(body.middleName, false);
  const lastNameError = validateName(body.lastName, true);
  const contactError = validateContactNumber(body.contactNumber);
  const addressError = validateAddress(body.address);
  const emailError = validateEmail(body.email);
  const passwordError = validatePassword(body.password);

  if (firstNameError) errors.push(firstNameError);
  if (middleNameError) errors.push(middleNameError);
  if (lastNameError) errors.push(lastNameError);
  if (contactError) errors.push(contactError);
  if (addressError) errors.push(addressError);
  if (emailError) errors.push(emailError);
  if (passwordError) errors.push(passwordError);
  if (!body.confirmPassword) errors.push('Confirm password is required.');
  else if (body.password !== body.confirmPassword) errors.push('Passwords do not match.');

  return errors;
};

const createEmployeeId = () => `EID${Math.floor(100000 + Math.random() * 900000)}`;

router.post('/register', async (req, res) => {
  const errors = validateRegistrationInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0] });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  if (registeredUsersByEmail.has(email)) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const employeeId = createEmployeeId();
  const firstName = String(req.body.firstName || '').trim();

  verificationStore.set(email, {
    code,
    expiresAt,
    userData: {
      ...req.body,
      email,
      employeeId,
    },
  });

  try {
    await sendVerificationEmail(email, code, firstName);
    res.json({ message: 'Verification code sent. Please check your email.', email });
  } catch (error) {
    console.error('Verification email error details:', error);
    verificationStore.delete(email);
    res.status(500).json({ message: 'Failed to send verification email. Please check your internet or configuration.' });
  }
});

router.post('/verify', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();

  const record = verificationStore.get(email);

  if (!record) {
    return res.status(400).json({ message: 'No registration information found.' });
  }

  if (Date.now() > record.expiresAt) {
    verificationStore.delete(email);
    return res.status(400).json({ message: 'Verification code expired.' });
  }

  if (record.code !== code) {
    return res.status(400).json({ message: 'Invalid verification code.' });
  }

  verificationStore.delete(email);
  const verifiedUser = {
    ...record.userData,
    password: String(req.body.password || record.userData.password || ''),
    employeeId: String(record.userData.employeeId || '').trim(),
  };
  registeredUsersByEmail.set(email, verifiedUser);
  registeredUsersByEmployeeId.set(verifiedUser.employeeId.toLowerCase(), verifiedUser);

  try {
    await sendEmployeeIdEmail(email, verifiedUser.employeeId);
  } catch (error) {
    console.error('Employee ID email error:', error);
  }

  res.json({ message: 'Account created and verified successfully.', employeeId: verifiedUser.employeeId });
});

router.post('/login', (req, res) => {
  const identifier = String(req.body.identifier || '').trim();
  const password = String(req.body.password || '');

  const result = authenticateUser({
    registeredUsersByEmail,
    registeredUsersByEmployeeId,
    identifier,
    password,
  });

  if (!result.success) {
    if (result.reason === 'account') {
      return res.status(404).json({ message: 'Account does not exist' });
    }

    return res.status(401).json({ message: 'Incorrect password.' });
  }

  res.json({
    message: 'Login successful.',
    user: {
      firstName: result.user.firstName,
      employeeId: result.user.employeeId,
      email: result.user.email,
    },
  });
});

router.post('/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const emailError = validateEmail(email);

  if (emailError) {
    return res.status(400).json({ message: emailError });
  }

  const user = registeredUsersByEmail.get(email);
  if (!user) {
    return res.status(404).json({ message: 'No account was found with this email address.' });
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  passwordRecoveryStore.set(email, {
    code,
    expiresAt,
  });

  try {
    // This sends the code over SMTP safely to the actual user email
    await sendPasswordRecoveryEmail(email, code);
    
    // FIXED: Ensured no raw code parameter is leaked inside the JSON payload structure
    return res.json({ message: 'Recovery code sent. Please check your email inbox.' });
  } catch (error) {
    console.error('Password recovery email error:', error);
    // Cleanup temporary record cache tracking if the nodemailer transmission fails
    passwordRecoveryStore.delete(email);
    return res.status(500).json({ message: 'Failed to send recovery email. Please check your configuration.' });
  }
});

router.post('/reset-password', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  if (emailError) {
    return res.status(400).json({ message: emailError });
  }

  if (!code) {
    return res.status(400).json({ message: 'Recovery code is required.' });
  }

  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  const record = passwordRecoveryStore.get(email);
  if (!record) {
    return res.status(400).json({ message: 'No recovery code found for this email.' });
  }

  if (Date.now() > record.expiresAt) {
    passwordRecoveryStore.delete(email);
    return res.status(400).json({ message: 'Recovery code expired.' });
  }

  if (record.code !== code) {
    return res.status(400).json({ message: 'Invalid recovery code.' });
  }

  const user = registeredUsersByEmail.get(email);
  if (!user) {
    passwordRecoveryStore.delete(email);
    return res.status(404).json({ message: 'No account was found with this email address.' });
  }

  const updatedUser = { ...user, password };
  registeredUsersByEmail.set(email, updatedUser);
  registeredUsersByEmployeeId.set(String(updatedUser.employeeId || '').toLowerCase(), updatedUser);
  passwordRecoveryStore.delete(email);

  res.json({ message: 'Password reset successfully. You can now sign in.' });
});

export default router;
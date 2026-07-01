import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Look in backend folder first, fallback to root workspace folder if missing
const localEnvPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config({ path: rootEnvPath });
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const ensureEmailConfig = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials are not configured in your .env file.');
  }
};

export const sendVerificationEmail = async (email, code, firstName = 'User') => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
      <h2>OpiStock System</h2>
      <p>Hello <b>${firstName}</b>,</p>
      <p>Thank you for registering with OpiStock.</p>
      <p>Please verify your email address using the code below:</p>
      <h1 style="letter-spacing: 4px; color: #5e35b1; background-color: #f8f7ff; padding: 10px 20px; display: inline-block; border-radius: 8px;">${code}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not create an account, please ignore this email.</p>
      <br/>
      <p>Best regards,<br/>The OpiStock Team</p>
    </div>
  `;

  const text = `Hello ${firstName},

Thank you for registering with OpiStock.

Please verify your email address using the code below:
${code}

This code will expire in 10 minutes.

If you did not create an account, please ignore this email.

Best regards,
The OpiStock Team`;

  ensureEmailConfig();
  await transporter.verify();
  await transporter.sendMail({
    from: `"OpiStock Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Email Verification Code',
    text,
    html,
  });
};

export const sendEmployeeIdEmail = async (email, employeeId) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
      <h2>Welcome to OpiStock</h2>
      <p>Dear <b>${email}</b>,</p>
      <p>Your email has been successfully verified.</p>
      <p>Your employee ID is: <b style="color: #5e35b1; font-size: 1.2em;">${employeeId}</b></p>
      <p>You may now continue to the transaction dashboard.</p>
      <br/>
      <p>Best regards,<br/>The OpiStock Team</p>
    </div>
  `;

  ensureEmailConfig();
  await transporter.verify();
  await transporter.sendMail({
    from: `"OpiStock Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Employee ID',
    html,
  });
};

export const sendPasswordRecoveryEmail = async (email, code) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
      <p>Hi there,</p>
      <p>We received a request to reset the password for your account.</p>
      <p>To choose a new password, use the code below:</p>
      <h1 style="letter-spacing: 4px; color: #5e35b1; background-color: #f8f7ff; padding: 10px 20px; display: inline-block; border-radius: 8px;">${code}</h1>
      <p>If you didn't request this change, you can safely ignore this email&mdash;your password will remain secure. This code will expire in 10 minutes.</p>
      <br/>
      <p>Best regards,</p>
      <p>The OpiStock Team</p>
    </div>
  `;

  const text = `Hi there,

We received a request to reset the password for your account.

To choose a new password, use the code below:

${code}

If you didn't request this change, you can safely ignore this email-your password will remain secure. This code will expire in 10 minutes.

Best regards,

The OpiStock Team`;

  ensureEmailConfig();
  await transporter.verify();
  await transporter.sendMail({
    from: `"OpiStock Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Recovery Code',
    text,
    html,
  });
};
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";


// IMPORT EMAIL SERVICE HOOKS Safely
import { sendVerificationEmail, sendPasswordRecoveryEmail } from "./emailService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, ".env") });

const app = express();
const PORT = 8002;

// Serve built frontend (dist/) — for production via ngrok HTTPS
const distPath = resolve(__dirname, '../../dist');
app.use(express.static(distPath));

const allowedOrigins = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/[a-zA-Z0-9-]+\.serveousercontent\.com$/,
  /^https:\/\/[a-zA-Z0-9-]+\.ngrok-free\.dev$/,
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(p => p.test(origin))) return cb(null, true);
    return cb(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

let db;
async function getDb() {
  if (!db) {
    const mysql = await import('mysql2/promise');
    db = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'jane2005',
      database: process.env.DB_NAME || 'pos_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return db;
}



// ========= AUTH DATA STORAGE & VALIDATIONS =========

// Verification memory store for registering users before they hit the DB
const registrationVerificationStore = new Map();
const recoveryStore = new Map();

function validateEmail(v) {
  v = (v || '').trim();
  if (!v) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email';
  return '';
}

function validatePassword(v) {
  v = v || '';
  if (v.length < 8 || v.length > 50) return 'Must be 8-50 characters';
  if (!/[A-Za-z]/.test(v)) return 'Must contain a letter';
  if (!/\d/.test(v)) return 'Must contain a number';
  if (!/[^A-Za-z0-9]/.test(v)) return 'Must contain a special character';
  return '';
}

function validateName(v, required = true) {
  v = (v || '').trim();
  if (!v && required) return 'Required';
  if (!v) return '';
  if (!/^[A-Za-z]+(?: [A-Za-z]+)?$/.test(v)) return 'Letters only';
  if (v.length < 2 || v.length > 20) return '2-20 characters';
  return '';
}

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, middleName, lastName, email, password, contactNumber, address } = req.body;
    const errors = [];
    const e1 = validateName(firstName, true);
    const e2 = validateName(middleName, false);
    const e3 = validateName(lastName, true);
    const e4 = validateEmail(email);
    const e5 = validatePassword(password);
    if (e1) errors.push(e1);
    if (e2) errors.push(e2);
    if (e3) errors.push(e3);
    if (e4) errors.push(e4);
    if (e5) errors.push(e5);
    if (!contactNumber) errors.push('Contact number is required');
    if (!address) errors.push('Address is required');
    if (password !== req.body.confirmPassword) errors.push('Passwords do not match');

    if (errors.length > 0) return res.status(400).json({ message: errors[0] });

    const pool = await getDb();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) return res.status(409).json({ message: 'Email already registered' });

    // Generate numeric 6-digit registration verification pin
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validation life

    // Secure payload in transient memory pending activation
    registrationVerificationStore.set(email.toLowerCase().trim(), {
      code,
      expiresAt,
      userData: { firstName, middleName, lastName, email, password, contactNumber, address }
    });

    // Fire verification email using Nodemailer
    try {
      await sendVerificationEmail(email.toLowerCase().trim(), code, firstName);
      res.json({ message: 'Verification code sent. Please check your email.', email });
    } catch (emailErr) {
      console.error('Email send failure detailed logs:', emailErr);
      registrationVerificationStore.delete(email.toLowerCase().trim());
      return res.status(500).json({ message: 'Failed to dispatch verification email. Verify your server configuration variables.' });
    }

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/resend-verification
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const emailError = validateEmail(email);

    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    const record = registrationVerificationStore.get(email);
    if (!record) {
      return res.status(404).json({ message: 'No pending verification was found for this email.' });
    }

    const pool = await getDb();
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000;

    registrationVerificationStore.set(email, {
      ...record,
      code,
      expiresAt,
    });

    try {
      await sendVerificationEmail(email, code, record.userData?.firstName || 'User');
      res.json({ message: 'A fresh verification code has been dispatched to your email inbox.' });
    } catch (emailErr) {
      console.error('Resend verification email failure:', emailErr);
      registrationVerificationStore.delete(email);
      return res.status(500).json({ message: 'Failed to resend verification email.' });
    }
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/verify — Now securely processes memory queue records into MySQL
app.post('/api/auth/verify', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification digits are required.' });
    }

    const record = registrationVerificationStore.get(email);
    if (!record) return res.status(400).json({ message: 'No current registration data found.' });
    if (Date.now() > record.expiresAt) {
      registrationVerificationStore.delete(email);
      return res.status(400).json({ message: 'Verification code expired.' });
    }
    if (record.code !== code) return res.status(400).json({ message: 'Invalid verification code.' });

    // Code is validated! Pop from transient memory queue
    registrationVerificationStore.delete(email);
    const { firstName, middleName, lastName, password, contactNumber, address } = record.userData;

    const hashedPassword = await bcrypt.hash(password, 10);
    const employeeId = `EID${String(Math.floor(100000 + Math.random() * 900000))}`;

    const pool = await getDb();
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    await pool.query(
      `INSERT INTO users (employee_id, first_name, middle_name, last_name, email, password, contact_number, address, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CASHIER')`,
      [employeeId, firstName, middleName || '', lastName, email, hashedPassword, contactNumber, address]
    );

    res.json({ message: 'Email verified successfully and account created.', employeeId });
  } catch (err) {
    console.error('Verification operational branch error:', err);
    res.status(500).json({ message: 'Internal server error processing database insertion.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: 'Identifier and password required' });

    const pool = await getDb();
    const [users] = await pool.query(
      'SELECT * FROM users WHERE (email = ? OR employee_id = ?) AND is_active = 1',
      [identifier.toLowerCase(), identifier]
    );

    if (users.length === 0) return res.status(404).json({ message: 'Account does not exist' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Incorrect password' });

    res.json({
      message: 'Login successful',
      user: {
        firstName: user.first_name,
        employeeId: user.employee_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const pool = await getDb();
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ message: 'No account found with this email' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    recoveryStore.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    await sendPasswordRecoveryEmail(email, code);

    res.json({ message: 'Recovery code sent. Please check your email inbox.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    recoveryStore.delete(email);
    res.status(500).json({ message: 'Unable to send recovery email right now.' });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, password, confirmPassword } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) return res.status(400).json({ message: 'Email is required' });
    if (!code) return res.status(400).json({ message: 'Recovery code is required' });
    if (!password || password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });

    const record = recoveryStore.get(normalizedEmail);
    if (!record) return res.status(400).json({ message: 'No recovery code found' });
    if (Date.now() > record.expiresAt) {
      recoveryStore.delete(normalizedEmail);
      return res.status(400).json({ message: 'Recovery code expired' });
    }
    if (record.code !== code) return res.status(400).json({ message: 'Invalid recovery code' });

    recoveryStore.delete(normalizedEmail);
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await getDb();
    await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, normalizedEmail]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users — exposed for other modules
app.get('/api/users', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query(
      'SELECT id, employee_id, first_name, last_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========= SALES ROUTES =========

// GET /api/sales-orders — exposed for Dashboard module
app.get('/api/sales-orders', async (req, res) => {
  try {
    const pool = await getDb();
    const { date, start_date, end_date, cashier_id } = req.query;

    let query = `
      SELECT so.*, COALESCE(
        JSON_ARRAYAGG(JSON_OBJECT('id', oi.id, 'product_id', oi.product_id, 'product_name', oi.product_name, 'qty', oi.qty, 'price', oi.price, 'subtotal', oi.subtotal)),
        '[]'
      ) AS items
      FROM sales_orders so
      LEFT JOIN order_items oi ON oi.receipt_no = so.receipt_no
    `;
    const conditions = [];
    const params = [];

    const hasDateFilter = Boolean(date || start_date || end_date);
    if (!hasDateFilter) {
      conditions.push('DATE(so.created_at) = CURDATE()');
    }
    if (date) { conditions.push('DATE(so.created_at) = ?'); params.push(date); }
    if (start_date) { conditions.push('DATE(so.created_at) >= ?'); params.push(start_date); }
    if (end_date) { conditions.push('DATE(so.created_at) <= ?'); params.push(end_date); }
    if (cashier_id) { conditions.push('so.cashier_id = ?'); params.push(cashier_id); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' GROUP BY so.id ORDER BY so.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get sales orders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sales/today — aggregated for Dashboard
app.get('/api/sales/today', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS total_sales,
              COALESCE(SUM(items_count), 0) AS total_items
       FROM sales_orders
       WHERE DATE(created_at) = CURDATE() AND status = 'Completed'`
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Today sales error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sales/by-date — for Dashboard charts
app.get('/api/sales/by-date', async (req, res) => {
  try {
    const pool = await getDb();
    const { days = 7 } = req.query;
    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS total_sales
       FROM sales_orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND status = 'Completed'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [parseInt(days)]
    );
    res.json(rows);
  } catch (err) {
    console.error('Sales by date error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sales-orders — process a sale
app.post('/api/sales-orders', async (req, res) => {
  try {
    const { receipt_no, cashier_id, cashier_name, total, paid, change_given, payment_method, items } = req.body;

    if (!receipt_no || !items || !items.length) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const pool = await getDb();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const itemsCount = items.reduce((sum, i) => sum + i.qty, 0);
      await conn.query(
        `INSERT INTO sales_orders (receipt_no, cashier_id, cashier_name, total, paid, change_given, payment_method, items_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
        [receipt_no, cashier_id || 'UNKNOWN', cashier_name || '', total || 0, paid || 0, change_given || 0, payment_method || 'Cash', itemsCount]
      );

      for (const item of items) {
        const subtotal = item.qty * item.price;
        await conn.query(
          `INSERT INTO order_items (receipt_no, product_id, product_name, qty, price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [receipt_no, item.product_id, item.product_name || '', item.qty, item.price, subtotal]
        );
      }

      await conn.commit();

      try {
        const { deductProductStock } = await import('./inventoryClient.js');
        for (const item of items) {
          await deductProductStock(item.product_id, item.qty);
        }
      } catch (invErr) {
        console.error('Inventory sync error (non-blocking):', invErr.message);
      }

      res.status(201).json({ success: true, message: 'Sale processed', receipt_no });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Sales order error:', err);
    res.status(500).json({ message: 'Failed to process sale' });
  }
});

// GET /api/sales/products — fetch products from Inventory module
app.get('/api/sales/products', async (req, res) => {
  try {
    const { getProductsFromInventory } = await import('./inventoryClient.js');
    const products = await getProductsFromInventory();
    const mapped = products.map(p => ({
      id: p.sku || p.id || String(p.product_id || ''),
      name: p.name || p.product_name || '',
      price: parseFloat(p.unit_price || p.price || 0),
      stock: parseInt(p.stock_quantity || p.stock || 0),
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.json([]);
  }
});

// GET /api/health — health check for other modules
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', module: 'pos', port: PORT, timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(resolve(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`POS Backend Server running on port ${PORT}`);
});
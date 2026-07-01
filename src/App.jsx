import React, { useEffect, useState } from 'react';

import Sidebar from './components/Sidebar';
import { apiUrl } from './lib/api';

const SESSION_STORAGE_KEY = 'opi-pos-session';

const readPersistedSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writePersistedSession = (state) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors and keep the app running.
  }
};

const clearPersistedSession = () => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors and keep the app running.
  }
};

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import TransactionPage from './pages/TransactionPage';
import PaymentPage from './pages/PaymentPage';
import ReceiptPage from './pages/ReceiptPage';
import HistoryPage from './pages/HistoryPage';
import DetailsPage from './pages/DetailsPage';

const INITIAL_PRODUCTS = [
  { id: 'SKU-1029', name: 'AlphaTech Pro Wireless Earbuds', price: 2499, stock: 145 },
  { id: 'SKU-8832', name: 'ErgoGrip Mechanical Keyboard', price: 4199, stock: 84 },
  { id: 'SKU-3321', name: 'Legacy USB 2.0 Hub (4-port)', price: 599, stock: 12 },
  { id: 'SKU-4110', name: 'Lumina 4K Monitor (27-inch)', price: 18500, stock: 32 },
  { id: 'SKU-1190', name: 'Wired Earphones (Basic)', price: 299, stock: 8 },
  { id: 'SKU-9021', name: 'TitanX Gaming Mouse', price: 1499, stock: 65 },
];

const mapServerTransaction = (row) => {
  const parsedItems = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []);

  return {
    receiptNo: row.receipt_no,
    date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
    time: row.created_at ? new Date(row.created_at).toTimeString().split(' ')[0].slice(0, 5) : '',
    items: (parsedItems || []).map((item) => ({
      id: item.product_id,
      name: item.product_name,
      price: Number(item.price || 0),
      qty: Number(item.qty || 0),
    })),
    total: Number(row.total || 0),
    paid: Number(row.paid || 0),
    change: Number(row.change_given || 0),
    paymentMethod: row.payment_method || 'Cash',
    cashier: row.cashier_name || row.cashier_id || 'Employee',
  };
};

export default function App() {
  const persistedSession = readPersistedSession();

  const [currentPage, setCurrentPage] = useState(persistedSession?.currentPage || 'login');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(persistedSession?.pendingVerificationEmail || '');
  const [currentUser, setCurrentUser] = useState(persistedSession?.currentUser || null);

  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  const [transactions, setTransactions] = useState([]);

  const refreshTransactions = async () => {
    try {
      const response = await fetch(apiUrl('/api/sales-orders'));
      if (!response.ok) {
        throw new Error('Unable to load transaction history');
      }

      const rows = await response.json();
      setTransactions((rows || []).map(mapServerTransaction));
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    }
  };

  useEffect(() => {
    refreshTransactions();
  }, [currentPage]);

  useEffect(() => {
    writePersistedSession({
      currentPage,
      currentUser,
      pendingVerificationEmail,
    });
  }, [currentPage, currentUser, pendingVerificationEmail]);

  useEffect(() => {
    const protectedPages = ['transaction', 'payment', 'receipt', 'history', 'details'];
    if (protectedPages.includes(currentPage) && !currentUser) {
      setCurrentPage('login');
    }
  }, [currentPage, currentUser]);

  if (currentPage === 'login') {
    return <LoginPage setCurrentPage={setCurrentPage} setCurrentUser={setCurrentUser} />;
  }

  if (currentPage === 'register') {
    return (
      <RegisterPage
        setCurrentPage={setCurrentPage}
        setPendingVerificationEmail={setPendingVerificationEmail}
      />
    );
  }

  if (currentPage === 'verify') {
    return (
      <EmailVerificationPage
        email={pendingVerificationEmail}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  if (currentPage === 'forgot-password') {
    return <ForgotPasswordPage setCurrentPage={setCurrentPage} />;
  }

  return (
    <div className="flex h-screen bg-background text-slate-800 overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <main className="flex-1 overflow-y-auto p-8 bg-background">
        {currentPage === 'transaction' && (
          <TransactionPage
            products={products}
            cart={cart}
            setCart={setCart}
            setCurrentPage={setCurrentPage}
            currentUser={currentUser}
            onProceedToPayment={() => setCurrentPage('payment')}
          />
        )}

        {currentPage === 'payment' && (
          <PaymentPage
            cart={cart}
            setCart={setCart}
            products={products}
            setProducts={setProducts}
            transactions={transactions}
            setTransactions={setTransactions}
            setCurrentReceipt={setCurrentReceipt}
            onSuccess={() => setCurrentPage('receipt')}
            onCancel={() => setCurrentPage('transaction')}
            onTransactionRecorded={refreshTransactions}
          />
        )}

        {currentPage === 'receipt' && (
          <ReceiptPage
            receipt={currentReceipt}
            onNewTransaction={() => {
              setCart([]);
              setCurrentReceipt(null);
              setCurrentPage('transaction');
            }}
          />
        )}

        {currentPage === 'history' && (
          <HistoryPage
            transactions={transactions}
            onViewDetails={(id) => {
              setSelectedTransactionId(id);
              setCurrentPage('details');
            }}
          />
        )}

        {currentPage === 'details' && (
          <DetailsPage
            transaction={transactions.find((t) => t.receiptNo === selectedTransactionId)}
            onBack={() => setCurrentPage('history')}
          />
        )}
      </main>
    </div>
  );
}
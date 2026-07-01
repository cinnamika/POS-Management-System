import { useState } from 'react';
import { CreditCard, DollarSign, Wallet } from 'lucide-react';
import { apiUrl } from '../lib/api';

const createNewTransaction = ({ cart, paymentAmount, method, total, currentUser }) => {
  const today = new Date();
  return {
    receiptNo: `REC-${today.getTime().toString().slice(-6)}`,
    date: today.toISOString().split('T')[0],
    time: today.toTimeString().split(' ')[0].slice(0, 5),
    items: cart,
    total,
    paid: Number(paymentAmount),
    change: Number(paymentAmount) - total,
    paymentMethod: method,
    cashier: currentUser?.firstName || 'Employee',
  };
};

export default function PaymentPage({
  cart,
  setCart,
  products,
  setProducts,
  transactions,
  setTransactions,
  setCurrentReceipt,
  currentUser,
  onSuccess,
  onCancel,
  onTransactionRecorded,
}) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.12;
  const total = subtotal + tax;
  const paid = Number(paymentAmount);
  const change = paymentAmount ? paid - total : 0;

  const handleConfirm = async (event) => {
    event.preventDefault();

    if (!cart.length) {
      alert('Your cart is empty.');
      return;
    }

    if (!paymentAmount || Number.isNaN(paid) || paid < total) {
      alert('Insufficient payment amount.');
      return;
    }

    setIsProcessing(true);
    const newTransaction = createNewTransaction({ cart, paymentAmount, method, total, currentUser });

    try {
      const response = await fetch(apiUrl('/api/sales-orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_no: newTransaction.receiptNo,
          cashier_id: currentUser?.employeeId || 'EMPLOYEE',
          total: newTransaction.total,
          paid: newTransaction.paid,
          change_given: newTransaction.change,
          payment_method: newTransaction.paymentMethod,
          status: 'Completed',
          items_count: cart.reduce((acc, item) => acc + item.qty, 0),
          items: cart.map((item) => ({
            product_id: item.id,
            product_name: item.name,
            qty: item.qty,
            price: item.price,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Sale could not be saved.');
      }

      setProducts(
        products.map((product) => {
          const cartItem = cart.find((item) => item.id === product.id);
          return cartItem ? { ...product, stock: product.stock - cartItem.qty } : product;
        })
      );
      setTransactions([newTransaction, ...transactions]);
      setCurrentReceipt(newTransaction);
      setCart([]);
      onTransactionRecorded?.();
      onSuccess();
    } catch (error) {
      console.error('Payment processing failed:', error);
      alert('Database error: Unable to complete the transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmCancel = () => {
    setCart([]);
    setShowCancelConfirm(false);
    onCancel();
  };

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Process Checkout Payment</h2>
        </div>

        <form onSubmit={handleConfirm} className="space-y-6 p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-5 text-center">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Total Due</span>
            <span className="text-4xl font-extrabold text-slate-900">PHP {total.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Payment Method</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Cash', icon: Wallet },
                { name: 'GCash', icon: DollarSign },
                { name: 'Card', icon: CreditCard },
              ].map((option) => {
                const Icon = option.icon;
                const isActive = method === option.name;
                return (
                  <button
                    type="button"
                    key={option.name}
                    onClick={() => setMethod(option.name)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 font-medium transition ${
                      isActive
                        ? 'border-[#5e35b1] bg-[#5e35b1]/15 text-[#5e35b1] shadow-sm'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-[#5e35b1]' : 'text-slate-500'} />
                    <span className="text-sm">{option.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Amount Tendered (PHP)</label>
            <input
              type="number"
              required
              min={total}
              placeholder="0.00"
              step="any"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-lg font-bold text-slate-900 focus:border-[#5e35b1] focus:outline-none"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <span className="text-sm text-slate-400">Change Due:</span>
            <span className={`text-xl font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              PHP {change >= 0 ? change.toFixed(2) : '0.00'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isProcessing}
              className="rounded-xl border border-slate-300 py-3 font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel Transaction
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="rounded-xl bg-[#5e35b1] py-3 font-bold text-white shadow-lg transition hover:bg-[#4a148c] disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Cancel Transaction</h3>
            <p className="mt-3 text-sm text-slate-600">Are you sure you want to cancel this transaction?</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="w-full rounded-xl bg-[#5e35b1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4a148c] sm:w-auto"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

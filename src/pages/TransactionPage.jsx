import { useEffect, useState } from 'react';
import { Search, Plus, Minus } from 'lucide-react';
import { DataGrid } from '@mui/x-data-grid';

export default function TransactionPage({ products, cart, setCart, setCurrentPage, onProceedToPayment }) {
  const [search, setSearch] = useState('');
  const [selectedQty, setSelectedQty] = useState(() =>
    products.reduce((acc, product) => {
      const cartItem = cart.find((item) => item.id === product.id);
      acc[product.id] = cartItem ? cartItem.qty : 0;
      return acc;
    }, {})
  );

  useEffect(() => {
    setSelectedQty((prevSelectedQty) =>
      products.reduce((acc, product) => {
        const cartItem = cart.find((item) => item.id === product.id);
        const cartQty = cartItem ? cartItem.qty : 0;
        const prevQty = prevSelectedQty[product.id] ?? cartQty;
        acc[product.id] = prevQty === cartQty ? cartQty : prevQty;
        return acc;
      }, {})
    );
  }, [cart, products]);

  const sortedProducts = [...products].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const filteredProducts = sortedProducts.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleQtyChange = (id, delta, stock) => {
    const currentQty = selectedQty[id] ?? 0;
    const nextQty = Math.min(Math.max(currentQty + delta, 0), stock);
    if (nextQty === currentQty) return;

    setSelectedQty({ ...selectedQty, [id]: nextQty });
  };

  const addToCart = (product) => {
    const qtyToSet = selectedQty[product.id] ?? 0;
    if (qtyToSet < 1) return;

    const existing = cart.find((item) => item.id === product.id);
    const finalQty = Math.min(qtyToSet, product.stock);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: finalQty } : item
        )
      );
    } else {
      setCart([
        ...cart,
        { ...product, qty: finalQty },
      ]);
    }
  };

  const removeFromCart = (product) => {
    const targetQty = selectedQty[product.id] ?? 0;
    const existing = cart.find((item) => item.id === product.id);
    if (!existing) return;

    if (targetQty <= 0) {
      setCart(cart.filter((item) => item.id !== product.id));
    } else {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: targetQty } : item
        )
      );
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.12;
  const total = subtotal + tax;
  
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="space-y-6 p-1">
      <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or SKU..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/80 py-3 pl-11 pr-4 text-sm text-gray-800 outline-none transition focus:border-[#5e35b1] focus:bg-white"
            />
          </div>

          <div className="flex justify-end">
            <div className="w-48 h-12 rounded-2xl border border-gray-200 bg-gray-50/80 px-4 text-center flex flex-col justify-center">
              <p className="text-sm font-bold text-gray-800 leading-tight">
                {today}
              </p>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{currentTime}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800">Product List</h2>
              <p className="text-xs text-gray-400">Browse items and add them to your cart.</p>
            </div>
            <span className="rounded-lg bg-[#ede7f6] px-3 py-1 text-xs font-semibold text-[#5e35b1]">
              {filteredProducts.length} items
            </span>
          </div>

          <div style={{ height: 520, width: '100%' }}>
            <DataGrid
              rows={filteredProducts}
              getRowId={(row) => row.id}
              pagination={false}
              hideFooter
              disableSelectionOnClick
              columns={[
                { field: 'name', headerName: 'Product Name', flex: 2 },
                { field: 'id', headerName: 'SKU', flex: 1 },
                {
                  field: 'price',
                  headerName: 'Price',
                  flex: 1,
                  renderCell: (params) => `₱${params.row.price.toLocaleString()}`,
                },
                { field: 'stock', headerName: 'Stock', flex: 0.8 },
                {
                  field: 'actions',
                  headerName: 'Actions',
                  flex: 2.2,
                  sortable: false,
                  filterable: false,
                  renderCell: (params) => {
                    const cartQty = cart.find((item) => item.id === params.row.id)?.qty ?? 0;
                    const rowQty = selectedQty[params.row.id] ?? cartQty;
                    const actionType = rowQty === cartQty ? 'idle' : rowQty > cartQty ? 'add' : 'remove';

                    return (
                      <div className="flex items-center gap-1.5 h-full">
                        <button
                          onClick={() => handleQtyChange(params.row.id, -1, params.row.stock)}
                          className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-bold flex items-center justify-center text-sm"
                        >
                          <Minus size={12} />
                        </button>

                        <span className="w-6 text-center font-semibold text-xs text-gray-800">
                          {rowQty}
                        </span>

                        <button
                          onClick={() => handleQtyChange(params.row.id, 1, params.row.stock)}
                          className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-bold flex items-center justify-center text-sm"
                        >
                          <Plus size={12} />
                        </button>

                        {actionType === 'add' && (
                          <button
                            onClick={() => addToCart(params.row)}
                            className="ml-2 px-3 py-1 rounded-lg bg-[#5e35b1] text-white text-xs font-semibold hover:bg-[#4a148c] transition shadow-sm"
                          >
                            Add
                          </button>
                        )}

                        {actionType === 'remove' && (
                          <button
                            onClick={() => removeFromCart(params.row)}
                            className="ml-2 px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition shadow-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              sx={{
                border: 0,
                backgroundColor: '#FFFFFF',
                fontSize: '13px',
                '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc', color: '#364152', fontWeight: '700' },
                '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', color: '#4b5563' },
              }}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div>
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-800">Shopping Cart</h2>
              <p className="text-xs text-gray-400">Review cart items before payment.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 font-bold border-b border-gray-100">
                    <th className="p-3">Product</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-400 italic">Your cart is empty.</td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition">
                        <td className="p-3 font-medium text-gray-800">{item.name}</td>
                        <td className="p-3 font-semibold text-gray-700">{item.qty}</td>
                        <td className="p-3">₱{item.price.toLocaleString()}</td>
                        <td className="p-3 font-semibold text-gray-900">₱{(item.price * item.qty).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-xs text-gray-600 mb-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-400">Subtotal</p>
                <p className="font-semibold text-gray-800">₱{subtotal.toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-400">Tax (12%)</p>
                <p className="font-semibold text-gray-800">₱{tax.toFixed(2)}</p>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                <p className="font-bold text-gray-700 text-sm">Total Amount</p>
                <p className="text-xl font-black text-[#5e35b1]">₱{total.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setCart([])}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-500 transition hover:bg-gray-50"
              >
                Clear Cart
              </button>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={onProceedToPayment}
                className="flex-1 rounded-xl bg-[#5e35b1] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#4527a0] disabled:opacity-40"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
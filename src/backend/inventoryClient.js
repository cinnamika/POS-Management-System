// ════════════════════════════════════════════════════════════════
//  SETUP: I-set ang INVENTORY_API_URL sa .env file
//  Default: naka-link na sa ngrok URL ni Jane (M1)
// ════════════════════════════════════════════════════════════════

import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const INVENTORY_API = process.env.INVENTORY_API_URL || 'https://tamper-polio-speller.ngrok-free.dev/api';

const NGROK_HEADER = { 'ngrok-skip-browser-warning': 'true' };

export async function checkProductStock(productId, qty) {
  const res = await fetch(`${INVENTORY_API}/products/${productId}/`, { headers: NGROK_HEADER });
  if (!res.ok) {
    throw new Error(`Product ${productId} not found in Inventory`);
  }
  const product = await res.json();
  return product.stock_quantity >= qty;
}

export async function deductProductStock(productId, qty) {
  const res = await fetch(`${INVENTORY_API}/products/deduct-stock/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...NGROK_HEADER },
    body: JSON.stringify({ product_id: productId, quantity: qty }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to deduct stock');
  }
  return res.json();
}

export async function getProductsFromInventory() {
  const res = await fetch(`${INVENTORY_API}/products/dropdown/`, { headers: NGROK_HEADER });
  if (!res.ok) throw new Error('Failed to fetch products from Inventory');
  return res.json();
}

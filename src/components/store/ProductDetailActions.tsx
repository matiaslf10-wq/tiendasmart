'use client';

import { useState } from 'react';
import { addToCart } from '@/lib/cart';
import {
  canPurchase,
  getMaxPurchasableQuantity,
  getStockLabel,
} from '@/lib/stock';
import StoreToast from '@/components/store/StoreToast';

type ProductDetailCartProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_active?: boolean | null;
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  allow_backorder?: boolean | null;
};

type ProductDetailActionsProps = {
  storeSlug: string;
  product: ProductDetailCartProduct;
};

type ToastState = {
  message: string;
  tone: 'success' | 'error' | 'info';
} | null;

export default function ProductDetailActions({
  storeSlug,
  product,
}: ProductDetailActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const purchasable = canPurchase(product);
  const maxQty = getMaxPurchasableQuantity(product);
  const stockLabel = getStockLabel(product);
  const quantityDisabled = !purchasable || maxQty === 0;

  function showToast(message: string, tone: 'success' | 'error' | 'info') {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 1800);
  }

  function decrease() {
    setQuantity((prev) => Math.max(1, prev - 1));
  }

  function increase() {
    setQuantity((prev) => {
      const next = prev + 1;
      if (Number.isFinite(maxQty)) {
        return Math.min(next, maxQty);
      }
      return next;
    });
  }

  function handleQuantityChange(value: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      setQuantity(1);
      return;
    }

    if (Number.isFinite(maxQty)) {
      setQuantity(Math.min(Math.floor(parsed), maxQty));
      return;
    }

    setQuantity(Math.floor(parsed));
  }

  function handleAdd() {
    if (!storeSlug) return;

    if (!purchasable) {
      showToast('Este producto no tiene stock.', 'error');
      return;
    }

    if (Number.isFinite(maxQty) && quantity > maxQty) {
      showToast(`Solo hay ${maxQty} disponible${maxQty === 1 ? '' : 's'}.`, 'error');
      return;
    }

    addToCart(
      storeSlug,
      {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url ?? null,
        is_active: product.is_active ?? true,
        track_stock: product.track_stock ?? false,
        stock_quantity: product.stock_quantity ?? 0,
        allow_backorder: product.allow_backorder ?? false,
      },
      quantity
    );

    setAdded(true);
    showToast(
      quantity === 1
        ? 'Producto agregado al carrito.'
        : `${quantity} unidades agregadas al carrito.`,
      'success'
    );
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Disponibilidad: <span className="font-medium">{stockLabel}</span>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">Cantidad</span>

            <div className="flex items-center overflow-hidden rounded-xl border">
              <button
                type="button"
                onClick={decrease}
                disabled={quantityDisabled}
                className="px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                −
              </button>

              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                disabled={quantityDisabled}
                className="w-20 border-x px-3 py-3 text-center outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
              />

              <button
                type="button"
                onClick={increase}
                disabled={quantityDisabled || (Number.isFinite(maxQty) && quantity >= maxQty)}
                className="px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                +
              </button>
            </div>
          </label>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!purchasable}
            className={`rounded-xl px-5 py-3 text-white transition ${
              added
                ? 'bg-green-600'
                : purchasable
                  ? 'bg-black hover:opacity-90'
                  : 'cursor-not-allowed bg-gray-300 text-gray-600'
            }`}
          >
            {added ? 'Agregado ✓' : purchasable ? 'Agregar al carrito' : 'Sin stock'}
          </button>
        </div>

        {Number.isFinite(maxQty) && purchasable && (
          <p className="text-sm text-gray-500">
            Máximo disponible para agregar: {maxQty}
          </p>
        )}
      </div>

      {toast && <StoreToast message={toast.message} tone={toast.tone} />}
    </>
  );
}
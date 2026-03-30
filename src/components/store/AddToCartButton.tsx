'use client';

import { useMemo } from 'react';
import { addToCart, type CartItem } from '@/lib/cart';
import { trackAddToCart } from '@/lib/ga';
import { trackStoreEvent } from '@/lib/analytics-events';
import { canPurchase, getMaxPurchasableQuantity } from '@/lib/stock';

type AddToCartButtonProps = {
  storeSlug: string;
  product: CartItem;
};

export default function AddToCartButton({
  storeSlug,
  product,
}: AddToCartButtonProps) {
  const maxPurchasable = useMemo(
    () => getMaxPurchasableQuantity(product),
    [product]
  );

  const disabled = !canPurchase(product) || maxPurchasable <= 0;

  function handleAdd() {
    if (disabled) return;

    addToCart(storeSlug, product);

    trackAddToCart(
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: 1,
      },
      storeSlug
    );

    void trackStoreEvent({
      storeSlug,
      eventName: 'add_to_cart',
      productId: product.id,
      metadata: {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: 1,
      },
    });
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      aria-disabled={disabled}
      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {disabled ? 'Sin stock' : 'Agregar'}
    </button>
  );
}
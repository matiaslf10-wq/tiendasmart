'use client';

import { useState } from 'react';
import { addToCart, formatPrice } from '@/lib/cart';
import { trackAddToCart } from '@/lib/ga';

type AddToCartButtonProps = {
  storeSlug: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string | null;
  };
};

export default function AddToCartButton({
  storeSlug,
  product,
}: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart(storeSlug, {
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url ?? null,
    });

    trackAddToCart({
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      quantity: 1,
    });

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
    >
      {added ? 'Agregado ✓' : `Agregar · ${formatPrice(product.price)}`}
    </button>
  );
}
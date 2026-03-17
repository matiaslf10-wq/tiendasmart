'use client';

import { useEffect, useState } from 'react';
import { getCartCount } from '@/lib/cart';

type CartBadgeProps = {
  storeSlug: string;
};

export default function CartBadge({ storeSlug }: CartBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function refresh() {
      setCount(getCartCount(storeSlug));
    }

    refresh();

    window.addEventListener('cart-updated', refresh);

    return () => {
      window.removeEventListener('cart-updated', refresh);
    };
  }, [storeSlug]);

  function handleOpenCart() {
    window.dispatchEvent(new CustomEvent('open-cart'));
  }

  return (
    <button
      type="button"
      onClick={handleOpenCart}
      className="inline-flex items-center gap-2 rounded-full border bg-white/90 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm backdrop-blur transition hover:shadow-md"
    >
      <span>🛒</span>
      <span>Carrito</span>
      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-black px-2 py-0.5 text-xs font-semibold text-white">
        {count}
      </span>
    </button>
  );
}
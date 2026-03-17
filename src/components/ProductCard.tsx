'use client';

import { useState } from 'react';
import { addToCart } from '@/lib/cart';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

type ProductCardProps = {
  product: Product;
  storeSlug?: string;
};

export default function ProductCard({
  product,
  storeSlug = '',
}: ProductCardProps) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (!storeSlug) return;

    addToCart(storeSlug, {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url ?? null,
    });

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-md">
      <div className="aspect-[4/3] bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Sin imagen
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <h2 className="text-lg font-semibold leading-tight text-gray-900">
          {product.name}
        </h2>

        <p className="text-xl font-bold text-gray-900">
          ${Number(product.price).toLocaleString('es-AR')}
        </p>

        {product.description && (
          <p className="line-clamp-3 text-sm leading-5 text-gray-600">
            {product.description}
          </p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={!storeSlug}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            added
              ? 'bg-green-600 text-white'
              : 'bg-black text-white hover:opacity-90'
          } ${!storeSlug ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          {added ? 'Agregado ✓' : 'Agregar al carrito'}
        </button>
      </div>
    </article>
  );
}
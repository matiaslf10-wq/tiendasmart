'use client';

import { useState } from 'react';
import { useCart } from '@/context/cart';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-md">
      {/* IMAGEN */}
      <div className="aspect-[4/3] bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            Sin imagen
          </div>
        )}
      </div>

      {/* CONTENIDO */}
      <div className="space-y-3 p-5">
        <h2 className="text-lg font-semibold text-gray-900 leading-tight">
          {product.name}
        </h2>

        <p className="text-xl font-bold text-gray-900">
          ${Number(product.price).toLocaleString('es-AR')}
        </p>

        {product.description && (
          <p className="text-sm leading-5 text-gray-600 line-clamp-3">
            {product.description}
          </p>
        )}

        {/* BOTÓN */}
        <button
          type="button"
          onClick={handleAdd}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            added
              ? 'bg-green-600 text-white'
              : 'bg-black text-white hover:opacity-90'
          }`}
        >
          {added ? 'Agregado ✓' : 'Agregar al carrito'}
        </button>
      </div>
    </article>
  );
}
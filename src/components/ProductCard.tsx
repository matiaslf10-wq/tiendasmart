'use client';

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

  return (
    <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="aspect-[4/3] bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Sin imagen
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <h2 className="text-xl font-semibold text-gray-900">{product.name}</h2>

        <p className="text-2xl font-bold text-gray-900">
          ${Number(product.price).toLocaleString('es-AR')}
        </p>

        {product.description && (
          <p className="text-sm leading-6 text-gray-600">
            {product.description}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            addItem({
              id: product.id,
              name: product.name,
              price: Number(product.price),
              quantity: 1,
            });
            console.log('Agregado al carrito:', product.name);
          }}
          className="w-full rounded-2xl bg-black px-4 py-3 text-white"
        >
          Agregar al carrito
        </button>
      </div>
    </article>
  );
}
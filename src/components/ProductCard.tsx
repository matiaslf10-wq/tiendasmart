'use client';

import Link from 'next/link';
import { useState } from 'react';
import { canPurchase, getStockLabel } from '@/lib/stock';
import AddToCartButton from '@/components/store/AddToCartButton';
import StoreToast from '@/components/store/StoreToast';

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active?: boolean | null;
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  allow_backorder?: boolean | null;
};

type ProductCardProps = {
  product: Product;
  storeSlug?: string;
};

type ToastState = {
  message: string;
  tone: 'success' | 'error' | 'info';
} | null;

export default function ProductCard({
  product,
  storeSlug = '',
}: ProductCardProps) {
  const [toast, setToast] = useState<ToastState>(null);

  const purchasable = canPurchase(product);
  const stockLabel = getStockLabel(product);
  const hasStoreSlug = Boolean(storeSlug);
  const productHref = hasStoreSlug ? `/${storeSlug}/producto/${product.slug}` : '#';

  function showToast(message: string, tone: 'success' | 'error' | 'info') {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 1800);
  }

  const stockBadgeClass =
    stockLabel === 'Sin stock' || stockLabel === 'No disponible'
      ? 'border-red-200 bg-red-50 text-red-700'
      : stockLabel === 'Últimas unidades'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : stockLabel === 'Disponible por encargo'
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-green-200 bg-green-50 text-green-700';

  return (
    <>
      <article className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-md">
        <Link href={productHref} className="block">
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
        </Link>

        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <Link href={productHref} className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight text-gray-900 hover:underline">
                {product.name}
              </h2>
            </Link>

            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${stockBadgeClass}`}
            >
              {stockLabel}
            </span>
          </div>

          <p className="text-xl font-bold text-gray-900">
            ${Number(product.price).toLocaleString('es-AR')}
          </p>

          {product.description ? (
            <p className="line-clamp-3 text-sm leading-5 text-gray-600">
              {product.description}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Link
              href={productHref}
              className="flex-1 rounded-2xl border px-4 py-3 text-center text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Ver detalle
            </Link>

            {hasStoreSlug ? (
              <div className="flex-1">
                <AddToCartButton
                  storeSlug={storeSlug}
                  product={{
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    image_url: product.image_url ?? null,
                    quantity: 1,
                    is_active: product.is_active ?? true,
                    track_stock: product.track_stock ?? false,
                    stock_quantity: product.stock_quantity ?? 0,
                    allow_backorder: product.allow_backorder ?? false,
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                disabled
                onClick={() =>
                  showToast('No se pudo identificar la tienda.', 'error')
                }
                className="flex-1 cursor-not-allowed rounded-2xl bg-gray-200 px-4 py-3 text-sm font-semibold text-gray-500"
              >
                Agregar
              </button>
            )}
          </div>

          {!purchasable ? (
            <p className="text-xs text-red-600">
              Este producto no tiene stock en este momento.
            </p>
          ) : null}
        </div>
      </article>

      {toast ? <StoreToast message={toast.message} tone={toast.tone} /> : null}
    </>
  );
}
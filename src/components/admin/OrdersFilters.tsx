'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in_preparation', label: 'En preparación' },
  { value: 'ready', label: 'Listo' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function OrdersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') ?? 'all';
  const currentQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(currentQuery);

  const hasFilters = useMemo(() => {
    return currentStatus !== 'all' || currentQuery.trim() !== '';
  }, [currentStatus, currentQuery]);

  function updateParams(next: { status?: string; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.status !== undefined) {
      if (!next.status || next.status === 'all') {
        params.delete('status');
      } else {
        params.set('status', next.status);
      }
    }

    if (next.q !== undefined) {
      const trimmed = next.q.trim();

      if (!trimmed) {
        params.delete('q');
      } else {
        params.set('q', trimmed);
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateParams({ q: query });
  }

  function handleClear() {
    setQuery('');
    router.push(pathname);
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filtrar pedidos</h2>
        <p className="text-sm text-gray-500">
          Buscá por nombre, teléfono o número de pedido.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
        <div>
          <label
            htmlFor="status"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Estado
          </label>

          <select
            id="status"
            value={currentStatus}
            onChange={(e) => updateParams({ status: e.target.value })}
            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit} className="min-w-0">
          <label
            htmlFor="q"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Buscar
          </label>

          <div className="flex gap-2">
            <input
              id="q"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: Juan, 1133445566 o 1024"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black"
            />

            <button
              type="submit"
              className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Buscar
            </button>
          </div>
        </form>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasFilters}
            className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpiar
          </button>
        </div>
      </div>
    </section>
  );
}
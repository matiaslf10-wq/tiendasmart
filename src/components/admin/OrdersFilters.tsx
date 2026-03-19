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

const DELIVERY_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'delivery', label: 'Envío' },
  { value: 'pickup', label: 'Retiro' },
];

const NOTES_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'with_notes', label: 'Con observaciones' },
];

export default function OrdersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') ?? 'all';
  const currentQuery = searchParams.get('q') ?? '';
  const currentDelivery = searchParams.get('delivery') ?? 'all';
  const currentNotes = searchParams.get('notes') ?? 'all';

  const [query, setQuery] = useState(currentQuery);

  const hasFilters = useMemo(() => {
    return (
      currentStatus !== 'all' ||
      currentDelivery !== 'all' ||
      currentNotes !== 'all' ||
      currentQuery.trim() !== ''
    );
  }, [currentStatus, currentDelivery, currentNotes, currentQuery]);

  function updateParams(next: {
    status?: string;
    q?: string;
    delivery?: string;
    notes?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.status !== undefined) {
      if (!next.status || next.status === 'all') {
        params.delete('status');
      } else {
        params.set('status', next.status);
      }
    }

    if (next.delivery !== undefined) {
      if (!next.delivery || next.delivery === 'all') {
        params.delete('delivery');
      } else {
        params.set('delivery', next.delivery);
      }
    }

    if (next.notes !== undefined) {
      if (!next.notes || next.notes === 'all') {
        params.delete('notes');
      } else {
        params.set('notes', next.notes);
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
          Buscá por nombre, teléfono, número de pedido o dirección.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
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

          <div>
            <label
              htmlFor="delivery"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Entrega
            </label>
            <select
              id="delivery"
              value={currentDelivery}
              onChange={(e) => updateParams({ delivery: e.target.value })}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black"
            >
              {DELIVERY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Observaciones
            </label>
            <select
              id="notes"
              value={currentNotes}
              onChange={(e) => updateParams({ notes: e.target.value })}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black"
            >
              {NOTES_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="q"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Buscar
            </label>
            <input
              id="q"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: Juan, 1133445566, 1024 o dirección"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black"
            />
          </div>

          <div className="flex gap-3 md:shrink-0">
            <button
              type="submit"
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Buscar
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={!hasFilters}
              className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpiar filtros
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
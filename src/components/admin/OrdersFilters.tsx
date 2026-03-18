'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const statuses = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'in_preparation', label: 'En preparación' },
  { value: 'ready', label: 'Listos' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
];

export default function OrdersFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('status') || 'all';

  function handleFilter(status: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }

    router.push(`/admin/pedidos?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
        <button
          key={status.value}
          onClick={() => handleFilter(status.value)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            current === status.value
              ? 'bg-black text-white'
              : 'border text-gray-700 hover:bg-gray-50'
          }`}
        >
          {status.label}
        </button>
      ))}
    </div>
  );
}
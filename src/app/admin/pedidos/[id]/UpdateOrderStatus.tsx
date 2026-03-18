'use client';

import { useState, useTransition } from 'react';
import { updateOrderStatus } from '@/app/actions/updateOrderStatus';

type Props = {
  orderId: string;
  currentStatus: string;
};

const STATUSES = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in_preparation', label: 'En preparación' },
  { value: 'ready', label: 'Listo' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];

function getButtonClasses(status: string, currentStatus: string) {
  const isActive = status === currentStatus;

  if (isActive) {
    return 'bg-black text-white border-black';
  }

  switch (status) {
    case 'pending':
      return 'border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100';
    case 'confirmed':
      return 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100';
    case 'in_preparation':
      return 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100';
    case 'ready':
      return 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100';
    case 'delivered':
      return 'border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100';
    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100';
    default:
      return 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
  }
}

export default function UpdateOrderStatus({
  orderId,
  currentStatus,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleChange(status: string) {
    if (status === currentStatus) return;

    setMessage(null);

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);

      if (!result.success) {
        setMessage(result.error ?? 'No se pudo actualizar el estado.');
        return;
      }

      setMessage('Estado actualizado.');
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() => handleChange(status.value)}
            disabled={isPending || status.value === currentStatus}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClasses(
              status.value,
              currentStatus
            )}`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {message ? <p className="text-sm text-gray-500">{message}</p> : null}
    </div>
  );
}
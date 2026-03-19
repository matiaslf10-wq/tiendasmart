'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatus } from '@/app/actions/updateOrderStatus';

type Props = {
  orderId: string;
  currentStatus: string;
};

const QUICK_ACTIONS_BY_STATUS: Record<
  string,
  Array<{ value: string; label: string }>
> = {
  pending: [
    { value: 'confirmed', label: 'Confirmar' },
    { value: 'cancelled', label: 'Cancelar' },
  ],
  confirmed: [
    { value: 'in_preparation', label: 'Preparar' },
    { value: 'cancelled', label: 'Cancelar' },
  ],
  in_preparation: [
    { value: 'ready', label: 'Marcar listo' },
    { value: 'cancelled', label: 'Cancelar' },
  ],
  ready: [{ value: 'delivered', label: 'Entregar' }],
  delivered: [],
  cancelled: [],
};

function getButtonClass(status: string) {
  switch (status) {
    case 'confirmed':
      return 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100';
    case 'in_preparation':
      return 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100';
    case 'ready':
      return 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100';
    case 'delivered':
      return 'border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200';
    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100';
    default:
      return 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
  }
}

export default function OrderQuickActions({
  orderId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(currentStatus);

  const actions = QUICK_ACTIONS_BY_STATUS[localStatus] ?? [];

  function handleUpdate(nextStatus: string) {
    if (nextStatus === localStatus) return;

    setMessage(null);

    startTransition(async () => {
      const previousStatus = localStatus;
      setLocalStatus(nextStatus);

      const result = await updateOrderStatus(orderId, nextStatus);

      if (!result.success) {
        setLocalStatus(previousStatus);
        setMessage(result.error ?? 'No se pudo actualizar el estado.');
        return;
      }

      setMessage('Estado actualizado.');
      router.refresh();
    });
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.value}
            type="button"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUpdate(action.value);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClass(
              action.value
            )}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {message ? <p className="text-xs text-gray-500">{message}</p> : null}
    </div>
  );
}
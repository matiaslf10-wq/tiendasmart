'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatus } from '@/app/actions/updateOrderStatus';

type Props = {
  orderId: string;
  currentStatus: string;
};

const VALID_STATUSES = [
  'pending',
  'confirmed',
  'in_preparation',
  'ready',
  'delivered',
  'cancelled',
] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_preparation: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_preparation', 'cancelled'],
  in_preparation: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

function getButtonClasses(status: OrderStatus, currentStatus: OrderStatus) {
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

function isValidStatus(status: string): status is OrderStatus {
  return VALID_STATUSES.includes(status as OrderStatus);
}

export default function UpdateOrderStatus({
  orderId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | null>(null);
  const [localStatus, setLocalStatus] = useState(currentStatus);

  if (!isValidStatus(localStatus)) {
    return (
      <p className="text-sm text-red-600">
        El estado actual del pedido no es válido.
      </p>
    );
  }

  const allowedNextStatuses = ALLOWED_TRANSITIONS[localStatus];

  function handleChange(nextStatus: OrderStatus) {
    if (nextStatus === localStatus) return;

    setMessage(null);
    setTone(null);

    startTransition(async () => {
      const previousStatus = localStatus;

      setLocalStatus(nextStatus);

      const result = await updateOrderStatus(orderId, nextStatus);

      if (!result.success) {
        setLocalStatus(previousStatus);
        setTone('error');
        setMessage(result.error ?? 'No se pudo actualizar el estado.');
        return;
      }

      setTone('success');
      setMessage(`Estado actualizado a "${STATUS_LABELS[nextStatus]}".`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Estado actual: <strong>{STATUS_LABELS[localStatus]}</strong>
      </p>

      {allowedNextStatuses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {allowedNextStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleChange(status)}
              disabled={isPending}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClasses(
                status,
                localStatus
              )}`}
            >
              {isPending ? 'Actualizando...' : `Marcar como ${STATUS_LABELS[status]}`}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Este pedido ya no tiene más cambios de estado disponibles.
        </p>
      )}

      {message ? (
        <p
          className={`text-sm ${
            tone === 'error' ? 'text-red-600' : 'text-gray-600'
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
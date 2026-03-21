'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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

const QUICK_ACTIONS_BY_STATUS: Record<
  OrderStatus,
  Array<{ value: OrderStatus; label: string }>
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
  ready: [
    { value: 'delivered', label: 'Entregar' },
    { value: 'cancelled', label: 'Cancelar' },
  ],
  delivered: [],
  cancelled: [],
};

function isValidStatus(status: string): status is OrderStatus {
  return VALID_STATUSES.includes(status as OrderStatus);
}

function getButtonClass(status: OrderStatus) {
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
    case 'pending':
    default:
      return 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
  }
}

function getSuccessMessage(status: OrderStatus) {
  switch (status) {
    case 'confirmed':
      return 'Pedido confirmado.';
    case 'in_preparation':
      return 'Pedido en preparación.';
    case 'ready':
      return 'Pedido marcado como listo.';
    case 'delivered':
      return 'Pedido entregado.';
    case 'cancelled':
      return 'Pedido cancelado.';
    default:
      return 'Estado actualizado.';
  }
}

export default function OrderQuickActions({
  orderId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | null>(
    null
  );
  const [localStatus, setLocalStatus] = useState(currentStatus);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function showMessage(text: string, tone: 'success' | 'error') {
    setMessage(text);
    setMessageTone(tone);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      setMessageTone(null);
      timeoutRef.current = null;
    }, 2200);
  }

  if (!isValidStatus(localStatus)) {
    return (
      <p className="text-xs text-red-500">
        El estado actual del pedido no es válido.
      </p>
    );
  }

  const actions = QUICK_ACTIONS_BY_STATUS[localStatus] ?? [];

  async function handleUpdate(nextStatus: OrderStatus) {
    if (nextStatus === localStatus) return;

    setMessage(null);
    setMessageTone(null);

    startTransition(async () => {
      const previousStatus = localStatus;
      setLocalStatus(nextStatus);

      const result = await updateOrderStatus(orderId, nextStatus);

      if (!result.success) {
        setLocalStatus(previousStatus);
        showMessage(result.error ?? 'No se pudo actualizar el estado.', 'error');
        return;
      }

      showMessage(getSuccessMessage(nextStatus), 'success');
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
              void handleUpdate(action.value);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClass(
              action.value
            )}`}
          >
            {isPending ? 'Actualizando...' : action.label}
          </button>
        ))}
      </div>

      {message ? (
        <p
          className={`text-xs ${
            messageTone === 'error' ? 'text-red-500' : 'text-gray-500'
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
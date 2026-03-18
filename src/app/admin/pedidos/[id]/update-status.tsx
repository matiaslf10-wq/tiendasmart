'use client';

import { useTransition } from 'react';
import { updateOrderStatus } from '@/app/actions/updateOrderStatus';

type Props = {
  orderId: string;
  currentStatus: string;
};

const statuses = [
  'pending',
  'confirmed',
  'in_preparation',
  'ready',
  'delivered',
  'cancelled',
];

export default function UpdateOrderStatus({
  orderId,
  currentStatus,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleChange(status: string) {
    startTransition(async () => {
      await updateOrderStatus(orderId, status);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
        <button
          key={status}
          onClick={() => handleChange(status)}
          disabled={isPending || status === currentStatus}
          className={`rounded-xl px-3 py-2 text-sm ${
            status === currentStatus
              ? 'bg-black text-white'
              : 'border'
          }`}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
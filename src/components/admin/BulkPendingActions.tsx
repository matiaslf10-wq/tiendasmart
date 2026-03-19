'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bulkUpdateOrdersStatus } from '@/app/actions/bulkUpdateOrdersStatus';

type Props = {
  pendingOrderIds: string[];
};

export default function BulkPendingActions({ pendingOrderIds }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const totalPending = useMemo(() => pendingOrderIds.length, [pendingOrderIds]);

  function showMessage(text: string, nextTone: 'success' | 'error') {
    setMessage(text);
    setTone(nextTone);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      setTone(null);
      timeoutRef.current = null;
    }, 2600);
  }

  function handleBulkUpdate(nextStatus: 'confirmed' | 'cancelled') {
    if (totalPending === 0) return;

    startTransition(async () => {
      const result = await bulkUpdateOrdersStatus(pendingOrderIds, nextStatus);

      if (!result.success) {
        showMessage(result.error ?? 'No se pudo completar la acción.', 'error');
        return;
      }

      const actionLabel =
        nextStatus === 'confirmed' ? 'confirmados' : 'cancelados';

      showMessage(
        `${result.updatedCount ?? 0} pedido(s) ${actionLabel}.`,
        'success'
      );
      router.refresh();
    });
  }

  if (totalPending === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-yellow-900">
            Acciones masivas sobre pendientes visibles
          </p>
          <p className="text-sm text-yellow-800">
            Hay {totalPending} pedido(s) pendiente(s) en la vista actual.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleBulkUpdate('confirmed')}
            disabled={isPending}
            className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Procesando...' : 'Confirmar pendientes visibles'}
          </button>

          <button
            type="button"
            onClick={() => handleBulkUpdate('cancelled')}
            disabled={isPending}
            className="rounded-2xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Procesando...' : 'Cancelar pendientes visibles'}
          </button>
        </div>
      </div>

      {message ? (
        <p
          className={`mt-3 text-sm ${
            tone === 'error' ? 'text-red-600' : 'text-yellow-900'
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
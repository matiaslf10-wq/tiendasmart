'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = {
  storeId: string;
};

type RealtimeOrderRow = {
  id: string;
  store_id: string;
  order_number: number | null;
  customer_name: string | null;
  status: string | null;
};

export default function OrdersRealtimeListener({ storeId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const hasMountedRef = useRef(false);
  const lastEventRef = useRef<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-orders-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const newOrder = payload.new as RealtimeOrderRow;
          const eventKey = `insert-${newOrder.id}`;

          if (lastEventRef.current === eventKey) return;
          lastEventRef.current = eventKey;

          if (hasMountedRef.current) {
            setMessage(
              `Nuevo pedido${newOrder.order_number ? ` #${newOrder.order_number}` : ''}`
            );

            try {
              const audio = new Audio('/sounds/new-order.mp3');
              audio.play().catch(() => {});
            } catch {
              // no-op
            }
          }

          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as RealtimeOrderRow;
          const eventKey = `update-${updatedOrder.id}-${updatedOrder.status}`;

          if (lastEventRef.current === eventKey) return;
          lastEventRef.current = eventKey;

          if (hasMountedRef.current) {
            setMessage(
              `Pedido${updatedOrder.order_number ? ` #${updatedOrder.order_number}` : ''} actualizado`
            );
          }

          router.refresh();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          hasMountedRef.current = true;
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, storeId, supabase]);

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-medium text-gray-900">{message}</p>
    </div>
  );
}
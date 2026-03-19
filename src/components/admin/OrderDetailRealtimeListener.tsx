'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = {
  storeId: string;
  orderId: string;
};

type RealtimeOrderRow = {
  id: string;
  store_id: string;
  status: string | null;
};

export default function OrderDetailRealtimeListener({
  storeId,
  orderId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const lastEventRef = useRef<string | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-order-detail-${storeId}-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as RealtimeOrderRow;
          const eventKey = `update-${updatedOrder.id}-${updatedOrder.status}`;

          if (lastEventRef.current === eventKey) return;
          lastEventRef.current = eventKey;

          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, router, storeId, supabase]);

  return null;
}
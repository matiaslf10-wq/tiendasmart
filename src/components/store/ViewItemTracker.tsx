'use client';

import { useEffect, useRef } from 'react';
import { trackViewItem, type GAItem } from '@/lib/ga';
import { trackStoreEvent } from '@/lib/analytics-events';

type ViewItemTrackerProps = {
  storeSlug: string;
  item: GAItem & {
    id?: string;
  };
};

export default function ViewItemTracker({
  storeSlug,
  item,
}: ViewItemTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;

    // seguridad extra: evitar disparar sin datos mínimos
    if (!item?.item_id || !item?.item_name) return;

    trackedRef.current = true;

    // GA4
    trackViewItem(item);

    // tracking propio
    void trackStoreEvent({
      storeSlug,
      eventName: 'view_item',
      productId: item.id ?? item.item_id ?? null,
      metadata: {
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price ?? 0,
        item_category: item.item_category ?? null,
      },
    });
  }, [
    storeSlug,
    item.item_id,
    item.item_name,
    item.price,
    item.item_category,
  ]);

  return null;
}
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
    trackedRef.current = true;

    trackViewItem(item);

    void trackStoreEvent({
      storeSlug,
      eventName: 'view_item',
      productId: item.id ?? item.item_id ?? null,
      metadata: {
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price ?? 0,
      },
    });
  }, [storeSlug, item]);

  return null;
}
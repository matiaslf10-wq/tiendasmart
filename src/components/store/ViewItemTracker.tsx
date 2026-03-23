'use client';

import { useEffect, useRef } from 'react';
import { trackViewItem } from '@/lib/ga';

type Props = {
  item: {
    id: string;
    name: string;
    price: number;
    categoryName?: string | null;
  };
};

export default function ViewItemTracker({ item }: Props) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;

    trackViewItem({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: 1,
      item_category: item.categoryName ?? undefined,
    });

    trackedRef.current = true;
  }, [item]);

  return null;
}
'use client';

import { useEffect } from 'react';
import { persistAttribution } from '@/lib/analytics-source';

type Props = {
  storeSlug: string;
};

export default function AttributionTracker({ storeSlug }: Props) {
  useEffect(() => {
    persistAttribution(storeSlug);
  }, [storeSlug]);

  return null;
}
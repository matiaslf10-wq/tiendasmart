'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackStoreEvent } from '@/lib/analytics-events';
import { persistAttribution } from '@/lib/analytics-source';

type Props = {
  storeSlug: string;
};

export default function AttributionTracker({ storeSlug }: Props) {
  const pathname=usePathname();
  const last=useRef<string | null>(null);
  useEffect(() => {
    persistAttribution(storeSlug);
    if(last.current===pathname)return;
    last.current=pathname;
    void trackStoreEvent({storeSlug,eventName:"page_view",metadata:{path:pathname}});
  }, [storeSlug,pathname]);

  return null;
}
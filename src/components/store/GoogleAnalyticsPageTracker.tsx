'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/ga';

type Props = {
  measurementId: string;
};

export default function GoogleAnalyticsPageTracker({ measurementId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId) return;

    const queryString = searchParams.toString();
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname;

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('config', measurementId, {
        page_path: pagePath,
      });
    }
  }, [measurementId, pathname, searchParams]);

  return null;
}
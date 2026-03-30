'use client';

import { useEffect } from 'react';
import { persistAttribution } from '@/lib/analytics-source';

export default function AttributionTracker() {
  useEffect(() => {
    persistAttribution();
  }, []);

  return null;
}
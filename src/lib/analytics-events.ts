import { getStoredAttribution } from '@/lib/analytics-source';

type TrackStoreEventParams = {
  storeSlug: string;
  eventName: string;
  productId?: string;
  metadata?: Record<string, unknown>;
};

export async function trackStoreEvent(params: TrackStoreEventParams) {
  try {
    const attribution =
      typeof window !== 'undefined'
        ? getStoredAttribution(params.storeSlug)
        : { source: 'direct' };

    const body = JSON.stringify({
      storeSlug: params.storeSlug,
      eventName: params.eventName,
      productId: params.productId,
      metadata: {
        ...(params.metadata ?? {}),
        traffic_source: attribution.source,
        traffic_medium: attribution.medium,
        traffic_campaign: attribution.campaign,
        traffic_referrer: attribution.referrer,
        landing_path: attribution.landingPath,
        traffic_ts_link: attribution.tsLink,
      },
    });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/public/analytics/event', blob);
      return;
    }

    await fetch('/api/public/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch (error) {
    console.error('trackStoreEvent error', error);
  }
}
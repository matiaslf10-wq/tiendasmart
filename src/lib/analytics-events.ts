type AnalyticsEventPayload = {
  storeSlug: string;
  eventName:
    | 'view_item'
    | 'add_to_cart'
    | 'begin_checkout'
    | 'send_to_whatsapp';
  productId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function trackStoreEvent(payload: AnalyticsEventPayload) {
  try {
    await fetch('/api/public/analytics/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // no-op
  }
}
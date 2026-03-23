export type GAItem = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_category?: string;
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function canTrack() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (!canTrack()) return;

  window.gtag?.('event', eventName, params ?? {});
}

export function trackAddToCart(item: GAItem) {
  trackEvent('add_to_cart', {
    currency: 'ARS',
    value: (item.price ?? 0) * (item.quantity ?? 1),
    items: [item],
  });
}

export function trackViewCart(items: GAItem[]) {
  const value = items.reduce(
    (acc, item) => acc + (item.price ?? 0) * (item.quantity ?? 1),
    0
  );

  trackEvent('view_cart', {
    currency: 'ARS',
    value,
    items,
  });
}

export function trackBeginCheckout(items: GAItem[]) {
  const value = items.reduce(
    (acc, item) => acc + (item.price ?? 0) * (item.quantity ?? 1),
    0
  );

  trackEvent('begin_checkout', {
    currency: 'ARS',
    value,
    items,
  });
}
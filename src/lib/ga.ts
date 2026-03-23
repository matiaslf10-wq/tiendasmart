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

export function trackViewItem(item: GAItem) {
  trackEvent('view_item', {
    currency: 'ARS',
    value: item.price ?? 0,
    items: [item],
  });
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

export function trackPurchase(params: {
  transactionId: string | number;
  items: GAItem[];
  shipping?: number;
  tax?: number;
}) {
  const { transactionId, items, shipping = 0, tax = 0 } = params;

  const itemsValue = items.reduce(
    (acc, item) => acc + (item.price ?? 0) * (item.quantity ?? 1),
    0
  );

  trackEvent('purchase', {
    transaction_id: String(transactionId),
    currency: 'ARS',
    value: itemsValue + shipping + tax,
    shipping,
    tax,
    items,
  });
}

export function trackContactWhatsApp(params: {
  source: 'product' | 'cart' | 'store';
  item?: GAItem;
  store_slug?: string;
}) {
  trackEvent('contact_whatsapp', {
    source: params.source,
    store_slug: params.store_slug,
    items: params.item ? [params.item] : undefined,
  });
}

export function trackSendToWhatsApp(params: {
  transactionId?: string | number;
  items: GAItem[];
  store_slug?: string;
}) {
  const value = params.items.reduce(
    (acc, item) => acc + (item.price ?? 0) * (item.quantity ?? 1),
    0
  );

  trackEvent('send_to_whatsapp', {
    transaction_id: params.transactionId ? String(params.transactionId) : undefined,
    currency: 'ARS',
    value,
    store_slug: params.store_slug,
    items: params.items,
  });
}
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
    product_id: item.item_id,
    product_name: item.item_name,
    items: [item],
  });
}

export function trackAddToCart(item: GAItem) {
  trackEvent('add_to_cart', {
    currency: 'ARS',
    value: (item.price ?? 0) * (item.quantity ?? 1),
    product_id: item.item_id,
    product_name: item.item_name,
    items: [item],
  });
}

export function trackViewCart(items: GAItem[]) {
  const value = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
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
    (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
    0
  );

  trackEvent('begin_checkout', {
    currency: 'ARS',
    value,
    items,
  });
}

export function trackPurchase(params: {
  orderNumber: string | number;
  items: GAItem[];
  value?: number;
}) {
  const value =
    params.value ??
    params.items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );

  trackEvent('purchase', {
    transaction_id: String(params.orderNumber),
    currency: 'ARS',
    value,
    items: params.items,
  });
}

export function trackSendToWhatsApp(params: {
  orderNumber?: string | number | null;
  items: GAItem[];
  value?: number;
}) {
  const value =
    params.value ??
    params.items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );

  trackEvent('send_to_whatsapp', {
    currency: 'ARS',
    value,
    order_number: params.orderNumber ? String(params.orderNumber) : undefined,
    items: params.items,
  });
}

export function trackContactWhatsApp(params?: {
  productId?: string;
  productName?: string;
  source?: string;
  store_slug?: string;
  item?: GAItem;
}) {
  const item = params?.item;

  trackEvent('contact_whatsapp', {
    source: params?.source,
    store_slug: params?.store_slug,
    product_id: params?.productId ?? item?.item_id,
    product_name: params?.productName ?? item?.item_name,
    items: item ? [item] : undefined,
  });
}
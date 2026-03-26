export type GAItem = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_category?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function canTrack() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQuantity(quantity: number | string | null | undefined) {
  const parsed = Number(quantity ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getItemsValue(items: GAItem[]) {
  return items.reduce((acc, item) => {
    return acc + toNumber(item.price) * normalizeQuantity(item.quantity);
  }, 0);
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
    value: toNumber(item.price),
    items: [
      {
        ...item,
        price: toNumber(item.price),
        quantity: normalizeQuantity(item.quantity),
      },
    ],
  });
}

export function trackAddToCart(item: GAItem) {
  const normalizedItem = {
    ...item,
    price: toNumber(item.price),
    quantity: normalizeQuantity(item.quantity),
  };

  trackEvent('add_to_cart', {
    currency: 'ARS',
    value: normalizedItem.price * normalizedItem.quantity,
    items: [normalizedItem],
  });
}

export function trackViewCart(items: GAItem[]) {
  const normalizedItems = items.map((item) => ({
    ...item,
    price: toNumber(item.price),
    quantity: normalizeQuantity(item.quantity),
  }));

  trackEvent('view_cart', {
    currency: 'ARS',
    value: getItemsValue(normalizedItems),
    items: normalizedItems,
  });
}

export function trackBeginCheckout(items: GAItem[]) {
  const normalizedItems = items.map((item) => ({
    ...item,
    price: toNumber(item.price),
    quantity: normalizeQuantity(item.quantity),
  }));

  trackEvent('begin_checkout', {
    currency: 'ARS',
    value: getItemsValue(normalizedItems),
    items: normalizedItems,
  });
}

export function trackPurchase(params: {
  transactionId: string | number;
  items: GAItem[];
  shipping?: number;
  tax?: number;
}) {
  const { transactionId, items, shipping = 0, tax = 0 } = params;

  const normalizedItems = items.map((item) => ({
    ...item,
    price: toNumber(item.price),
    quantity: normalizeQuantity(item.quantity),
  }));

  const itemsValue = getItemsValue(normalizedItems);

  trackEvent('purchase', {
    transaction_id: String(transactionId),
    currency: 'ARS',
    value: itemsValue + toNumber(shipping) + toNumber(tax),
    shipping: toNumber(shipping),
    tax: toNumber(tax),
    items: normalizedItems,
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
    items: params.item
      ? [
          {
            ...params.item,
            price: toNumber(params.item.price),
            quantity: normalizeQuantity(params.item.quantity),
          },
        ]
      : undefined,
  });
}

export function trackSendToWhatsApp(params: {
  transactionId?: string | number;
  items: GAItem[];
  store_slug?: string;
}) {
  const normalizedItems = params.items.map((item) => ({
    ...item,
    price: toNumber(item.price),
    quantity: normalizeQuantity(item.quantity),
  }));

  trackEvent('send_to_whatsapp', {
    transaction_id: params.transactionId
      ? String(params.transactionId)
      : undefined,
    currency: 'ARS',
    value: getItemsValue(normalizedItems),
    store_slug: params.store_slug,
    items: normalizedItems,
  });
}
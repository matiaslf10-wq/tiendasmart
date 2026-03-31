import { getStoredAttribution } from '@/lib/analytics-source';

export type GAItem = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_category?: string;
};

export type GAEventName =
  | 'view_item'
  | 'add_to_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'send_to_whatsapp'
  | 'contact_whatsapp';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function canTrack() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

function getAttributionParams(storeSlug?: string) {
  if (!storeSlug || typeof window === 'undefined') {
    return {};
  }

  const attribution = getStoredAttribution(storeSlug);

  return {
    traffic_source: attribution.source,
    traffic_medium: attribution.medium,
    traffic_campaign: attribution.campaign,
    traffic_referrer: attribution.referrer,
    landing_path: attribution.landingPath,
    traffic_ts_link: attribution.tsLink,
  };
}

export function trackEvent(
  eventName: GAEventName,
  params?: Record<string, unknown>,
  storeSlug?: string
) {
  if (!canTrack()) return;

  window.gtag?.('event', eventName, {
    ...(params ?? {}),
    ...getAttributionParams(storeSlug),
  });
}

export function trackViewItem(item: GAItem, storeSlug?: string) {
  trackEvent(
    'view_item',
    {
      currency: 'ARS',
      value: item.price ?? 0,
      product_id: item.item_id,
      product_name: item.item_name,
      items: [item],
    },
    storeSlug
  );
}

export function trackAddToCart(item: GAItem, storeSlug?: string) {
  trackEvent(
    'add_to_cart',
    {
      currency: 'ARS',
      value: (item.price ?? 0) * (item.quantity ?? 1),
      product_id: item.item_id,
      product_name: item.item_name,
      items: [item],
    },
    storeSlug
  );
}

export function trackViewCart(items: GAItem[], storeSlug?: string) {
  const value = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
    0
  );

  trackEvent(
    'view_cart',
    {
      currency: 'ARS',
      value,
      items,
    },
    storeSlug
  );
}

export function trackBeginCheckout(items: GAItem[], storeSlug?: string) {
  const value = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
    0
  );

  trackEvent(
    'begin_checkout',
    {
      currency: 'ARS',
      value,
      items,
    },
    storeSlug
  );
}

export function trackPurchase(params: {
  orderNumber?: string | number | null;
  transactionId?: string | number | null;
  items: GAItem[];
  value?: number;
  store_slug?: string;
  shipping?: number;
  tax?: number;
  coupon?: string;
}) {
  const value =
    params.value ??
    params.items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );

  trackEvent(
    'purchase',
    {
      transaction_id:
        params.transactionId != null
          ? String(params.transactionId)
          : params.orderNumber != null
            ? String(params.orderNumber)
            : undefined,
      currency: 'ARS',
      value,
      shipping: params.shipping,
      tax: params.tax,
      coupon: params.coupon,
      store_slug: params.store_slug,
      items: params.items,
    },
    params.store_slug
  );
}

export function trackSendToWhatsApp(params: {
  orderNumber?: string | number | null;
  transactionId?: string | number | null;
  items: GAItem[];
  value?: number;
  store_slug?: string;
  shipping?: number;
  tax?: number;
  coupon?: string;
}) {
  const value =
    params.value ??
    params.items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );

  trackEvent(
    'send_to_whatsapp',
    {
      currency: 'ARS',
      value,
      transaction_id:
        params.transactionId != null
          ? String(params.transactionId)
          : params.orderNumber != null
            ? String(params.orderNumber)
            : undefined,
      order_number:
        params.orderNumber != null ? String(params.orderNumber) : undefined,
      shipping: params.shipping,
      tax: params.tax,
      coupon: params.coupon,
      store_slug: params.store_slug,
      items: params.items,
    },
    params.store_slug
  );
}

export function trackContactWhatsApp(params?: {
  productId?: string;
  productName?: string;
  source?: 'product' | 'store';
  store_slug?: string;
  item?: GAItem;
}) {
  const item = params?.item;

  trackEvent(
    'contact_whatsapp',
    {
      source: params?.source,
      store_slug: params?.store_slug,
      product_id: params?.productId ?? item?.item_id,
      product_name: params?.productName ?? item?.item_name,
      items: item ? [item] : undefined,
    },
    params?.store_slug
  );
}
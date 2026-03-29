export type FunnelDailyPoint = {
  date: string;
  views: number;
  addToCart: number;
  checkout: number;
  whatsapp: number;
  contactWhatsapp: number;
  purchases: number;
};

type AnalyticsEventRow = {
  event_name: string;
  created_at: string;
};

type OrderRow = {
  created_at: string;
};

function toDateKey(value: string) {
  return value.slice(0, 10);
}

function createEmptyPoint(date: string): FunnelDailyPoint {
  return {
    date,
    views: 0,
    addToCart: 0,
    checkout: 0,
    whatsapp: 0,
    contactWhatsapp: 0,
    purchases: 0,
  };
}

export function buildFunnelDailySeries(params: {
  analyticsEvents: AnalyticsEventRow[];
  orders: OrderRow[];
}): FunnelDailyPoint[] {
  const map = new Map<string, FunnelDailyPoint>();

  for (const event of params.analyticsEvents) {
    const date = toDateKey(event.created_at);
    const current = map.get(date) ?? createEmptyPoint(date);

    if (event.event_name === 'view_item') current.views += 1;
    if (event.event_name === 'add_to_cart') current.addToCart += 1;
    if (event.event_name === 'begin_checkout') current.checkout += 1;
    if (event.event_name === 'send_to_whatsapp') current.whatsapp += 1;
    if (event.event_name === 'contact_whatsapp') current.contactWhatsapp += 1;

    map.set(date, current);
  }

  for (const order of params.orders) {
    const date = toDateKey(order.created_at);
    const current = map.get(date) ?? createEmptyPoint(date);
    current.purchases += 1;
    map.set(date, current);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
export type RangeValue = 'today' | '7d' | '30d' | 'month' | 'all';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | string;

export type Order = {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  total: number | string | null;
  status: OrderStatus;
  notes: string | null;
  delivery_type: string | null;
  delivery_address: string | null;
  created_at: string;
};

export type OrderItemRow = {
  product_id?: string | null;
  product_name: string | null;
  quantity: number | string | null;
  line_total: number | string | null;
  orders: {
    created_at: string;
    store_id: string;
    status?: string;
  } | null;
};

export type ComparisonMetric = {
  current: number;
  previous: number;
  diff: number;
  diffPercent: number | null;
  trend: 'up' | 'down' | 'flat';
};

export type OrdersPeriodComparison = {
  revenue: ComparisonMetric;
  orders: ComparisonMetric;
  averageTicket: ComparisonMetric;
  unitsSold: ComparisonMetric;
};

// Argentina uses UTC-03. Build boundaries explicitly, independently of server TZ.
const AR_OFFSET = 3 * 60 * 60 * 1000;
function arParts(date: Date) {
  const shifted = new Date(date.getTime() - AR_OFFSET);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}
function arMidnight(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, 3));
}
export function argentinaDateKey(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const { year, month, day } = arParts(date);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function normalizeOrderItem<T extends { orders: unknown }>(item: T) {
  return { ...item, orders: (Array.isArray(item.orders) ? item.orders[0] : item.orders) ?? null };
}
export function normalizeOrderStatus(status: string | null | undefined): string {
  const value = (status ?? '').toLowerCase().trim();

  if (value === 'in_preparation') return 'preparing';
  return value;
}

export function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isWithinRange(dateString: string, range: RangeValue): boolean {
  if (range === 'all') return true;

  const window = getRangeWindow(range);
  return isDateInWindow(dateString, window);
}

export function matchesSearch(order: Order, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  return (
    (order.customer_name ?? '').toLowerCase().includes(q) ||
    (order.customer_phone ?? '').toLowerCase().includes(q) ||
    String(order.order_number ?? '').toLowerCase().includes(q) ||
    (order.delivery_address ?? '').toLowerCase().includes(q) ||
    (order.notes ?? '').toLowerCase().includes(q)
  );
}

export function filterOrders(params: {
  orders: Order[];
  status: string;
  queryText: string;
  delivery: string;
  notes: string;
  range: RangeValue;
}) {
  const { orders, status, queryText, delivery, notes, range } = params;

  const normalizedStatusFilter = normalizeOrderStatus(status);

  const rangeFiltered = orders.filter((order) =>
    isWithinRange(order.created_at, range)
  );

  const statusFiltered =
    status !== 'all'
      ? rangeFiltered.filter(
          (order) =>
            normalizeOrderStatus(order.status) === normalizedStatusFilter
        )
      : rangeFiltered;

  const deliveryFiltered =
    delivery !== 'all'
      ? statusFiltered.filter((order) =>
          delivery === 'delivery'
            ? order.delivery_type === 'delivery'
            : order.delivery_type !== 'delivery'
        )
      : statusFiltered;

  const notesFiltered =
    notes === 'with_notes'
      ? deliveryFiltered.filter((order) => Boolean(order.notes?.trim()))
      : deliveryFiltered;

  const searched = queryText.trim()
    ? notesFiltered.filter((order) => matchesSearch(order, queryText))
    : notesFiltered;

  const visibleOrders = [...searched].sort((a, b) => {
    const aPending = normalizeOrderStatus(a.status) === 'pending' ? 1 : 0;
    const bPending = normalizeOrderStatus(b.status) === 'pending' ? 1 : 0;

    if (aPending !== bPending) return bPending - aPending;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    rangeFilteredOrders: rangeFiltered,
    visibleOrders,
    pendingOrdersCount: rangeFiltered.filter(
      (order) => normalizeOrderStatus(order.status) === 'pending'
    ).length,
  };
}

export function filterOrderItemsByRange(
  items: OrderItemRow[],
  range: RangeValue
): OrderItemRow[] {
  return items.filter((item) => {
    const createdAt = item.orders?.created_at;
    if (!createdAt) return false;
    return isWithinRange(createdAt, range);
  });
}

export function getRangeLabel(range: RangeValue): string {
  switch (range) {
    case 'today':
      return 'hoy';
    case '7d':
      return 'los últimos 7 días';
    case '30d':
      return 'los últimos 30 días';
    case 'month':
      return 'este mes';
    case 'all':
    default:
      return 'todo el historial';
  }
}

export function getRangeWindow(range: RangeValue, now = new Date()) {
  if (range === 'all') return null;
  const { year, month, day } = arParts(now);
  if (range === 'month') return { start: arMidnight(year, month, 1), end: arMidnight(year, month + 1, 1) };
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 1;
  return { start: arMidnight(year, month, day - days + 1), end: arMidnight(year, month, day + 1) };
}
export function getPreviousRangeWindow(range: RangeValue, now = new Date()) {
  const current = getRangeWindow(range, now);
  if (!current) return null;
  if (range === 'month') {
    const { year, month } = arParts(now);
    return { start: arMidnight(year, month - 1, 1), end: current.start };
  }
  return { start: new Date(current.start.getTime() - (current.end.getTime() - current.start.getTime())), end: current.start };
}

export function isDateInWindow(
  dateString: string,
  window: { start: Date; end: Date } | null
) {
  if (!window) return false;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  return date >= window.start && date < window.end;
}

export function filterOrdersByWindow(
  orders: Order[],
  window: { start: Date; end: Date } | null
) {
  if (!window) return [];
  return orders.filter((order) => isDateInWindow(order.created_at, window));
}

export function filterOrderItemsByWindow(
  items: OrderItemRow[],
  window: { start: Date; end: Date } | null
) {
  if (!window) return [];

  return items.filter((item) => {
    const createdAt = item.orders?.created_at;
    if (!createdAt) return false;

    return isDateInWindow(createdAt, window);
  });
}

function buildComparisonMetric(
  current: number,
  previous: number
): ComparisonMetric {
  const diff = current - previous;

  let diffPercent: number | null = null;

  if (previous === 0) {
    diffPercent = current === 0 ? 0 : null;
  } else {
    diffPercent = (diff / previous) * 100;
  }

  let trend: 'up' | 'down' | 'flat' = 'flat';

  if (diff > 0) trend = 'up';
  if (diff < 0) trend = 'down';

  return {
    current,
    previous,
    diff,
    diffPercent,
    trend,
  };
}

export function getOrdersComparison(
  orders: Order[],
  items: OrderItemRow[],
  range: RangeValue
): OrdersPeriodComparison | null {
  const currentWindow = getRangeWindow(range);
  const previousWindow = getPreviousRangeWindow(range);

  if (!currentWindow || !previousWindow) {
    return null;
  }

  const currentOrders = filterOrdersByWindow(orders, currentWindow);
  const previousOrders = filterOrdersByWindow(orders, previousWindow);

  const currentItems = filterOrderItemsByWindow(items, currentWindow);
  const previousItems = filterOrderItemsByWindow(items, previousWindow);

  const revenueOrders = currentOrders.filter(o => normalizeOrderStatus(o.status) !== 'cancelled');
  const previousRevenueOrders = previousOrders.filter(o => normalizeOrderStatus(o.status) !== 'cancelled');
  const currentRevenue = revenueOrders.reduce(
    (acc, order) => acc + toNumber(order.total),
    0
  );
  const previousRevenue = previousRevenueOrders.reduce(
    (acc, order) => acc + toNumber(order.total),
    0
  );

  const currentOrdersCount = currentOrders.length;
  const previousOrdersCount = previousOrders.length;

  const currentAverageTicket =
    revenueOrders.length > 0 ? currentRevenue / revenueOrders.length : 0;
  const previousAverageTicket =
    previousRevenueOrders.length > 0 ? previousRevenue / previousRevenueOrders.length : 0;

  const currentUnitsSold = currentItems.filter(i => normalizeOrderStatus(i.orders?.status) !== 'cancelled').reduce(
    (acc, item) => acc + toNumber(item.quantity),
    0
  );
  const previousUnitsSold = previousItems.filter(i => normalizeOrderStatus(i.orders?.status) !== 'cancelled').reduce(
    (acc, item) => acc + toNumber(item.quantity),
    0
  );

  return {
    revenue: buildComparisonMetric(currentRevenue, previousRevenue),
    orders: buildComparisonMetric(currentOrdersCount, previousOrdersCount),
    averageTicket: buildComparisonMetric(
      currentAverageTicket,
      previousAverageTicket
    ),
    unitsSold: buildComparisonMetric(currentUnitsSold, previousUnitsSold),
  };
}
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
  product_name: string | null;
  quantity: number | string | null;
  line_total: number | string | null;
  orders: {
    created_at: string;
    store_id: string;
  } | null;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isWithinRange(dateString: string, range: RangeValue): boolean {
  if (range === 'all') return true;

  const date = new Date(dateString);
  const now = new Date();

  if (Number.isNaN(date.getTime())) return false;

  if (range === 'today') {
    const todayStart = startOfDay(now);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    return date >= todayStart && date < tomorrowStart;
  }

  if (range === '7d') {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return date >= start;
  }

  if (range === '30d') {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 29);
    return date >= start;
  }

  if (range === 'month') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  return true;
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

  const rangeFiltered = orders.filter((order) =>
    isWithinRange(order.created_at, range)
  );

  const statusFiltered =
    status !== 'all'
      ? rangeFiltered.filter((order) => order.status === status)
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
    const aPending = a.status === 'pending' ? 1 : 0;
    const bPending = b.status === 'pending' ? 1 : 0;

    if (aPending !== bPending) return bPending - aPending;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    rangeFilteredOrders: rangeFiltered,
    visibleOrders,
    pendingOrdersCount: rangeFiltered.filter((order) => order.status === 'pending').length,
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
import {
  filterOrdersByWindow,
  getPreviousRangeWindow,
  type Order,
  type RangeValue,
} from '@/lib/admin/orders';

type Props = {
  orders: Order[];
  range?: RangeValue;
  rangeLabel?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeStatus(status: string | null | undefined) {
  const value = (status ?? '').toLowerCase().trim();

  if (value === 'in_preparation') return 'preparing';
  return value;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumRevenueExcludingCancelled(orders: Order[]) {
  return orders.reduce((acc, order) => {
    if (normalizeStatus(order.status) === 'cancelled') return acc;
    return acc + toNumber(order.total);
  }, 0);
}

function sumDeliveredRevenue(orders: Order[]) {
  return orders.reduce((acc, order) => {
    if (normalizeStatus(order.status) !== 'delivered') return acc;
    return acc + toNumber(order.total);
  }, 0);
}

function percentageDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function formatDelta(value: number, suffix = '%') {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}${suffix}`;
}

export default function OrdersStats({
  orders,
  range = 'all',
  rangeLabel = 'período',
}: Props) {
  const totalOrders = orders.length;

  const pending = orders.filter(
    (order) => normalizeStatus(order.status) === 'pending'
  ).length;

  const confirmed = orders.filter(
    (order) => normalizeStatus(order.status) === 'confirmed'
  ).length;

  const preparing = orders.filter(
    (order) => normalizeStatus(order.status) === 'preparing'
  ).length;

  const ready = orders.filter(
    (order) => normalizeStatus(order.status) === 'ready'
  ).length;

  const delivered = orders.filter(
    (order) => normalizeStatus(order.status) === 'delivered'
  ).length;

  const cancelled = orders.filter(
    (order) => normalizeStatus(order.status) === 'cancelled'
  ).length;

  const nonCancelledOrders = orders.filter(
    (order) => normalizeStatus(order.status) !== 'cancelled'
  );

  const totalRevenue = sumRevenueExcludingCancelled(orders);
  const deliveredRevenue = sumDeliveredRevenue(orders);

  const averageTicket =
    nonCancelledOrders.length > 0
      ? totalRevenue / nonCancelledOrders.length
      : 0;

  const deliveryCount = orders.filter(
    (order) => order.delivery_type === 'delivery'
  ).length;

  const pickupCount = orders.filter(
    (order) => order.delivery_type === 'pickup'
  ).length;

  const otherDeliveryTypes = orders.filter(
    (order) =>
      order.delivery_type !== 'delivery' && order.delivery_type !== 'pickup'
  ).length;

  const deliveryShare =
    totalOrders > 0 ? Math.round((deliveryCount / totalOrders) * 100) : 0;

  const pickupShare =
    totalOrders > 0 ? Math.round((pickupCount / totalOrders) * 100) : 0;

  const completionRate =
    totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;

  const cancellationRate =
    totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0;

  const comparableOrders = orders.filter(
    (order) => typeof order.created_at === 'string' && order.created_at.length > 0
  );

  const previousWindow = getPreviousRangeWindow(range);
  const previousOrders =
    range === 'all' ? [] : filterOrdersByWindow(comparableOrders, previousWindow);

  const previousNonCancelledOrders = previousOrders.filter(
    (order) => normalizeStatus(order.status) !== 'cancelled'
  );

  const previousRevenue = sumRevenueExcludingCancelled(previousOrders);
  const previousDeliveredRevenue = sumDeliveredRevenue(previousOrders);

  const previousAverageTicket =
    previousNonCancelledOrders.length > 0
      ? previousRevenue / previousNonCancelledOrders.length
      : 0;

  const revenueDelta =
    range === 'all' ? null : percentageDelta(totalRevenue, previousRevenue);

  const ordersDelta =
    range === 'all' ? null : percentageDelta(totalOrders, previousOrders.length);

  const avgTicketDelta =
    range === 'all'
      ? null
      : percentageDelta(averageTicket, previousAverageTicket);

  const deliveredRevenueDelta =
    range === 'all'
      ? null
      : percentageDelta(deliveredRevenue, previousDeliveredRevenue);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Resumen</h2>
        <p className="text-sm text-gray-500">
          Métricas comerciales de {rangeLabel}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card
          label="Total vendido"
          value={formatCurrency(totalRevenue)}
          hint="Facturación sin pedidos cancelados"
          delta={revenueDelta}
        />
        <Card
          label="Pedidos"
          value={totalOrders}
          hint="Cantidad total de pedidos"
          delta={ordersDelta}
        />
        <Card
          label="Ticket promedio"
          value={formatCurrency(averageTicket)}
          hint="Promedio por pedido no cancelado"
          delta={avgTicketDelta}
        />
        <Card
          label="Vendido entregado"
          value={formatCurrency(deliveredRevenue)}
          hint="Facturación de pedidos entregados"
          delta={deliveredRevenueDelta}
        />

        <Card label="Pendientes" value={pending} />
        <Card label="Confirmados" value={confirmed} />
        <Card label="En preparación" value={preparing} />
        <Card label="Listos" value={ready} />

        <Card
          label="Entregados"
          value={delivered}
          hint="Pedidos finalizados"
        />
        <Card
          label="Tasa entregados"
          value={`${completionRate}%`}
          hint="Pedidos entregados sobre el total"
        />
        <Card
          label="Cancelados"
          value={cancelled}
        />
        <Card
          label="Tasa cancelación"
          value={`${cancellationRate}%`}
          hint="Pedidos cancelados sobre el total"
        />

        <Card
          label="Envíos"
          value={`${deliveryCount} (${deliveryShare}%)`}
          hint="Pedidos con delivery"
        />
        <Card
          label="Retiros"
          value={`${pickupCount} (${pickupShare}%)`}
          hint="Pedidos para retirar"
        />
        <Card
          label="Otros tipos"
          value={otherDeliveryTypes}
          hint="Sin tipo o tipo distinto"
        />
      </div>
    </section>
  );
}

function Card({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: number | string;
  hint?: string;
  delta?: number | null;
}) {
  const deltaText =
    typeof delta === 'number' ? formatDelta(delta) : null;

  const deltaClass =
    typeof delta !== 'number'
      ? ''
      : delta > 0
        ? 'text-emerald-600'
        : delta < 0
          ? 'text-rose-600'
          : 'text-gray-500';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>

      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}

      {deltaText ? (
        <p className={`mt-2 text-xs font-medium ${deltaClass}`}>
          vs período anterior: {deltaText}
        </p>
      ) : null}
    </div>
  );
}
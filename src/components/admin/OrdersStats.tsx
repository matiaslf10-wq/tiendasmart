type Order = {
  status: string;
  total: number | string | null;
  delivery_type?: string | null;
};

type Props = {
  orders: Order[];
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

export default function OrdersStats({
  orders,
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

  const totalRevenue = orders.reduce((acc, order) => {
    return acc + toNumber(order.total);
  }, 0);

  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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
          hint="Facturación bruta del período"
        />
        <Card
          label="Pedidos"
          value={totalOrders}
          hint="Cantidad total de pedidos"
        />
        <Card
          label="Ticket promedio"
          value={formatCurrency(averageTicket)}
          hint="Ingreso promedio por pedido"
        />
        <Card
          label="Entregados"
          value={delivered}
          hint="Pedidos finalizados"
        />

        <Card label="Pendientes" value={pending} />
        <Card label="Confirmados" value={confirmed} />
        <Card label="En preparación" value={preparing} />
        <Card label="Listos" value={ready} />

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
        <Card label="Cancelados" value={cancelled} />
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
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}
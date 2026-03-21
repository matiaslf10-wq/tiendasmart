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

export default function OrdersStats({ orders, rangeLabel = 'período' }: Props) {
  const totalOrders = orders.length;
  const pending = orders.filter((order) => order.status === 'pending').length;
  const preparing = orders.filter(
    (order) => order.status === 'in_preparation'
  ).length;
  const delivered = orders.filter(
    (order) => order.status === 'delivered'
  ).length;

  const totalRevenue = orders.reduce(
    (acc, order) => acc + Number(order.total ?? 0),
    0
  );

  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const deliveryCount = orders.filter(
    (order) => order.delivery_type === 'delivery'
  ).length;

  const pickupCount = orders.filter(
    (order) => order.delivery_type !== 'delivery'
  ).length;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Resumen</h2>
        <p className="text-sm text-gray-500">Métricas de {rangeLabel}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card label="Total pedidos" value={totalOrders} />
        <Card label="Pendientes" value={pending} />
        <Card label="En preparación" value={preparing} />
        <Card label="Entregados" value={delivered} />
        <Card label="Total vendido" value={formatCurrency(totalRevenue)} />
        <Card label="Ticket promedio" value={formatCurrency(averageTicket)} />
        <Card label="Envíos" value={deliveryCount} />
        <Card label="Retiros" value={pickupCount} />
      </div>
    </section>
  );
}

function Card({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
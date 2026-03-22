type Order = {
  status: string;
  total: number | string | null;
  delivery_type?: string | null;
  created_at?: string | null;
};

type Props = {
  orders: Order[];
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(status: string | null | undefined) {
  const value = (status ?? '').toLowerCase().trim();

  if (value === 'in_preparation') return 'preparing';
  return value;
}

function formatDayLabel(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrdersCharts({ orders }: Props) {
  const validOrders = orders.filter((order) => {
    if (!order.created_at) return false;
    const date = new Date(order.created_at);
    return !Number.isNaN(date.getTime());
  });

  const byDayMap = new Map<
    string,
    { orders: number; revenue: number }
  >();

  for (const order of validOrders) {
    const key = String(order.created_at).slice(0, 10);
    const current = byDayMap.get(key) ?? { orders: 0, revenue: 0 };

    current.orders += 1;
    current.revenue += toNumber(order.total);

    byDayMap.set(key, current);
  }

  const byDay = Array.from(byDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, values]) => ({
      date,
      label: formatDayLabel(date),
      orders: values.orders,
      revenue: values.revenue,
    }));

  const maxOrders = Math.max(...byDay.map((item) => item.orders), 1);
  const maxRevenue = Math.max(...byDay.map((item) => item.revenue), 1);

  const deliveryCount = orders.filter(
    (order) => order.delivery_type === 'delivery'
  ).length;

  const pickupCount = orders.filter(
    (order) => order.delivery_type === 'pickup'
  ).length;

  const otherChannelCount = orders.filter(
    (order) =>
      order.delivery_type !== 'delivery' && order.delivery_type !== 'pickup'
  ).length;

  const pendingCount = orders.filter(
    (order) => normalizeStatus(order.status) === 'pending'
  ).length;

  const confirmedCount = orders.filter(
    (order) => normalizeStatus(order.status) === 'confirmed'
  ).length;

  const preparingCount = orders.filter(
    (order) => normalizeStatus(order.status) === 'preparing'
  ).length;

  const readyCount = orders.filter(
    (order) => normalizeStatus(order.status) === 'ready'
  ).length;

  const deliveredCount = orders.filter(
    (order) => normalizeStatus(order.status) === 'delivered'
  ).length;

  const cancelledCount = orders.filter(
    (order) => normalizeStatus(order.status) === 'cancelled'
  ).length;

  const totalOrders = orders.length || 1;

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Pedidos por día
            </h3>
            <p className="text-sm text-gray-500">
              Evolución diaria del volumen de ventas.
            </p>
          </div>

          {byDay.length === 0 ? (
            <EmptyChart message="Todavía no hay datos suficientes para mostrar pedidos por día." />
          ) : (
            <div className="space-y-3">
              {byDay.map((item) => {
                const width = Math.max((item.orders / maxOrders) * 100, 6);

                return (
                  <div key={item.date} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-900">
                        {item.orders} pedido{item.orders === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-900 transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Facturación por día
            </h3>
            <p className="text-sm text-gray-500">
              Ingresos generados por jornada.
            </p>
          </div>

          {byDay.length === 0 ? (
            <EmptyChart message="Todavía no hay datos suficientes para mostrar facturación por día." />
          ) : (
            <div className="space-y-3">
              {byDay.map((item) => {
                const width = Math.max((item.revenue / maxRevenue) * 100, 6);

                return (
                  <div key={item.date} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Canal de entrega
            </h3>
            <p className="text-sm text-gray-500">
              Cómo eligen recibir sus pedidos.
            </p>
          </div>

          <div className="space-y-4">
            <ProgressRow
              label="Delivery"
              value={deliveryCount}
              total={totalOrders}
            />
            <ProgressRow
              label="Retiro"
              value={pickupCount}
              total={totalOrders}
            />
            <ProgressRow
              label="Otros / sin definir"
              value={otherChannelCount}
              total={totalOrders}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Estado operativo
            </h3>
            <p className="text-sm text-gray-500">
              Salud general del flujo de pedidos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Pendientes" value={pendingCount} />
            <MiniStat label="Confirmados" value={confirmedCount} />
            <MiniStat label="Preparando" value={preparingCount} />
            <MiniStat label="Listos" value={readyCount} />
            <MiniStat label="Entregados" value={deliveredCount} />
            <MiniStat label="Cancelados" value={cancelledCount} />
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
      {message}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-900">
          {value} ({percentage}%)
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{ width: `${Math.max(percentage, value > 0 ? 6 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  NameType,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent';

type Order = {
  status: string;
  total: number | string | null;
  created_at: string;
};

type Props = {
  orders: Order[];
};

type SalesByDayItem = {
  date: string;
  total: number;
  orders: number;
  label: string;
};

type StatusDistributionItem = {
  name: string;
  value: number;
  status: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'confirmed':
      return 'Confirmado';
    case 'in_preparation':
      return 'En preparación';
    case 'ready':
      return 'Listo';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

function buildSalesByDay(orders: Order[]): SalesByDayItem[] {
  const grouped = new Map<
    string,
    { date: string; total: number; orders: number }
  >();

  for (const order of orders) {
    const date = new Date(order.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(date.getDate()).padStart(2, '0')}`;

    const current = grouped.get(key) ?? {
      date: key,
      total: 0,
      orders: 0,
    };

    current.total += Number(order.total ?? 0);
    current.orders += 1;

    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      ...item,
      label: formatShortDate(item.date),
    }));
}

function buildStatusDistribution(orders: Order[]): StatusDistributionItem[] {
  const counts = new Map<string, number>();

  for (const order of orders) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([status, value]) => ({
    name: getStatusLabel(status),
    value,
    status,
  }));
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return '#facc15';
    case 'confirmed':
      return '#60a5fa';
    case 'in_preparation':
      return '#fb923c';
    case 'ready':
      return '#4ade80';
    case 'delivered':
      return '#9ca3af';
    case 'cancelled':
      return '#f87171';
    default:
      return '#d1d5db';
  }
}

function formatTooltipValue(value: ValueType): string | number {
  if (typeof value === 'number') {
    return formatCurrency(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(' - ');
  }

  return '';
}

function formatPlainTooltipValue(value: ValueType): string | number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(' - ');
  }

  return '';
}

export default function OrdersCharts({ orders }: Props) {
  const salesByDay = buildSalesByDay(orders);
  const statusDistribution = buildStatusDistribution(orders);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Gráficos</h2>
        <p className="text-sm text-gray-500">
          Evolución de ventas y pedidos del período seleccionado.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Ventas por día
          </h3>

          {salesByDay.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay datos para mostrar en este gráfico.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(value: number) => `$${value}`} />
                  <Tooltip
                    formatter={(value: ValueType, _name: NameType) =>
                      formatTooltipValue(value)
                    }
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Pedidos por día
          </h3>

          {salesByDay.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay datos para mostrar en este gráfico.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: ValueType, _name: NameType) =>
                      formatPlainTooltipValue(value)
                    }
                  />
                  <Bar dataKey="orders" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4 xl:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Distribución por estado
          </h3>

          {statusDistribution.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay datos para mostrar en este gráfico.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-center">
              <div className="mx-auto h-72 w-full max-w-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {statusDistribution.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={getStatusColor(entry.status)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: ValueType, _name: NameType) =>
                        formatPlainTooltipValue(value)
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {statusDistribution.map((item) => (
                  <div
                    key={item.status}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {item.name}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
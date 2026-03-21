'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  Formatter,
  NameType,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent';

type OrderItemRow = {
  product_name: string | null;
  quantity: number | string | null;
  line_total: number | string | null;
};

type Props = {
  items: OrderItemRow[];
};

type TopProductItem = {
  product_name: string;
  quantity: number;
  revenue: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildTopProducts(items: OrderItemRow[]): TopProductItem[] {
  const grouped = new Map<string, TopProductItem>();

  for (const item of items) {
    const productName = (item.product_name ?? 'Producto sin nombre').trim() || 'Producto sin nombre';
    const quantity = Number(item.quantity ?? 0);
    const revenue = Number(item.line_total ?? 0);

    const current = grouped.get(productName) ?? {
      product_name: productName,
      quantity: 0,
      revenue: 0,
    };

    current.quantity += quantity;
    current.revenue += revenue;

    grouped.set(productName, current);
  }

  return Array.from(grouped.values())
    .sort((a, b) => {
      if (b.quantity !== a.quantity) {
        return b.quantity - a.quantity;
      }

      return b.revenue - a.revenue;
    })
    .slice(0, 8);
}

const quantityTooltipFormatter: Formatter<ValueType, NameType> = (value) => {
  if (typeof value === 'number') {
    return `${value} unidades`;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(' - ');
  }

  return '';
};

const revenueTooltipFormatter: Formatter<ValueType, NameType> = (value) => {
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
};

export default function OrdersTopProducts({ items }: Props) {
  const topProducts = buildTopProducts(items);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Productos más vendidos
        </h2>
        <p className="text-sm text-gray-500">
          Ranking del período seleccionado por cantidad vendida y facturación.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Top por unidades
          </h3>

          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay productos vendidos para mostrar.
            </p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="product_name"
                    width={170}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={quantityTooltipFormatter} />
                  <Bar dataKey="quantity" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Top por facturación
          </h3>

          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay productos vendidos para mostrar.
            </p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value: number) => `$${value}`} />
                  <YAxis
                    type="category"
                    dataKey="product_name"
                    width={170}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={revenueTooltipFormatter} />
                  <Bar dataKey="revenue" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {topProducts.length > 0 && (
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Resumen
          </h3>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {topProducts.map((product) => (
              <div
                key={product.product_name}
                className="rounded-xl border border-gray-200 p-3"
              >
                <p className="line-clamp-2 text-sm font-medium text-gray-900">
                  {product.product_name}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {product.quantity} unidades
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatCurrency(product.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
import OrdersCharts from '@/components/admin/OrdersCharts';
import OrdersStats from '@/components/admin/OrdersStats';
import OrdersTopProducts from '@/components/admin/OrdersTopProducts';
import {
  getRangeLabel,
  type Order,
  type OrderItemRow,
  type RangeValue,
} from '@/lib/admin/orders';

type OrdersAnalyticsSectionProps = {
  orders: Order[];
  items: OrderItemRow[];
  range: RangeValue;
};

export default function OrdersAnalyticsSection({
  orders,
  items,
  range,
}: OrdersAnalyticsSectionProps) {
  const rangeLabel = getRangeLabel(range);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-500">
          Vista comercial y operativa de {rangeLabel}.
        </p>
      </div>

      <OrdersStats
        orders={orders}
        range={range}
        rangeLabel={rangeLabel}
      />

      <OrdersCharts orders={orders} />
      <OrdersTopProducts items={items} />
    </section>
  );
}
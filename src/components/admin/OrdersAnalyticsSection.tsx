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
      <OrdersStats orders={orders} rangeLabel={rangeLabel} />
      <OrdersCharts orders={orders} />
      <OrdersTopProducts items={items} />
    </section>
  );
}
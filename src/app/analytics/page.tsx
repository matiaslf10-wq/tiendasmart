import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import OrdersAnalyticsSection from '@/components/admin/OrdersAnalyticsSection';
import OrdersRangeTabs from '@/components/admin/OrdersRangeTabs';
import {
  filterOrderItemsByRange,
  filterOrders,
  type Order,
  type OrderItemRow,
  type RangeValue,
} from '@/lib/admin/orders';
import { getCurrentUserStore } from '@/lib/stores';
import { createClient } from '@/lib/supabase/server';

type PageProps = {
  searchParams: Promise<{
    range?: RangeValue;
  }>;
};

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const membership = await getCurrentUserStore();

  if (!membership?.stores) {
    redirect('/login');
  }

  const store = membership.stores;
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  const range: RangeValue = resolvedSearchParams.range ?? '30d';

  const [{ data: ordersData, error: ordersError }, { data: itemsData, error: itemsError }] =
    await Promise.all([
      supabase
        .from('orders')
        .select(
          `
          id,
          order_number,
          customer_name,
          customer_phone,
          total,
          status,
          notes,
          delivery_type,
          delivery_address,
          created_at
        `
        )
        .eq('store_id', store.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('order_items')
        .select(
          `
          product_name,
          quantity,
          line_total,
          orders!inner (
            created_at,
            store_id
          )
        `
        )
        .eq('orders.store_id', store.id),
    ]);

  if (ordersError) {
    throw new Error(`Error cargando pedidos: ${ordersError.message}`);
  }

  if (itemsError) {
    throw new Error(`Error cargando items de pedidos: ${itemsError.message}`);
  }

  const allOrders = (ordersData ?? []) as Order[];
  const allOrderItems = ((itemsData ?? []) as Array<{
    product_name: string | null;
    quantity: number | string | null;
    line_total: number | string | null;
    orders: { created_at: string; store_id: string }[];
  }>).map((item) => ({
    product_name: item.product_name,
    quantity: item.quantity,
    line_total: item.line_total,
    orders: item.orders?.[0] ?? null,
  })) as OrderItemRow[];

  const { rangeFilteredOrders, pendingOrdersCount } = filterOrders({
    orders: allOrders,
    status: 'all',
    queryText: '',
    delivery: 'all',
    notes: 'all',
    range,
  });

  const rangeFilteredOrderItems = filterOrderItemsByRange(allOrderItems, range);

  return (
    <AdminShell
      title="Analytics"
      subtitle={`Tienda: ${store.name}`}
      storeName={store.name}
      storeSlug={store.slug}
      current="analytics"
      pendingOrdersCount={pendingOrdersCount}
    >
      <div className="space-y-6">
        <OrdersRangeTabs
          currentRange={range}
          status="all"
          queryText=""
          delivery="all"
          notes="all"
        />

        <OrdersAnalyticsSection
          orders={rangeFilteredOrders}
          items={rangeFilteredOrderItems}
          range={range}
        />
      </div>
    </AdminShell>
  );
}
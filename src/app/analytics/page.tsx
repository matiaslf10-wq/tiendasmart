import Link from 'next/link';
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
import { hasFeature } from '@/lib/plans';
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

  if (!hasFeature(store.plan, 'advanced_analytics')) {
    return (
      <AdminShell
  title="Pedidos"
  subtitle={`Tienda: ${store.name}`}
  storeName={store.name}
  storeSlug={store.slug}
  plan={store.plan}
  current="pedidos"
  pendingOrdersCount={0}
>
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
              Función disponible en planes superiores
            </p>

            <h2 className="text-2xl font-bold text-amber-950">
              Analytics avanzado no está incluido en tu plan
            </h2>

            <p className="max-w-2xl text-sm text-amber-900">
              Tu tienda está usando el plan <strong>{store.plan}</strong>. Para
              acceder a métricas avanzadas, comparativas y análisis comercial,
              necesitás actualizar a <strong>Pro</strong> o{' '}
              <strong>Intelligence</strong>.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/admin/pedidos"
                className="inline-flex items-center rounded-2xl bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
              >
                Volver a Pedidos
              </Link>

              <Link
                href="/admin"
                className="inline-flex items-center rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
              >
                Ir al panel
              </Link>
            </div>
          </div>
        </section>
      </AdminShell>
    );
  }

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
  title="Pedidos"
  subtitle={`Tienda: ${store.name}`}
  storeName={store.name}
  storeSlug={store.slug}
  plan={store.plan}
  current="pedidos"
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
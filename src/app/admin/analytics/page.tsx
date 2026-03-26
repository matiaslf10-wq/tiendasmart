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
import { getGa4Overview } from '@/lib/ga4';
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
        title="Analytics"
        subtitle={`Tienda: ${store.name}`}
        storeName={store.name}
        storeSlug={store.slug}
        plan={store.plan}
        current="analytics"
        pendingOrdersCount={0}
      >
        <div>Plan sin analytics</div>
      </AdminShell>
    );
  }

  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const range: RangeValue = resolvedSearchParams.range ?? '30d';

  // 🔥 CLAVE: SOLO usamos esta variable
  const ga4ServiceAccountJson = process.env.GA4_SERVICE_ACCOUNT_JSON;

  console.log(
    'GA4_SERVICE_ACCOUNT_JSON loaded:',
    Boolean(ga4ServiceAccountJson)
  );

  const hasGa4Credentials = Boolean(ga4ServiceAccountJson);

  let ga4Data = null;
  let ga4Error: string | null = null;

  if (store.google_analytics_property_id && hasGa4Credentials) {
    try {
      ga4Data = await getGa4Overview({
        propertyId: store.google_analytics_property_id,
        range,
      });

      console.log('GA4 DATA:', ga4Data);
    } catch (error) {
      ga4Error =
        error instanceof Error ? error.message : 'Error desconocido GA4';

      console.error('GA4 ERROR:', ga4Error);
    }
  }

  const [{ data: ordersData }, { data: itemsData }] = await Promise.all([
    supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id),
    supabase
      .from('order_items')
      .select(
        `product_name, quantity, line_total, orders!inner(created_at, store_id)`
      )
      .eq('orders.store_id', store.id),
  ]);

  const allOrders = (ordersData ?? []) as Order[];

  const allOrderItems = ((itemsData ?? []) as any[]).map((item) => ({
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

  const rangeFilteredOrderItems = filterOrderItemsByRange(
    allOrderItems,
    range
  );

  return (
    <AdminShell
      title="Analytics"
      subtitle={`Tienda: ${store.name}`}
      storeName={store.name}
      storeSlug={store.slug}
      plan={store.plan}
      current="analytics"
      pendingOrdersCount={pendingOrdersCount}
    >
      <div className="space-y-6">

        {/* STATUS GA4 */}
        <div className="rounded-xl border p-4">
          <p>
            Credenciales backend:{' '}
            {hasGa4Credentials ? 'Configuradas' : 'Faltan variables'}
          </p>

          {ga4Error && (
            <p style={{ color: 'red' }}>
              Error GA4: {ga4Error}
            </p>
          )}
        </div>

        {/* DATA */}
        {ga4Data && (
          <div className="grid grid-cols-2 gap-4">
            <div>Usuarios: {ga4Data.activeUsers}</div>
            <div>Sesiones: {ga4Data.sessions}</div>
            <div>Views: {ga4Data.screenPageViews}</div>
            <div>Compras: {ga4Data.purchaseEvents}</div>
          </div>
        )}

        <OrdersRangeTabs
          basePath="/admin/analytics"
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
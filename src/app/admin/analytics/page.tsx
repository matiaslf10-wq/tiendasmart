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

  const [
    { data: ordersData, error: ordersError },
    { data: itemsData, error: itemsError },
  ] = await Promise.all([
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

  const hasMeasurementId = Boolean(store.google_analytics_id);
  const hasPropertyId = Boolean(store.google_analytics_property_id);
  const hasGa4Credentials = Boolean(
    process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY
  );
  const hasFullGa4Config =
    hasMeasurementId && hasPropertyId && hasGa4Credentials;

  let ga4Data: Awaited<ReturnType<typeof getGa4Overview>> | null = null;
  let ga4Error: string | null = null;

  if (hasPropertyId && hasGa4Credentials) {
    try {
      ga4Data = await getGa4Overview({
        propertyId: store.google_analytics_property_id as string,
        range,
      });

      console.log('GA4 DATA:', ga4Data);
    } catch (error) {
      ga4Error =
        error instanceof Error ? error.message : 'Error desconocido en GA4';

      console.error('GA4 ERROR:', ga4Error);
    }
  } else {
    console.log('GA4 DATA: null (faltan credenciales o property id)');
  }

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
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Rendimiento comercial
            </h2>
            <p className="text-sm text-slate-500">
              Analizá ingresos, comportamiento de pedidos y productos con mejor
              desempeño en el período seleccionado.
            </p>
          </div>
        </section>

        <section
          className={`rounded-2xl border p-4 shadow-sm ${
            hasFullGa4Config
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="space-y-2">
            <h2
              className={`text-lg font-semibold ${
                hasFullGa4Config ? 'text-emerald-900' : 'text-amber-950'
              }`}
            >
              Integración con Google Analytics
            </h2>

            <p
              className={`text-sm ${
                hasFullGa4Config ? 'text-emerald-800' : 'text-amber-900'
              }`}
            >
              {hasFullGa4Config
                ? 'La tienda tiene configurado Measurement ID, Property ID y credenciales del backend. Estamos probando la lectura real desde GA4.'
                : 'Todavía falta completar la configuración de GA4 para poder mostrar métricas de tráfico y eventos en este panel.'}
            </p>

            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Measurement ID
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {store.google_analytics_id || 'No configurado'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  GA4 Property ID
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {store.google_analytics_property_id || 'No configurado'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Credenciales backend
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {hasGa4Credentials ? 'Configuradas' : 'Faltan variables'}
                </p>
              </div>
            </div>

            {ga4Error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  Error al consultar GA4
                </p>
                <p className="mt-1 break-words text-sm text-red-700">
                  {ga4Error}
                </p>
              </div>
            ) : null}

            {ga4Data ? (
              <div className="grid gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Usuarios activos
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {ga4Data.activeUsers}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Sesiones
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {ga4Data.sessions}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Vistas
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {ga4Data.screenPageViews}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    View item
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {ga4Data.viewItemEvents}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Purchases
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {ga4Data.purchaseEvents}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

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
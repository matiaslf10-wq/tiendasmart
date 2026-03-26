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

  const ga4ServiceAccountJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const hasGa4Credentials = Boolean(ga4ServiceAccountJson);

  let ga4Data: Awaited<ReturnType<typeof getGa4Overview>> | null = null;
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

  const conversion = ga4Data
    ? {
        viewToCart:
          ga4Data.viewItemEvents > 0
            ? (ga4Data.addToCartEvents / ga4Data.viewItemEvents) * 100
            : 0,

        cartToCheckout:
          ga4Data.addToCartEvents > 0
            ? (ga4Data.beginCheckoutEvents / ga4Data.addToCartEvents) * 100
            : 0,

        checkoutToWhatsapp:
          ga4Data.beginCheckoutEvents > 0
            ? (ga4Data.sendToWhatsAppEvents / ga4Data.beginCheckoutEvents) * 100
            : 0,

        whatsappToPurchase:
          ga4Data.sendToWhatsAppEvents > 0
            ? (ga4Data.purchaseEvents / ga4Data.sendToWhatsAppEvents) * 100
            : 0,
      }
    : null;

  const [
    { data: ordersData, error: ordersError },
    { data: itemsData, error: itemsError },
  ] = await Promise.all([
    supabase.from('orders').select('*').eq('store_id', store.id),
    supabase
      .from('order_items')
      .select(
        'product_name, quantity, line_total, orders!inner(created_at, store_id)'
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
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Rendimiento comercial
            </h2>
            <p className="text-sm text-slate-500">
              Analizá ingresos, comportamiento de pedidos, tráfico y conversión
              en el período seleccionado.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Estado de Google Analytics
            </h2>

            <p className="text-sm text-slate-600">
              Credenciales backend:{' '}
              <span className="font-medium">
                {hasGa4Credentials ? 'Configuradas' : 'Faltan variables'}
              </span>
            </p>

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
          </div>
        </section>

        {ga4Data ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Usuarios activos</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {ga4Data.activeUsers}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Sesiones</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {ga4Data.sessions}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Views</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {ga4Data.screenPageViews}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Purchases</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {ga4Data.purchaseEvents}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">View item</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {ga4Data.viewItemEvents}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Add to cart</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {ga4Data.addToCartEvents}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Begin checkout</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {ga4Data.beginCheckoutEvents}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Enviar a WhatsApp</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {ga4Data.sendToWhatsAppEvents}
              </p>
            </div>
          </section>
        ) : null}

        {ga4Data && conversion ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Funnel de conversión
            </h3>

            <div className="grid gap-4 text-center sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Views</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.viewItemEvents}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Add to cart</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.addToCartEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {conversion.viewToCart.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Checkout</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.beginCheckoutEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {conversion.cartToCheckout.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">WhatsApp</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.sendToWhatsAppEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {conversion.checkoutToWhatsapp.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Purchase</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.purchaseEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {conversion.whatsappToPurchase.toFixed(1)}%
                </p>
              </div>
            </div>
          </section>
        ) : null}

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
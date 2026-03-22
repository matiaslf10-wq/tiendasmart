import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import OrdersAnalyticsSection from '@/components/admin/OrdersAnalyticsSection';
import OrdersFilters from '@/components/admin/OrdersFilters';
import OrdersRangeTabs from '@/components/admin/OrdersRangeTabs';
import {
  filterOrderItemsByRange,
  filterOrders,
  type Order,
  type OrderItemRow,
  type RangeValue,
} from '@/lib/admin/orders';
import { formatPrice } from '@/lib/cart';
import { getCurrentUserStore } from '@/lib/stores';
import { createClient } from '@/lib/supabase/server';

type PageProps = {
  searchParams: Promise<{
    range?: RangeValue;
    status?: string;
    q?: string;
    delivery?: string;
    notes?: string;
  }>;
};

function getStatusClasses(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'preparing':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'ready':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'cancelled':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'confirmed':
      return 'Confirmado';
    case 'preparing':
      return 'Preparando';
    case 'ready':
      return 'Listo';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status || 'Sin estado';
  }
}

function getDeliveryLabel(deliveryType: string | null) {
  if (deliveryType === 'delivery') return 'Envío';
  if (deliveryType === 'pickup') return 'Retiro';
  return 'Sin definir';
}

function formatOrderDate(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default async function PedidosPage({ searchParams }: PageProps) {
  const membership = await getCurrentUserStore();

  if (!membership?.stores) {
    redirect('/login');
  }

  const store = membership.stores;
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  const range: RangeValue = resolvedSearchParams.range ?? 'all';
  const status = resolvedSearchParams.status ?? 'all';
  const queryText = resolvedSearchParams.q ?? '';
  const delivery = resolvedSearchParams.delivery ?? 'all';
  const notes = resolvedSearchParams.notes ?? 'all';

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

  const {
    rangeFilteredOrders,
    visibleOrders,
    pendingOrdersCount,
  } = filterOrders({
    orders: allOrders,
    status,
    queryText,
    delivery,
    notes,
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
      pendingOrdersCount={0}
    >
      <div className="space-y-6">
        <OrdersRangeTabs
          currentRange={range}
          status={status}
          queryText={queryText}
          delivery={delivery}
          notes={notes}
        />

        <OrdersAnalyticsSection
          orders={rangeFilteredOrders}
          items={rangeFilteredOrderItems}
          range={range}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Gestión de pedidos
              </h2>
              <p className="text-sm text-slate-500">
                {visibleOrders.length} pedido{visibleOrders.length === 1 ? '' : 's'} visible
                {queryText ? `s para “${queryText}”` : 's'}.
              </p>
            </div>
          </div>

          <OrdersFilters />
        </section>

        <section className="space-y-4">
          {visibleOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="text-base font-semibold text-slate-900">
                No hay pedidos para mostrar
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Probá cambiar los filtros, el rango o la búsqueda.
              </p>
            </div>
          ) : (
            visibleOrders.map((order) => {
              const total =
                typeof order.total === 'number'
                  ? order.total
                  : Number(order.total ?? 0);

              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          Pedido #{order.order_number ?? '—'}
                        </h3>

                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {getDeliveryLabel(order.delivery_type)}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Cliente
                          </p>
                          <p className="text-sm text-slate-800">
                            {order.customer_name?.trim() || 'Sin nombre'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Teléfono
                          </p>
                          <p className="text-sm text-slate-800">
                            {order.customer_phone?.trim() || 'Sin teléfono'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Total
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatPrice(total)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Fecha
                          </p>
                          <p className="text-sm text-slate-800">
                            {formatOrderDate(order.created_at)}
                          </p>
                        </div>
                      </div>

                      {order.delivery_address?.trim() ? (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Dirección
                          </p>
                          <p className="text-sm text-slate-800">
                            {order.delivery_address}
                          </p>
                        </div>
                      ) : null}

                      {order.notes?.trim() ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                            Notas
                          </p>
                          <p className="mt-1 text-sm text-amber-900">{order.notes}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </AdminShell>
  );
}
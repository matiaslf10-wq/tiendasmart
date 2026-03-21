import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';
import OrdersFilters from '@/components/admin/OrdersFilters';
import OrdersStats from '@/components/admin/OrdersStats';
import OrdersRangeTabs from '@/components/admin/OrdersRangeTabs';
import OrdersCharts from '@/components/admin/OrdersCharts';
import OrdersTopProducts from '@/components/admin/OrdersTopProducts';
import AdminShell from '@/components/admin/AdminShell';
import OrderQuickActions from '@/components/admin/OrderQuickActions';
import OrderWhatsAppButton from '@/components/admin/OrderWhatsAppButton';
import BulkPendingActions from '@/components/admin/BulkPendingActions';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'in_preparation':
      return 'bg-orange-100 text-orange-800';
    case 'ready':
      return 'bg-green-100 text-green-800';
    case 'delivered':
      return 'bg-gray-200 text-gray-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
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

function getDeliveryTypeLabel(deliveryType: string | null) {
  return deliveryType === 'delivery' ? 'Envío' : 'Retiro';
}

function getDeliveryTypeClasses(deliveryType: string | null) {
  return deliveryType === 'delivery'
    ? 'bg-purple-100 text-purple-800'
    : 'bg-slate-100 text-slate-700';
}

function getDeliveryFilterLabel(delivery: string) {
  switch (delivery) {
    case 'delivery':
      return 'Envío';
    case 'pickup':
      return 'Retiro';
    default:
      return 'Todas';
  }
}

function getNotesFilterLabel(notes: string) {
  switch (notes) {
    case 'with_notes':
      return 'Con observaciones';
    default:
      return 'Todas';
  }
}

type RangeValue = 'today' | '7d' | '30d' | 'month' | 'all';

function getRangeLabel(range: RangeValue) {
  switch (range) {
    case 'today':
      return 'hoy';
    case '7d':
      return 'los últimos 7 días';
    case '30d':
      return 'los últimos 30 días';
    case 'month':
      return 'este mes';
    default:
      return 'todo el historial';
  }
}

function getRangeFilterLabel(range: RangeValue) {
  switch (range) {
    case 'today':
      return 'Hoy';
    case '7d':
      return 'Últimos 7 días';
    case '30d':
      return 'Últimos 30 días';
    case 'month':
      return 'Este mes';
    default:
      return 'Todo';
  }
}

function buildStatusHref(params: {
  nextStatus: string;
  queryText: string;
  delivery: string;
  notes: string;
  range: RangeValue;
}) {
  const search = new URLSearchParams();

  if (params.range !== 'all') {
    search.set('range', params.range);
  }

  if (params.nextStatus !== 'all') {
    search.set('status', params.nextStatus);
  }

  if (params.queryText.trim()) {
    search.set('q', params.queryText.trim());
  }

  if (params.delivery !== 'all') {
    search.set('delivery', params.delivery);
  }

  if (params.notes !== 'all') {
    search.set('notes', params.notes);
  }

  const queryString = search.toString();
  return queryString ? `/admin/pedidos?${queryString}` : '/admin/pedidos';
}

type Order = {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  total: number | string | null;
  status: string;
  notes: string | null;
  delivery_type: string | null;
  delivery_address: string | null;
  created_at: string;
};

type OrderItemRow = {
  product_name: string | null;
  quantity: number | string | null;
  line_total: number | string | null;
  orders: {
    created_at: string;
    store_id: string;
  } | null;
};

type PageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
    delivery?: string;
    notes?: string;
    range?: RangeValue;
  }>;
};

function matchesSearch(order: Order, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();

  if (!q) return true;

  const customerName = (order.customer_name ?? '').toLowerCase();
  const customerPhone = (order.customer_phone ?? '').toLowerCase();
  const orderNumber = String(order.order_number ?? '').toLowerCase();
  const deliveryAddress = (order.delivery_address ?? '').toLowerCase();

  return (
    customerName.includes(q) ||
    customerPhone.includes(q) ||
    orderNumber.includes(q) ||
    deliveryAddress.includes(q)
  );
}

function isWithinRange(dateString: string, range: RangeValue) {
  if (range === 'all') return true;

  const date = new Date(dateString);
  const now = new Date();

  if (range === 'today') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  if (range === '7d') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return date >= start;
  }

  if (range === '30d') {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return date >= start;
  }

  if (range === 'month') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  return true;
}

export default async function PedidosPage({ searchParams }: PageProps) {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    redirect('/login');
  }

  const store = membership.stores;
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  const status = resolvedSearchParams.status ?? 'all';
  const queryText = resolvedSearchParams.q ?? '';
  const delivery = resolvedSearchParams.delivery ?? 'all';
  const notes = resolvedSearchParams.notes ?? 'all';
  const range: RangeValue = resolvedSearchParams.range ?? 'all';

  const [{ data, error }, { data: orderItemsData, error: orderItemsError }] =
    await Promise.all([
      supabase
        .from('orders')
        .select(`
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
        `)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          line_total,
          orders!inner (
            created_at,
            store_id
          )
        `)
        .eq('orders.store_id', store.id),
    ]);

  const allOrders = (data ?? []) as Order[];

  const rangeFilteredOrders = allOrders.filter((order) =>
    isWithinRange(order.created_at, range)
  );

  const rangeFilteredOrderItems = ((orderItemsData ?? []) as OrderItemRow[]).filter(
    (item) => {
      const createdAt = item.orders?.created_at;
      return createdAt ? isWithinRange(createdAt, range) : false;
    }
  );

  const pendingOrdersCount = rangeFilteredOrders.filter(
    (order) => order.status === 'pending'
  ).length;

  const statusFilteredOrders =
    status !== 'all'
      ? rangeFilteredOrders.filter((order) => order.status === status)
      : rangeFilteredOrders;

  const deliveryFilteredOrders =
    delivery !== 'all'
      ? statusFilteredOrders.filter((order) =>
          delivery === 'delivery'
            ? order.delivery_type === 'delivery'
            : order.delivery_type !== 'delivery'
        )
      : statusFilteredOrders;

  const notesFilteredOrders =
    notes === 'with_notes'
      ? deliveryFilteredOrders.filter((order) => Boolean(order.notes?.trim()))
      : deliveryFilteredOrders;

  const searchedOrders = queryText.trim()
    ? notesFilteredOrders.filter((order) => matchesSearch(order, queryText))
    : notesFilteredOrders;

  const visibleOrders = [...searchedOrders].sort((a, b) => {
    const aPending = a.status === 'pending' ? 1 : 0;
    const bPending = b.status === 'pending' ? 1 : 0;

    if (aPending !== bPending) {
      return bPending - aPending;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeFilters = [
    ...(range !== 'all'
      ? [{ key: 'range', label: `Período: ${getRangeFilterLabel(range)}` }]
      : []),
    ...(status !== 'all'
      ? [{ key: 'status', label: `Estado: ${getStatusLabel(status)}` }]
      : []),
    ...(delivery !== 'all'
      ? [
          {
            key: 'delivery',
            label: `Entrega: ${getDeliveryFilterLabel(delivery)}`,
          },
        ]
      : []),
    ...(notes !== 'all'
      ? [
          {
            key: 'notes',
            label: `Observaciones: ${getNotesFilterLabel(notes)}`,
          },
        ]
      : []),
    ...(queryText.trim()
      ? [{ key: 'q', label: `Búsqueda: "${queryText.trim()}"` }]
      : []),
  ];

  const quickStatusTabs = [
    {
      value: 'all',
      label: 'Todos',
      count: rangeFilteredOrders.length,
    },
    {
      value: 'pending',
      label: 'Pendientes',
      count: rangeFilteredOrders.filter((order) => order.status === 'pending')
        .length,
    },
    {
      value: 'confirmed',
      label: 'Confirmados',
      count: rangeFilteredOrders.filter((order) => order.status === 'confirmed')
        .length,
    },
    {
      value: 'ready',
      label: 'Listos',
      count: rangeFilteredOrders.filter((order) => order.status === 'ready')
        .length,
    },
    {
      value: 'delivered',
      label: 'Entregados',
      count: rangeFilteredOrders.filter((order) => order.status === 'delivered')
        .length,
    },
  ];

  const visiblePendingOrderIds = visibleOrders
    .filter((order) => order.status === 'pending')
    .map((order) => order.id);

  return (
    <AdminShell
      title="Pedidos"
      subtitle={`Tienda: ${store.name}`}
      storeName={store.name}
      storeSlug={store.slug}
      current="pedidos"
      pendingOrdersCount={pendingOrdersCount}
    >
      <div className="-mt-1">
        <p className="text-sm text-gray-500">
          Gestión de pedidos de tu tienda.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          Error cargando pedidos: {error.message}
        </div>
      ) : (
        <>
          {orderItemsError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
              No se pudieron cargar los productos más vendidos: {orderItemsError.message}
            </div>
          ) : null}

          <OrdersRangeTabs
            currentRange={range}
            status={status}
            queryText={queryText}
            delivery={delivery}
            notes={notes}
          />

          <OrdersStats
            orders={rangeFilteredOrders}
            rangeLabel={getRangeLabel(range)}
          />

          <OrdersCharts orders={rangeFilteredOrders} />

          <OrdersTopProducts items={rangeFilteredOrderItems} />

          <OrdersFilters />

          <div className="flex flex-wrap gap-2">
            {quickStatusTabs.map((tab) => {
              const isActive =
                status === tab.value || (status === 'all' && tab.value === 'all');

              return (
                <Link
                  key={tab.value}
                  href={buildStatusHref({
                    nextStatus: tab.value,
                    queryText,
                    delivery,
                    notes,
                    range,
                  })}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-black text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </Link>
              );
            })}
          </div>

          {activeFilters.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <span
                    key={filter.key}
                    className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200"
                  >
                    {filter.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <BulkPendingActions pendingOrderIds={visiblePendingOrderIds} />

          {visibleOrders.length === 0 ? (
            <p>No hay pedidos para los filtros seleccionados.</p>
          ) : (
            <div className="space-y-4">
              {visibleOrders.map((order) => {
                const hasNotes = Boolean(order.notes?.trim());
                const isDelivery = order.delivery_type === 'delivery';
                const hasAddress = Boolean(order.delivery_address?.trim());

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border p-4 transition hover:bg-gray-50 ${
                      order.status === 'pending'
                        ? 'border-yellow-300 bg-yellow-50/40'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold">#{order.order_number}</p>

                          <p className="text-sm text-gray-500">
                            {order.customer_name || 'Cliente sin nombre'}
                          </p>

                          {order.customer_phone ? (
                            <p className="text-xs text-gray-400">
                              {order.customer_phone}
                            </p>
                          ) : null}

                          <p className="text-xs text-gray-400">
                            {formatDate(order.created_at)}
                          </p>

                          {isDelivery && hasAddress ? (
                            <div className="pt-1">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                Dirección
                              </p>
                              <p className="text-xs text-gray-600">
                                {order.delivery_address}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-2 text-left md:text-right">
                          <p className="font-semibold">
                            {formatCurrency(Number(order.total ?? 0))}
                          </p>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs ${getStatusClasses(
                                order.status
                              )}`}
                            >
                              {getStatusLabel(order.status)}
                            </span>

                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs ${getDeliveryTypeClasses(
                                order.delivery_type
                              )}`}
                            >
                              {getDeliveryTypeLabel(order.delivery_type)}
                            </span>

                            {hasNotes && (
                              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
                                📝 Con observaciones
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t pt-3">
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Ver detalle
                        </Link>

                        <OrderWhatsAppButton
                          phone={order.customer_phone}
                          customerName={order.customer_name}
                          orderNumber={order.order_number}
                          total={Number(order.total ?? 0)}
                          status={order.status}
                          compact
                        />
                      </div>

                      <div>
                        <OrderQuickActions
                          orderId={order.id}
                          currentStatus={order.status}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
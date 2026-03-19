import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';
import OrdersFilters from '@/components/admin/OrdersFilters';
import OrdersStats from '@/components/admin/OrdersStats';
import AdminShell from '@/components/admin/AdminShell';
import OrderQuickActions from '@/components/admin/OrderQuickActions';
import OrderWhatsAppButton from '@/components/admin/OrderWhatsAppButton';

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

type Order = {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  total: number | string | null;
  status: string;
  delivery_type: string | null;
  created_at: string;
};

type PageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
};

function matchesSearch(order: Order, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();

  if (!q) return true;

  const customerName = (order.customer_name ?? '').toLowerCase();
  const customerPhone = (order.customer_phone ?? '').toLowerCase();
  const orderNumber = String(order.order_number ?? '').toLowerCase();

  return (
    customerName.includes(q) ||
    customerPhone.includes(q) ||
    orderNumber.includes(q)
  );
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

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      customer_phone,
      total,
      status,
      delivery_type,
      created_at
    `)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  const allOrders = (data ?? []) as Order[];
  const pendingOrdersCount = allOrders.filter(
    (order) => order.status === 'pending'
  ).length;

  const statusFilteredOrders =
    status && status !== 'all'
      ? allOrders.filter((order) => order.status === status)
      : allOrders;

  const visibleOrders = queryText.trim()
    ? statusFilteredOrders.filter((order) => matchesSearch(order, queryText))
    : statusFilteredOrders;

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
          <OrdersStats orders={visibleOrders || []} />
          <OrdersFilters />

          {queryText.trim() ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Mostrando resultados para{' '}
              <span className="font-semibold text-gray-900">
                “{queryText.trim()}”
              </span>
              .
            </div>
          ) : null}

          {!visibleOrders || visibleOrders.length === 0 ? (
            <p>No hay pedidos para los filtros seleccionados.</p>
          ) : (
            <div className="space-y-4">
              {visibleOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/pedidos/${order.id}`}
                  className="block rounded-2xl border p-4 transition hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
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
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex flex-col gap-3 border-t pt-3"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex flex-wrap gap-2">
                        <OrderWhatsAppButton
                          phone={order.customer_phone}
                          customerName={order.customer_name}
                          orderNumber={order.order_number}
                          total={Number(order.total ?? 0)}
                          status={order.status}
                          compact
                        />
                      </div>

                      <OrderQuickActions
                        orderId={order.id}
                        currentStatus={order.status}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
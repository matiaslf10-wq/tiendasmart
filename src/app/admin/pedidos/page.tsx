import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import OrdersFilters from '@/components/admin/OrdersFilters';
import OrdersStats from '@/components/admin/OrdersStats';

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

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = await createClient();
  const storeId = 'TU_STORE_ID';

  let query = supabase
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status);
  }

  const { data: orders, error } = await query;

  if (error) {
    return <div>Error cargando pedidos</div>;
  }

  return (
    <main className="p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-gray-500">
          Gestión de pedidos en tiempo real
        </p>
      </div>

      {/* MÉTRICAS */}
      <OrdersStats orders={orders || []} />

      {/* FILTROS */}
      <OrdersFilters />

      {/* LISTADO */}
      {!orders || orders.length === 0 ? (
        <p>No hay pedidos.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/pedidos/${order.id}`}
              className="block rounded-2xl border p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">
                    #{order.order_number}
                  </p>

                  <p className="text-sm text-gray-500">
                    {order.customer_name}
                  </p>

                  <p className="text-xs text-gray-400">
                    {formatDate(order.created_at)}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <p className="font-semibold">
                    {formatCurrency(order.total)}
                  </p>

                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs ${getStatusClasses(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
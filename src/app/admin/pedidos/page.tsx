import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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

function getStatusClasses(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'in_preparation':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'ready':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'delivered':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getDeliveryLabel(deliveryType: string) {
  switch (deliveryType) {
    case 'pickup':
      return 'Retiro';
    case 'delivery':
      return 'Envío';
    default:
      return deliveryType;
  }
}

export default async function PedidosPage() {
  const supabase = await createClient();

  // TODO: reemplazar por el store real del admin logueado
  const storeId = 'TU_STORE_ID';

  const { data: orders, error } = await supabase
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
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error cargando pedidos.
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500">
            Gestión de pedidos de la tienda
          </p>
        </div>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-base font-medium text-gray-900">
            No hay pedidos todavía.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Cuando entren pedidos reales van a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/pedidos/${order.id}`}
              className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50 hover:shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-gray-900">
                      Pedido #{order.order_number}
                    </p>

                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-500">
                    <p>{order.customer_name}</p>
                    <p>{order.customer_phone}</p>
                    <p>{getDeliveryLabel(order.delivery_type)}</p>
                    <p>{formatDate(order.created_at)}</p>
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(Number(order.total))}
                  </p>
                  <p className="text-sm text-gray-500">Ver detalle</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
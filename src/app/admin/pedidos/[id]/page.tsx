import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';
import AdminShell from '@/components/admin/AdminShell';
import OrderDetailRealtimeListener from '@/components/admin/OrderDetailRealtimeListener';
import UpdateOrderStatus from './UpdateOrderStatus';

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
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

export default async function PedidoDetallePage({ params }: PageProps) {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    redirect('/login');
  }

  const store = membership.stores;
  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      store_id,
      order_number,
      customer_name,
      customer_phone,
      customer_email,
      delivery_type,
      delivery_address,
      notes,
      subtotal,
      shipping_cost,
      total,
      currency,
      status,
      created_at,
      order_items (
        id,
        product_name,
        unit_price,
        quantity,
        line_total
      )
    `)
    .eq('id', id)
    .eq('store_id', store.id)
    .single();

  if (error || !order) {
    notFound();
  }

  return (
    <AdminShell
      title={`Pedido #${order.order_number}`}
      subtitle={`Tienda: ${store.name}`}
      storeName={store.name}
      storeSlug={store.slug}
      current="pedidos"
    >
      <OrderDetailRealtimeListener storeId={store.id} orderId={order.id} />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Link
            href="/admin/pedidos"
            className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            ← Volver a pedidos
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pedido #{order.order_number}
            </h1>
            <p className="text-sm text-gray-500">
              Creado el {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getStatusClasses(
            order.status
          )}`}
        >
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Productos
            </h2>

            <div className="space-y-4">
              {order.order_items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {item.product_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} x {formatCurrency(Number(item.unit_price))}
                    </p>
                  </div>

                  <p className="shrink-0 font-semibold text-gray-900">
                    {formatCurrency(Number(item.line_total))}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {order.notes ? (
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Observaciones
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                {order.notes}
              </p>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Cliente
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Nombre</p>
                <p className="font-medium text-gray-900">
                  {order.customer_name || 'No informado'}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Teléfono</p>
                <p className="font-medium text-gray-900">
                  {order.customer_phone || 'No informado'}
                </p>
              </div>

              {order.customer_email ? (
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">
                    {order.customer_email}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Entrega
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Tipo</p>
                <p className="font-medium text-gray-900">
                  {order.delivery_type === 'delivery' ? 'Envío' : 'Retiro'}
                </p>
              </div>

              {order.delivery_address ? (
                <div>
                  <p className="text-gray-500">Dirección</p>
                  <p className="font-medium text-gray-900">
                    {order.delivery_address}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Totales
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(Number(order.subtotal))}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Envío</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(Number(order.shipping_cost))}
                </span>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(Number(order.total))}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Cambiar estado
            </h2>

            <UpdateOrderStatus
              orderId={order.id}
              currentStatus={order.status}
            />
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
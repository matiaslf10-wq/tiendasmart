import { createClient } from '@/lib/supabase/server';

export default async function PedidosPage() {
  const supabase = await createClient();

  // ⚠️ Acá deberías obtener el store_id según el usuario
  // Por ahora lo dejamos fijo o lo resolvemos después
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
    return <div>Error cargando pedidos</div>;
  }

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Pedidos</h1>

      {!orders || orders.length === 0 ? (
        <p>No hay pedidos todavía.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border p-4 flex justify-between"
            >
              <div>
                <p className="font-semibold">
                  Pedido #{order.order_number}
                </p>
                <p className="text-sm text-gray-500">
                  {order.customer_name}
                </p>
                <p className="text-sm text-gray-500">
                  {order.customer_phone}
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold">
                  ${order.total}
                </p>
                <p className="text-sm">{order.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
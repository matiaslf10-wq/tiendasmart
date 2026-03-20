'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';

const VALID_STATUSES = [
  'pending',
  'confirmed',
  'in_preparation',
  'ready',
  'delivered',
  'cancelled',
] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];

export async function bulkUpdateOrdersStatus(
  orderIds: string[],
  status: string
) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return { success: false, error: 'No hay pedidos para actualizar.' };
  }

  if (!VALID_STATUSES.includes(status as OrderStatus)) {
    return { success: false, error: 'Estado inválido.' };
  }

  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    return { success: false, error: 'No autorizado.' };
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { success: false, error: 'Sin permisos.' };
  }

  const store = membership.stores;
  const supabase = await createClient();

  const uniqueIds = [...new Set(orderIds.filter(Boolean))];

  const { data: orders, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, store_id')
    .in('id', uniqueIds)
    .eq('store_id', store.id);

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const pendingOrders = (orders ?? []).filter(
    (order) => order.status === 'pending'
  );

  if (pendingOrders.length === 0) {
    return {
      success: false,
      error: 'No hay pedidos pendientes para actualizar.',
    };
  }

  const pendingIds = pendingOrders.map((order) => order.id);

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status })
    .in('id', pendingIds)
    .eq('store_id', store.id);

  if (updateError) {
    return { success: false, error: 'No se pudieron actualizar los pedidos.' };
  }

  const { error: historyError } = await supabase
    .from('order_status_history')
    .insert(
      pendingOrders.map((order) => ({
        order_id: order.id,
        store_id: store.id,
        from_status: order.status,
        to_status: status,
        changed_by: 'admin_bulk',
      }))
    );

  if (historyError) {
    return {
      success: false,
      error: 'Los pedidos se actualizaron, pero falló el historial.',
    };
  }

  revalidatePath('/admin/pedidos');

  for (const orderId of pendingIds) {
    revalidatePath(`/admin/pedidos/${orderId}`);
  }

  return {
    success: true,
    updatedCount: pendingIds.length,
  };
}
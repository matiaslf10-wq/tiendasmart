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

export async function updateOrderStatus(orderId: string, status: string) {
  if (!orderId) {
    return { success: false, error: 'Falta el ID del pedido.' };
  }

  if (!VALID_STATUSES.includes(status as OrderStatus)) {
    return { success: false, error: 'Estado inválido.' };
  }

  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    return { success: false, error: 'No autorizado.' };
  }

  const store = membership.stores;

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { success: false, error: 'Sin permisos.' };
  }

  const supabase = await createClient();

  const { data: currentOrder, error: currentOrderError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('store_id', store.id)
    .single();

  if (currentOrderError || !currentOrder) {
    return { success: false, error: 'Pedido no encontrado o sin permisos.' };
  }

  if (currentOrder.status === status) {
    return { success: true };
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('store_id', store.id);

  if (updateError) {
    return { success: false, error: 'No se pudo actualizar el estado.' };
  }

  const { error: historyError } = await supabase
    .from('order_status_history')
    .insert({
      order_id: orderId,
      store_id: store.id,
      from_status: currentOrder.status,
      to_status: status,
      changed_by: 'admin',
    });

  if (historyError) {
    return {
      success: false,
      error: 'Se actualizó el estado, pero falló el historial.',
    };
  }

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);

  return { success: true };
}
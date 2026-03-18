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

  // 🔒 Validar que el pedido pertenece a la tienda
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, store_id')
    .eq('id', orderId)
    .eq('store_id', store.id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!order) {
    return { success: false, error: 'Pedido no encontrado o sin permisos.' };
  }

  // ✅ Update seguro
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('store_id', store.id);

  if (error) {
    return { success: false, error: 'No se pudo actualizar el estado.' };
  }

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);

  return { success: true };
}
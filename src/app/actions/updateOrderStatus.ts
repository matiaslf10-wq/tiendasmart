'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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

  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    return { success: false, error: 'No se pudo actualizar el estado.' };
  }

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);

  return { success: true };
}
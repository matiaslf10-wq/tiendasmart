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

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_preparation', 'cancelled'],
  in_preparation: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const changedBy =
    user?.email ||
    user?.id ||
    (membership.role === 'owner' ? 'owner' : 'admin');

  const { data: currentOrder, error: currentOrderError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('store_id', store.id)
    .single();

  if (currentOrderError || !currentOrder) {
    return { success: false, error: 'Pedido no encontrado o sin permisos.' };
  }

  const currentStatus = currentOrder.status as OrderStatus;
  const nextStatus = status as OrderStatus;

  if (currentStatus === nextStatus) {
    return { success: true };
  }

  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  if (!allowedNextStatuses.includes(nextStatus)) {
    return {
      success: false,
      error: `No se puede pasar de "${getStatusLabel(
        currentStatus
      )}" a "${getStatusLabel(nextStatus)}".`,
    };
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
      from_status: currentStatus,
      to_status: nextStatus,
      changed_by: changedBy,
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
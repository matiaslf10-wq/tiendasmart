'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateOrderStatus(
  orderId: string,
  status: string
) {
  const supabase = await createClient();

  await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);
}
'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserStore } from '@/lib/stores';
import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/plans';

export async function createProduct(formData: FormData) {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    throw new Error('No autorizado');
  }

  const store = membership.stores;

  if (!hasFeature(store.plan, 'products')) {
    throw new Error('Tu plan no incluye productos');
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new Error('No tenés permisos para crear productos');
  }

  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const priceRaw = String(formData.get('price') || '0').trim();
  const imageUrl = String(formData.get('image_url') || '').trim();

  const price = Number(priceRaw);

  if (!name) {
    throw new Error('El nombre es obligatorio');
  }

  if (Number.isNaN(price) || price < 0) {
    throw new Error('El precio no es válido');
  }

  const supabase = await createClient();

  const { error } = await supabase.from('products').insert({
    store_id: store.id,
    name,
    description: description || null,
    price,
    image_url: imageUrl || null,
    is_active: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/productos');
}
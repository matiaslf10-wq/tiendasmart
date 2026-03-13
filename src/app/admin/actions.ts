'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function updateStoreSettings(formData: FormData) {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    throw new Error('No autorizado');
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new Error('No tenés permisos para editar la tienda');
  }

  const storeId = membership.stores.id;
  const oldSlug = membership.stores.slug;

  const rawName = String(formData.get('name') || '').trim();
  const rawSlug = String(formData.get('slug') || '').trim();
  const rawWhatsApp = String(formData.get('whatsapp_number') || '').trim();
  const rawLogoUrl = String(formData.get('logo_url') || '').trim();
  const rawCoverUrl = String(formData.get('cover_url') || '').trim();

  const name = rawName;
  const slug = normalizeSlug(rawSlug);
  const whatsappNumber = rawWhatsApp.replace(/\D/g, '');
  const logoUrl = rawLogoUrl || null;
  const coverUrl = rawCoverUrl || null;

  if (!name) {
    throw new Error('El nombre de la tienda es obligatorio');
  }

  if (!slug) {
    throw new Error('El slug es obligatorio');
  }

  if (slug.length < 3) {
    throw new Error('El slug debe tener al menos 3 caracteres');
  }

  if (!whatsappNumber) {
    throw new Error('El número de WhatsApp es obligatorio');
  }

  if (whatsappNumber.length < 10) {
    throw new Error('El número de WhatsApp es demasiado corto');
  }

  const supabase = await createClient();

  const { data: existingStore, error: existingError } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .neq('id', storeId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingStore) {
    throw new Error('Ese slug ya está en uso');
  }

  const { error } = await supabase
    .from('stores')
    .update({
      name,
      slug,
      subdomain: slug,
      whatsapp_number: whatsappNumber,
      logo_url: logoUrl,
      cover_url: coverUrl,
    })
    .eq('id', storeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath(`/${oldSlug}`);
  revalidatePath(`/${slug}`);
}
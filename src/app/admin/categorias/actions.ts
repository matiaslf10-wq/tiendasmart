'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUserStore } from '@/lib/stores';
import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/plans';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function getAuthorizedStore() {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    throw new Error('No autorizado');
  }

  const store = membership.stores;

  if (!hasFeature(store.plan, 'categories')) {
    throw new Error('Tu plan no incluye categorías');
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new Error('No tenés permisos para gestionar categorías');
  }

  return { membership, store };
}

async function ensureCategoryBelongsToStore(categoryId: string, storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('id, store_id')
    .eq('id', categoryId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Categoría no encontrada o sin permisos');
  }

  return data;
}

async function ensureUniqueSlugForStore(
  storeId: string,
  slug: string,
  excludeCategoryId?: string
) {
  const supabase = await createClient();

  let query = supabase
    .from('categories')
    .select('id')
    .eq('store_id', storeId)
    .eq('slug', slug);

  if (excludeCategoryId) {
    query = query.neq('id', excludeCategoryId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length > 0) {
    throw new Error('Ya existe una categoría con ese slug en esta tienda');
  }
}

export async function createCategory(formData: FormData) {
  try {
    const { store } = await getAuthorizedStore();
    const supabase = await createClient();

    const name = String(formData.get('name') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const slugInput = String(formData.get('slug') || '').trim();
    const sortOrderRaw = String(formData.get('sort_order') || '0').trim();

    const slug = slugify(slugInput || name);
    const sortOrder = Number(sortOrderRaw);

    if (!name) {
      throw new Error('El nombre es obligatorio');
    }

    if (!slug) {
      throw new Error('El slug es obligatorio');
    }

    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      throw new Error('El orden no es válido');
    }

    await ensureUniqueSlugForStore(store.id, slug);

    const { error } = await supabase.from('categories').insert({
      store_id: store.id,
      name,
      slug,
      description: description || null,
      is_active: true,
      sort_order: sortOrder,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/admin/categorias');
    revalidatePath('/admin/productos');
    revalidatePath(`/${store.slug}`);
    redirect('/admin/categorias?success=created');
  } catch (error) {
    console.error('Error creando categoría:', error);
    redirect('/admin/categorias?error=create');
  }
}

export async function updateCategory(formData: FormData) {
  try {
    const { store } = await getAuthorizedStore();
    const supabase = await createClient();

    const categoryId = String(formData.get('category_id') || '').trim();
    const name = String(formData.get('name') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const slugInput = String(formData.get('slug') || '').trim();
    const sortOrderRaw = String(formData.get('sort_order') || '0').trim();

    const slug = slugify(slugInput || name);
    const sortOrder = Number(sortOrderRaw);

    if (!categoryId) {
      throw new Error('Falta la categoría');
    }

    if (!name) {
      throw new Error('El nombre es obligatorio');
    }

    if (!slug) {
      throw new Error('El slug es obligatorio');
    }

    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      throw new Error('El orden no es válido');
    }

    await ensureCategoryBelongsToStore(categoryId, store.id);
    await ensureUniqueSlugForStore(store.id, slug, categoryId);

    const { error } = await supabase
      .from('categories')
      .update({
        name,
        slug,
        description: description || null,
        sort_order: sortOrder,
      })
      .eq('id', categoryId)
      .eq('store_id', store.id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/admin/categorias');
    revalidatePath('/admin/productos');
    revalidatePath(`/${store.slug}`);
    redirect('/admin/categorias?success=updated');
  } catch (error) {
    console.error('Error actualizando categoría:', error);
    redirect('/admin/categorias?error=update');
  }
}

export async function toggleCategoryActive(formData: FormData) {
  try {
    const { store } = await getAuthorizedStore();
    const supabase = await createClient();

    const categoryId = String(formData.get('category_id') || '').trim();
    const currentValue =
      String(formData.get('current_value') || '').trim() === 'true';

    if (!categoryId) {
      throw new Error('Falta la categoría');
    }

    await ensureCategoryBelongsToStore(categoryId, store.id);

    const { error } = await supabase
      .from('categories')
      .update({
        is_active: !currentValue,
      })
      .eq('id', categoryId)
      .eq('store_id', store.id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/admin/categorias');
    revalidatePath('/admin/productos');
    revalidatePath(`/${store.slug}`);
    redirect('/admin/categorias?success=status-updated');
  } catch (error) {
    console.error('Error cambiando estado de categoría:', error);
    redirect('/admin/categorias?error=toggle-status');
  }
}

export async function deleteCategory(formData: FormData) {
  try {
    const { store } = await getAuthorizedStore();
    const supabase = await createClient();

    const categoryId = String(formData.get('category_id') || '').trim();

    if (!categoryId) {
      throw new Error('Falta la categoría');
    }

    await ensureCategoryBelongsToStore(categoryId, store.id);

    const { error: clearProductsError } = await supabase
      .from('products')
      .update({ category_id: null })
      .eq('category_id', categoryId)
      .eq('store_id', store.id);

    if (clearProductsError) {
      throw new Error(clearProductsError.message);
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('store_id', store.id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/admin/categorias');
    revalidatePath('/admin/productos');
    revalidatePath(`/${store.slug}`);
    redirect('/admin/categorias?success=deleted');
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    redirect('/admin/categorias?error=delete');
  }
}
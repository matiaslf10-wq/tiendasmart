'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUserStore } from '@/lib/stores';
import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/plans';
import { uploadProductImage } from '@/lib/storage';

async function getAuthorizedStore() {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    throw new Error('No autorizado');
  }

  const store = membership.stores;

  if (!hasFeature(store.plan, 'products')) {
    throw new Error('Tu plan no incluye productos');
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new Error('No tenés permisos para gestionar productos');
  }

  return { membership, store };
}

async function ensureProductBelongsToStore(productId: string, storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, store_id')
    .eq('id', productId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Producto no encontrado o sin permisos');
  }

  return data;
}

async function ensureCategoryBelongsToStore(categoryId: string, storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('id, store_id, is_active')
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

export async function createProduct(formData: FormData) {
  const { store } = await getAuthorizedStore();
  const supabase = await createClient();

  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const priceRaw = String(formData.get('price') || '0').trim();
  const coverIndexRaw = String(formData.get('cover_index') || '0').trim();
  const categoryIdRaw = String(formData.get('category_id') || '').trim();

  const price = Number(priceRaw);
  const coverIndex = Number(coverIndexRaw);
  const categoryId = categoryIdRaw || null;

  if (!name) {
    throw new Error('El nombre es obligatorio');
  }

  if (Number.isNaN(price) || price < 0) {
    throw new Error('El precio no es válido');
  }

  if (categoryId) {
    const category = await ensureCategoryBelongsToStore(categoryId, store.id);

    if (!category.is_active) {
      throw new Error('La categoría seleccionada está inactiva');
    }
  }

  const { data: insertedProducts, error } = await supabase
    .from('products')
    .insert({
      store_id: store.id,
      name,
      description: description || null,
      price,
      is_active: true,
      image_url: null,
      category_id: categoryId,
    })
    .select('id');

  if (error || !insertedProducts || insertedProducts.length === 0) {
    throw new Error(error?.message || 'No se pudo crear el producto');
  }

  const productId = insertedProducts[0].id;
  const uploadedUrls: string[] = [];

  for (let i = 0; i < 5; i++) {
    const file = formData.get(`image_file_${i}`) as File | null;

    if (file && file.size > 0) {
      const url = await uploadProductImage(file);
      uploadedUrls.push(url);
    }
  }

  if (uploadedUrls.length > 0) {
    const safeCoverIndex = Number.isNaN(coverIndex)
      ? 0
      : Math.min(Math.max(coverIndex, 0), uploadedUrls.length - 1);

    const rows = uploadedUrls.map((url, index) => ({
      product_id: productId,
      image_url: url,
      sort_order: index,
      is_cover: index === safeCoverIndex,
    }));

    const { error: imagesError } = await supabase
      .from('product_images')
      .insert(rows);

    if (imagesError) {
      throw new Error(imagesError.message);
    }

    const { error: updateProductError } = await supabase
      .from('products')
      .update({
        image_url: uploadedUrls[safeCoverIndex],
      })
      .eq('id', productId)
      .eq('store_id', store.id);

    if (updateProductError) {
      throw new Error(updateProductError.message);
    }
  }

  revalidatePath('/admin/productos');
  revalidatePath('/admin/categorias');
  revalidatePath(`/${store.slug}`);
  redirect('/admin/productos?success=created');
}

export async function updateProduct(formData: FormData) {
  const { store } = await getAuthorizedStore();
  const supabase = await createClient();

  const productId = String(formData.get('product_id') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const priceRaw = String(formData.get('price') || '0').trim();
  const coverImageId = String(formData.get('cover_image_id') || '').trim();
  const categoryIdRaw = String(formData.get('category_id') || '').trim();

  const price = Number(priceRaw);
  const categoryId = categoryIdRaw || null;

  if (!productId) {
    throw new Error('Falta el producto');
  }

  await ensureProductBelongsToStore(productId, store.id);

  if (!name) {
    throw new Error('El nombre es obligatorio');
  }

  if (Number.isNaN(price) || price < 0) {
    throw new Error('El precio no es válido');
  }

  if (categoryId) {
    const category = await ensureCategoryBelongsToStore(categoryId, store.id);

    if (!category.is_active) {
      throw new Error('La categoría seleccionada está inactiva');
    }
  }

  const { error } = await supabase
    .from('products')
    .update({
      name,
      description: description || null,
      price,
      category_id: categoryId,
    })
    .eq('id', productId)
    .eq('store_id', store.id);

  if (error) {
    throw new Error(error.message);
  }

  const existingImagesResponse = await supabase
    .from('product_images')
    .select('id, image_url')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (existingImagesResponse.error) {
    throw new Error(existingImagesResponse.error.message);
  }

  const existingImages = existingImagesResponse.data || [];
  const currentCount = existingImages.length;
  const remainingSlots = Math.max(0, 5 - currentCount);
  const newUrls: string[] = [];

  for (let i = 0; i < remainingSlots; i++) {
    const file = formData.get(`new_image_file_${i}`) as File | null;

    if (file && file.size > 0) {
      const url = await uploadProductImage(file);
      newUrls.push(url);
    }
  }

  if (newUrls.length > 0) {
    const rows = newUrls.map((url, index) => ({
      product_id: productId,
      image_url: url,
      sort_order: currentCount + index,
      is_cover: false,
    }));

    const { error: insertImagesError } = await supabase
      .from('product_images')
      .insert(rows);

    if (insertImagesError) {
      throw new Error(insertImagesError.message);
    }
  }

  const { data: allImagesAfterInsert, error: allImagesError } = await supabase
    .from('product_images')
    .select('id, image_url, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (allImagesError) {
    throw new Error(allImagesError.message);
  }

  const finalImages = allImagesAfterInsert || [];

  if (finalImages.length === 0) {
    const { error: clearProductImageError } = await supabase
      .from('products')
      .update({ image_url: null })
      .eq('id', productId)
      .eq('store_id', store.id);

    if (clearProductImageError) {
      throw new Error(clearProductImageError.message);
    }

    revalidatePath('/admin/productos');
    revalidatePath('/admin/categorias');
    revalidatePath(`/${store.slug}`);
    redirect('/admin/productos?success=updated');
  }

  const chosenCover =
    finalImages.find((img) => img.id === coverImageId) || finalImages[0];

  const { error: resetCoverError } = await supabase
    .from('product_images')
    .update({ is_cover: false })
    .eq('product_id', productId);

  if (resetCoverError) {
    throw new Error(resetCoverError.message);
  }

  const { error: setCoverError } = await supabase
    .from('product_images')
    .update({ is_cover: true })
    .eq('id', chosenCover.id)
    .eq('product_id', productId);

  if (setCoverError) {
    throw new Error(setCoverError.message);
  }

  const { error: updateProductCoverError } = await supabase
    .from('products')
    .update({
      image_url: chosenCover.image_url,
    })
    .eq('id', productId)
    .eq('store_id', store.id);

  if (updateProductCoverError) {
    throw new Error(updateProductCoverError.message);
  }

  revalidatePath('/admin/productos');
  revalidatePath('/admin/categorias');
  revalidatePath(`/${store.slug}`);
  redirect('/admin/productos?success=updated');
}

export async function deleteProductImage(formData: FormData) {
  const { store } = await getAuthorizedStore();
  const supabase = await createClient();

  const productId = String(formData.get('product_id') || '').trim();
  const imageId = String(formData.get('image_id') || '').trim();

  if (!productId || !imageId) {
    throw new Error('Faltan datos');
  }

  await ensureProductBelongsToStore(productId, store.id);

  const { data: imageToDelete, error: imageToDeleteError } = await supabase
    .from('product_images')
    .select('id, image_url, is_cover')
    .eq('id', imageId)
    .eq('product_id', productId)
    .maybeSingle();

  if (imageToDeleteError) {
    throw new Error(imageToDeleteError.message);
  }

  if (!imageToDelete) {
    throw new Error('La imagen no existe');
  }

  const { error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', productId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { data: remaining, error: remainingError } = await supabase
    .from('product_images')
    .select('id, image_url, is_cover, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (remainingError) {
    throw new Error(remainingError.message);
  }

  const remainingImages = remaining || [];

  if (remainingImages.length === 0) {
    const { error: clearProductImageError } = await supabase
      .from('products')
      .update({ image_url: null })
      .eq('id', productId)
      .eq('store_id', store.id);

    if (clearProductImageError) {
      throw new Error(clearProductImageError.message);
    }

    revalidatePath('/admin/productos');
    revalidatePath('/admin/categorias');
    revalidatePath(`/${store.slug}`);
    redirect('/admin/productos?success=image-deleted');
  }

  let newCover = remainingImages.find((img) => img.is_cover) || null;

  if (!newCover) {
    newCover = remainingImages[0];

    const { error: resetCoverError } = await supabase
      .from('product_images')
      .update({ is_cover: false })
      .eq('product_id', productId);

    if (resetCoverError) {
      throw new Error(resetCoverError.message);
    }

    const { error: setCoverError } = await supabase
      .from('product_images')
      .update({ is_cover: true })
      .eq('id', newCover.id)
      .eq('product_id', productId);

    if (setCoverError) {
      throw new Error(setCoverError.message);
    }
  }

  const { error: updateProductError } = await supabase
    .from('products')
    .update({ image_url: newCover.image_url })
    .eq('id', productId)
    .eq('store_id', store.id);

  if (updateProductError) {
    throw new Error(updateProductError.message);
  }

  revalidatePath('/admin/productos');
  revalidatePath('/admin/categorias');
  revalidatePath(`/${store.slug}`);
  redirect('/admin/productos?success=image-deleted');
}

export async function toggleProductActive(formData: FormData) {
  const { store } = await getAuthorizedStore();
  const supabase = await createClient();

  const productId = String(formData.get('product_id') || '').trim();
  const currentValue = String(formData.get('current_value') || '').trim() === 'true';

  if (!productId) {
    throw new Error('Falta el producto');
  }

  await ensureProductBelongsToStore(productId, store.id);

  const { error } = await supabase
    .from('products')
    .update({
      is_active: !currentValue,
    })
    .eq('id', productId)
    .eq('store_id', store.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/productos');
  revalidatePath('/admin/categorias');
  revalidatePath(`/${store.slug}`);
  redirect('/admin/productos?success=status-updated');
}
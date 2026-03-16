import { createClient } from '@/lib/supabase/server';

export async function uploadImage(
  file: File,
  folder: 'logos' | 'covers' | 'products'
): Promise<string> {
  const supabase = await createClient();

  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('stores')
    .upload(filePath, fileBytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Error subiendo imagen: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('stores').getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error('No se pudo obtener la URL pública de la imagen');
  }

  return data.publicUrl;
}

export async function uploadStoreImage(
  file: File,
  folder: 'logos' | 'covers'
): Promise<string> {
  return uploadImage(file, folder);
}

export async function uploadProductImage(file: File): Promise<string> {
  return uploadImage(file, 'products');
}
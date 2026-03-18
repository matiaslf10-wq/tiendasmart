import { createClient } from '@/lib/supabase/client';

function buildFilePath(folder: 'logos' | 'covers' | 'products', file: File) {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  return `${folder}/${fileName}`;
}

export async function uploadImageFromClient(
  file: File,
  folder: 'logos' | 'covers' | 'products'
): Promise<string> {
  const supabase = createClient();
  const filePath = buildFilePath(folder, file);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No hay sesión activa en el cliente para subir imágenes.');
  }

  const { error: uploadError } = await supabase.storage
    .from('stores')
    .upload(filePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
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

export async function uploadProductImageFromClient(file: File): Promise<string> {
  return uploadImageFromClient(file, 'products');
}
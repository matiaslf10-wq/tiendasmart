import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function buildFilePath(folder: 'logos' | 'covers' | 'products', file: File) {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  return `${folder}/${fileName}`;
}

export async function uploadImageFromClient(
  file: File,
  folder: 'logos' | 'covers' | 'products'
): Promise<string> {
  const filePath = buildFilePath(folder, file);

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
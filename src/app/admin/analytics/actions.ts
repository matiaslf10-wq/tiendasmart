'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';

type AnalyticsApiKeyResult = {
  apiKey: string;
};

function generateApiKey() {
  return `tsk_${crypto.randomBytes(24).toString('hex')}`;
}

export async function ensureAnalyticsApiKey(): Promise<AnalyticsApiKeyResult> {
  const membership = await getCurrentUserStore();

  if (!membership?.stores) {
    throw new Error('No autorizado');
  }

  const store = membership.stores;

  if (store.analytics_api_key) {
    return { apiKey: store.analytics_api_key };
  }

  const supabase = await createClient();
  const apiKey = generateApiKey();

  const { error } = await supabase
    .from('stores')
    .update({ analytics_api_key: apiKey })
    .eq('id', store.id);

  if (error) {
    throw new Error(`No se pudo generar la API key: ${error.message}`);
  }

  revalidatePath('/admin/analytics');

  return { apiKey };
}

export async function regenerateAnalyticsApiKey(): Promise<AnalyticsApiKeyResult> {
  const membership = await getCurrentUserStore();

  if (!membership?.stores) {
    throw new Error('No autorizado');
  }

  const store = membership.stores;
  const supabase = await createClient();
  const apiKey = generateApiKey();

  const { error } = await supabase
    .from('stores')
    .update({ analytics_api_key: apiKey })
    .eq('id', store.id);

  if (error) {
    throw new Error(`No se pudo regenerar la API key: ${error.message}`);
  }

  revalidatePath('/admin/analytics');

  return { apiKey };
}

export async function regenerateAnalyticsApiKeyAction(
  _formData: FormData
): Promise<void> {
  await regenerateAnalyticsApiKey();
}
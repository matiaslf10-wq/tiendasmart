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

  if (!membership?.stores || !['owner', 'admin'].includes(membership.role) || !['pro','intelligence'].includes(membership.stores.plan) || !membership.stores.is_active) {
    throw new Error('No autorizado');
  }

  const store = membership.stores;

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase.from('store_analytics_keys').select('api_key').eq('store_id', store.id).maybeSingle();
  if (readError) throw new Error('No se pudo consultar la clave');
  if (existing) return { apiKey: existing.api_key };
  const apiKey = generateApiKey();

  const { error } = await supabase
    .from('store_analytics_keys')
    .upsert({ store_id: store.id, api_key: apiKey }, { onConflict: 'store_id' });

  if (error) {
    throw new Error(`No se pudo generar la API key: ${error.message}`);
  }

  return { apiKey };
}

export async function regenerateAnalyticsApiKey(): Promise<AnalyticsApiKeyResult> {
  const membership = await getCurrentUserStore();

  if (!membership?.stores || !['owner', 'admin'].includes(membership.role) || !['pro','intelligence'].includes(membership.stores.plan) || !membership.stores.is_active) {
    throw new Error('No autorizado');
  }

  const store = membership.stores;
  const supabase = await createClient();
  const apiKey = generateApiKey();

  const { error } = await supabase
    .from('store_analytics_keys')
    .upsert({ store_id: store.id, api_key: apiKey }, { onConflict: 'store_id' });

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
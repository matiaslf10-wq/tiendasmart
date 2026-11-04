import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Plan } from '@/lib/plans';

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  is_active: boolean;
  whatsapp_number?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  google_analytics_id?: string | null;
  google_analytics_property_id?: string | null;
};

type StoreMembershipRow = {
  role: 'owner' | 'admin' | 'staff';
  stores: StoreRow[] | StoreRow | null;
};

type StoreMembership = {
  role: 'owner' | 'admin' | 'staff';
  stores: StoreRow | null;
};

export async function getCurrentUserStore(): Promise<StoreMembership | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  const { data: registration, error: registrationError } = await supabase.from('store_registrations').select('access_state').eq('user_id', user.id).maybeSingle();
  if (registrationError) throw new Error('No se pudo comprobar la activación de tu tienda');
  if (registration?.access_state === 'pending_payment') redirect('/signup/cobro');

  const { data, error } = await supabase
    .from('store_users')
    .select(`
      role,
      stores (
        id,
        name,
        slug,
        plan,
        is_active,
        whatsapp_number,
        logo_url,
        cover_url,
        google_analytics_id,
        google_analytics_property_id
      )
    `)
    .eq('user_id', user.id)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0] as StoreMembershipRow;

  const store = Array.isArray(row.stores)
    ? (row.stores[0] ?? null)
    : (row.stores ?? null);

  return {
    role: row.role,
    stores: store,
  };
}
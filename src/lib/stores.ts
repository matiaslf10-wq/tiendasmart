import { createClient } from '@/lib/supabase/server';

type StoreMembership = {
  role: 'owner' | 'admin' | 'staff';
  stores: {
    id: string;
    name: string;
    slug: string;
    plan: 'esencial' | 'pro' | 'intelligence';
    is_active: boolean;
    whatsapp_number?: string | null;
    logo_url?: string | null;
    cover_url?: string | null;
  } | null;
};

export async function getCurrentUserStore(): Promise<StoreMembership | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

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
        cover_url
      )
    `)
    .eq('user_id', user.id)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0] as unknown as StoreMembership;
}
import { createClient } from '@/lib/supabase/server';

export default async function DebugMembershipPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Debug Membership</h1>
        <p>No hay usuario logueado.</p>
      </main>
    );
  }

  const membershipQuery = await supabase
    .from('store_users')
    .select(`
      id,
      store_id,
      user_id,
      role,
      stores (
        id,
        name,
        slug,
        plan,
        is_active
      )
    `)
    .eq('user_id', user.id);

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Debug Membership</h1>

      <div>
        <h2 className="font-semibold mb-2">Usuario actual</h2>
        <pre className="bg-gray-100 p-4 rounded-xl overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Consulta store_users</h2>
        <pre className="bg-gray-100 p-4 rounded-xl overflow-auto">
          {JSON.stringify(membershipQuery, null, 2)}
        </pre>
      </div>
    </main>
  );
}
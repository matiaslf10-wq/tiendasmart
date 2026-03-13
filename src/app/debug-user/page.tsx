import { createClient } from '@/lib/supabase/server';

export default async function DebugUserPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Debug User</h1>

      {error && (
        <pre className="bg-red-50 text-red-700 p-4 rounded-xl overflow-auto">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <pre className="bg-gray-100 p-4 rounded-xl overflow-auto">
        {JSON.stringify(user, null, 2)}
      </pre>
    </main>
  );
}
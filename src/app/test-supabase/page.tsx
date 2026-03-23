import { createClient } from '@/lib/supabase/server';

export default async function TestSupabasePage() {
  const supabase = await createClient();

  const { data, error } = await supabase.from('stores').select('*').limit(5);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Supabase</h1>

      {error ? (
        <pre className="bg-red-50 text-red-700 p-4 rounded-xl overflow-auto">
          {JSON.stringify(error, null, 2)}
        </pre>
      ) : (
        <pre className="bg-gray-100 p-4 rounded-xl overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}Remove-Item -Recurse -Force src/app/test-supabase
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';
import { hasFeature } from '@/lib/plans';
import CategoryCreateForm from '@/components/admin/CategoryCreateForm';
import CategoryEditForm from '@/components/admin/CategoryEditForm';
import AdminShell from '@/components/admin/AdminShell';
import AdminStatCard from '@/components/admin/AdminStatCard';

type CategoriasPageProps = {
  searchParams?: Promise<{
    success?: string;
  }>;
};

function getSuccessMessage(success?: string) {
  switch (success) {
    case 'created':
      return 'Categoría creada correctamente.';
    case 'updated':
      return 'Categoría actualizada correctamente.';
    case 'status-updated':
      return 'Estado de la categoría actualizado.';
    case 'deleted':
      return 'Categoría eliminada correctamente.';
    default:
      return null;
  }
}

export default async function CategoriasPage({
  searchParams,
}: CategoriasPageProps) {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    redirect('/login');
  }

  const store = membership.stores;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const successMessage = getSuccessMessage(resolvedSearchParams?.success);

  if (!hasFeature(store.plan, 'categories')) {
    return (
      <main className="p-8 space-y-4">
        <h1 className="text-3xl font-bold">Categorías</h1>
        <p>Tu plan no incluye gestión de categorías.</p>
      </main>
    );
  }

  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      slug,
      description,
      is_active,
      sort_order,
      created_at
    `)
    .eq('store_id', store.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  const safeCategories = categories || [];

  const total = safeCategories.length;
  const active = safeCategories.filter((c) => c.is_active).length;
  const inactive = total - active;

  return (
    <AdminShell
  title="Categorías"
  subtitle={`Tienda: ${store.name}`}
  storeName={store.name}
  storeSlug={store.slug}
  plan={store.plan}
  current="categorias"
  pendingOrdersCount={0}
>
      <p className="text-sm text-gray-500 -mt-2">
        Organizá cómo se agrupan los productos en tu tienda.
      </p>

      {/* 🔥 MÉTRICAS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard
          label="Categorías totales"
          value={total}
        />
        <AdminStatCard
          label="Activas"
          value={active}
          tone="success"
        />
        <AdminStatCard
          label="Inactivas"
          value={inactive}
          tone="warning"
        />
      </section>

      {successMessage && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          {successMessage}
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold">Crear categoría</h2>
        <CategoryCreateForm />
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold">Listado</h2>

        {error ? (
          <pre className="overflow-auto rounded-xl bg-red-50 p-4 text-red-700">
            {JSON.stringify(error, null, 2)}
          </pre>
        ) : safeCategories.length === 0 ? (
          <p>No hay categorías cargadas todavía.</p>
        ) : (
          <div className="grid gap-4">
            {safeCategories.map((category) => (
              <CategoryEditForm key={category.id} category={category} />
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
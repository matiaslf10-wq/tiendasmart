import { getCurrentUserStore } from '@/lib/stores';
import { hasFeature } from '@/lib/plans';
import AdminShell from '@/components/admin/AdminShell';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { createClient } from '@/lib/supabase/server';
import { updateStoreSettings } from './actions';

export default async function AdminPage() {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    return (
      <main className="p-8 space-y-4">
        <h1 className="text-3xl font-bold">Panel admin</h1>
        <p>No tenés una tienda asignada todavía.</p>
      </main>
    );
  }

  const store = membership.stores;

  const supabase = await createClient();

  const [
    { count: productsCount },
    { count: categoriesCount },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id),

    supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id),
  ]);

  return (
    <AdminShell
  title="Pedidos"
  subtitle={`Tienda: ${store.name}`}
  storeName={store.name}
  storeSlug={store.slug}
  plan={store.plan}
  current="pedidos"
  pendingOrdersCount={0}
>
      {/* 🔥 MÉTRICAS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Productos"
          value={productsCount ?? 0}
        />
        <AdminStatCard
          label="Categorías"
          value={categoriesCount ?? 0}
        />
        <AdminStatCard
          label="Plan"
          value={store.plan}
        />
        <AdminStatCard
          label="Estado"
          value={store.is_active ? 'Activa' : 'Inactiva'}
          tone={store.is_active ? 'success' : 'warning'}
        />
      </section>

      {/* INFO BÁSICA */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
        <p>
          <strong>Slug:</strong> {store.slug}
        </p>
        <p>
          <strong>Rol:</strong> {membership.role}
        </p>
        <p>
          <strong>Tienda pública:</strong> /{store.slug}
        </p>
      </div>

      {/* FEATURES */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
        <h2 className="text-xl font-semibold">Features disponibles</h2>
        <ul className="list-disc pl-6">
          <li>Productos: {hasFeature(store.plan, 'products') ? 'Sí' : 'No'}</li>
          <li>
            Categorías: {hasFeature(store.plan, 'categories') ? 'Sí' : 'No'}
          </li>
          <li>
            Pedidos básicos: {hasFeature(store.plan, 'basic_orders') ? 'Sí' : 'No'}
          </li>
          <li>Cupones: {hasFeature(store.plan, 'coupons') ? 'Sí' : 'No'}</li>
          <li>
            Analytics avanzados:{' '}
            {hasFeature(store.plan, 'advanced_analytics') ? 'Sí' : 'No'}
          </li>
          <li>IA: {hasFeature(store.plan, 'ai_descriptions') ? 'Sí' : 'No'}</li>
        </ul>
      </div>

      {/* CONFIG */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold">Configuración de la tienda</h2>

        <form action={updateStoreSettings} className="grid max-w-2xl gap-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nombre de la tienda</span>
            <input
              type="text"
              name="name"
              defaultValue={store.name}
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Slug / subdominio</span>
            <input
              type="text"
              name="slug"
              defaultValue={store.slug}
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </label>

          <p className="text-sm text-gray-600">
            URL pública: /{store.slug}
          </p>

          <label className="block space-y-2">
            <span className="text-sm font-medium">WhatsApp</span>
            <input
              type="text"
              name="whatsapp_number"
              defaultValue={store.whatsapp_number ?? ''}
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Logo URL</span>
            <input
              type="text"
              name="logo_url"
              defaultValue={store.logo_url ?? ''}
              className="w-full rounded-xl border px-4 py-3"
            />
          </label>

          {store.logo_url && (
            <img
              src={store.logo_url}
              alt="logo"
              className="h-20 w-20 rounded-xl border object-cover"
            />
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium">Subir logo</span>
            <input type="file" name="logo_file" accept="image/*" />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Portada URL</span>
            <input
              type="text"
              name="cover_url"
              defaultValue={store.cover_url ?? ''}
              className="w-full rounded-xl border px-4 py-3"
            />
          </label>

          {store.cover_url && (
            <img
              src={store.cover_url}
              alt="cover"
              className="h-32 w-full rounded-xl border object-cover"
            />
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium">Subir portada</span>
            <input type="file" name="cover_file" accept="image/*" />
          </label>

          <button
            type="submit"
            className="w-fit rounded-xl bg-black px-5 py-3 text-white"
          >
            Guardar cambios
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
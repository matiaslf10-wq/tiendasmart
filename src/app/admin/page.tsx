import { getCurrentUserStore } from '@/lib/stores';
import { hasFeature } from '@/lib/plans';
import AdminShell from '@/components/admin/AdminShell';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { createClient } from '@/lib/supabase/server';
import { updateStoreSettings } from './actions';

type AdminPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    return (
      <main className="space-y-4 p-8">
        <h1 className="text-3xl font-bold">Panel admin</h1>
        <p>No tenés una tienda asignada todavía.</p>
      </main>
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const wasSaved = resolvedSearchParams?.saved === '1';
  const errorMessage =
    resolvedSearchParams?.error === '1'
      ? 'No se pudieron guardar los cambios.'
      : null;

  const store = membership.stores;
  const supabase = await createClient();

  const [
    { count: productsCount },
    { count: categoriesCount },
    { count: ordersCount },
    { count: pendingOrdersCount },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id),

    supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id),

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id),

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .eq('status', 'pending'),
  ]);

  return (
    <AdminShell
      title="Panel"
      subtitle={`Tienda: ${store.name}`}
      storeName={store.name}
      storeSlug={store.slug}
      plan={store.plan}
      current="panel"
      pendingOrdersCount={pendingOrdersCount ?? 0}
    >
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Productos" value={productsCount ?? 0} />
          <AdminStatCard label="Categorías" value={categoriesCount ?? 0} />
          <AdminStatCard label="Pedidos" value={ordersCount ?? 0} />
          <AdminStatCard
            label="Pendientes"
            value={pendingOrdersCount ?? 0}
            tone={(pendingOrdersCount ?? 0) > 0 ? 'warning' : 'success'}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Plan" value={store.plan} />
          <AdminStatCard
            label="Estado"
            value={store.is_active ? 'Activa' : 'Inactiva'}
            tone={store.is_active ? 'success' : 'warning'}
          />
          <AdminStatCard label="Rol" value={membership.role} />
          <AdminStatCard label="Tienda pública" value={`/${store.slug}`} />
        </section>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Resumen de la tienda</h2>

          <div className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
            <p>
              <strong>Nombre:</strong> {store.name}
            </p>
            <p>
              <strong>Slug:</strong> {store.slug}
            </p>
            <p>
              <strong>Rol:</strong> {membership.role}
            </p>
            <p>
              <strong>Ruta pública:</strong> /{store.slug}
            </p>
            <p>
              <strong>Plan actual:</strong> {store.plan}
            </p>
            <p>
              <strong>Estado:</strong> {store.is_active ? 'Activa' : 'Inactiva'}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Features disponibles</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureBadge
              label="Productos"
              enabled={hasFeature(store.plan, 'products')}
            />
            <FeatureBadge
              label="Categorías"
              enabled={hasFeature(store.plan, 'categories')}
            />
            <FeatureBadge
              label="Pedidos básicos"
              enabled={hasFeature(store.plan, 'basic_orders')}
            />
            <FeatureBadge
              label="Cupones"
              enabled={hasFeature(store.plan, 'coupons')}
            />
            <FeatureBadge
              label="Analytics avanzados"
              enabled={hasFeature(store.plan, 'advanced_analytics')}
            />
            <FeatureBadge
              label="IA"
              enabled={hasFeature(store.plan, 'ai_descriptions')}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Configuración de la tienda</h2>

          {wasSaved ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">
                Los datos fueron guardados correctamente.
              </p>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-800">
                {errorMessage}
              </p>
            </div>
          ) : null}

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

            <p className="text-sm text-gray-600">URL pública: /{store.slug}</p>

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
              <span className="text-sm font-medium">
                Google Analytics ID (GA4)
              </span>
              <input
                type="text"
                name="google_analytics_id"
                defaultValue={store.google_analytics_id ?? ''}
                placeholder="G-XXXXXXXXXX"
                className="w-full rounded-xl border px-4 py-3"
              />
              <p className="text-sm text-gray-600">
                Es el Measurement ID. Se usa para enviar eventos desde la tienda
                pública.
              </p>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">GA4 Property ID</span>
              <input
                type="text"
                name="google_analytics_property_id"
                defaultValue={store.google_analytics_property_id ?? ''}
                placeholder="123456789"
                inputMode="numeric"
                className="w-full rounded-xl border px-4 py-3"
              />
              <p className="text-sm text-gray-600">
                Es el ID numérico de la propiedad GA4. Se usa para leer métricas
                desde el panel admin.
              </p>
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

            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt="logo"
                className="h-20 w-20 rounded-xl border object-cover"
              />
            ) : null}

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

            {store.cover_url ? (
              <img
                src={store.cover_url}
                alt="cover"
                className="h-32 w-full rounded-xl border object-cover"
              />
            ) : null}

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
      </div>
    </AdminShell>
  );
}

function FeatureBadge({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p
        className={`mt-1 text-xs font-semibold ${
          enabled ? 'text-emerald-600' : 'text-gray-500'
        }`}
      >
        {enabled ? 'Disponible' : 'No incluido'}
      </p>
    </div>
  );
}
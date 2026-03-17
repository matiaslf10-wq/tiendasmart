import { getCurrentUserStore } from '@/lib/stores';
import { hasFeature } from '@/lib/plans';
import AdminShell from '@/components/admin/AdminShell';
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

  return (
    <AdminShell
      title={`Panel de ${store.name}`}
      subtitle="Administración general de la tienda"
      storeName={store.name}
      storeSlug={store.slug}
      current="panel"
    >
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
        <p>
          <strong>Slug:</strong> {store.slug}
        </p>
        <p>
          <strong>Plan:</strong> {store.plan}
        </p>
        <p>
          <strong>Rol:</strong> {membership.role}
        </p>
        <p>
          <strong>Activa:</strong> {store.is_active ? 'Sí' : 'No'}
        </p>
        <p>
          <strong>Tienda pública:</strong> /{store.slug}
        </p>
      </div>

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

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold">Configuración de la tienda</h2>

        <form action={updateStoreSettings} className="grid max-w-2xl gap-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nombre de la tienda</span>
            <input
              type="text"
              name="name"
              defaultValue={store.name}
              placeholder="Ej: Dulce Amor"
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
              placeholder="Ej: dulce-amor"
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </label>

          <p className="text-sm text-gray-600">
            Este valor define la URL pública. Ejemplo: /{store.slug}
          </p>

          <label className="block space-y-2">
            <span className="text-sm font-medium">WhatsApp de la tienda</span>
            <input
              type="text"
              name="whatsapp_number"
              defaultValue={store.whatsapp_number ?? ''}
              placeholder="Ej: 5491134567890"
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">URL del logo</span>
            <input
              type="text"
              name="logo_url"
              defaultValue={store.logo_url ?? ''}
              placeholder="https://..."
              className="w-full rounded-xl border px-4 py-3"
            />
          </label>

          {store.logo_url && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Vista previa del logo</span>
              <img
                src={store.logo_url}
                alt={`Logo de ${store.name}`}
                className="h-20 w-20 rounded-2xl border object-cover"
              />
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium">Subir logo</span>
            <input
              type="file"
              name="logo_file"
              accept="image/*"
              className="w-full rounded-xl border px-4 py-3"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">URL de portada</span>
            <input
              type="text"
              name="cover_url"
              defaultValue={store.cover_url ?? ''}
              placeholder="https://..."
              className="w-full rounded-xl border px-4 py-3"
            />
          </label>

          {store.cover_url && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Vista previa de la portada</span>
              <img
                src={store.cover_url}
                alt={`Portada de ${store.name}`}
                className="h-32 w-full rounded-2xl border object-cover"
              />
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium">Subir portada</span>
            <input
              type="file"
              name="cover_file"
              accept="image/*"
              className="w-full rounded-xl border px-4 py-3"
            />
          </label>

          <p className="text-sm text-gray-600">
            Podés pegar una URL o subir una imagen directamente.
          </p>

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
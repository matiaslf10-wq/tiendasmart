import { getCurrentUserStore } from '@/lib/stores';
import { hasFeature } from '@/lib/plans';
import LogoutButton from '@/components/admin/LogoutButton';
import { updateStoreSettings } from './actions';

export default async function AdminPage() {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    return (
      <main className="p-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Panel admin</h1>
          <LogoutButton />
        </div>

        <p>No tenés una tienda asignada todavía.</p>
      </main>
    );
  }

  const store = membership.stores;

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Panel de {store.name}</h1>
        <LogoutButton />
      </div>

      <div className="rounded-2xl border p-4 space-y-2">
        <p><strong>Slug:</strong> {store.slug}</p>
        <p><strong>Plan:</strong> {store.plan}</p>
        <p><strong>Rol:</strong> {membership.role}</p>
        <p><strong>Activa:</strong> {store.is_active ? 'Sí' : 'No'}</p>
        <p><strong>Tienda pública:</strong> /{store.slug}</p>
      </div>

      <div className="rounded-2xl border p-4 space-y-2">
        <h2 className="text-xl font-semibold">Features disponibles</h2>
        <ul className="list-disc pl-6">
          <li>Productos: {hasFeature(store.plan, 'products') ? 'Sí' : 'No'}</li>
          <li>Categorías: {hasFeature(store.plan, 'categories') ? 'Sí' : 'No'}</li>
          <li>Pedidos básicos: {hasFeature(store.plan, 'basic_orders') ? 'Sí' : 'No'}</li>
          <li>Cupones: {hasFeature(store.plan, 'coupons') ? 'Sí' : 'No'}</li>
          <li>Analytics avanzados: {hasFeature(store.plan, 'advanced_analytics') ? 'Sí' : 'No'}</li>
          <li>IA: {hasFeature(store.plan, 'ai_descriptions') ? 'Sí' : 'No'}</li>
        </ul>
      </div>

      <div className="rounded-2xl border p-4 space-y-4">
        <h2 className="text-xl font-semibold">Configuración de la tienda</h2>

        <form action={updateStoreSettings} className="grid gap-4 max-w-2xl">
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

          <p className="text-sm text-gray-600">
            Por ahora podés pegar URLs de imágenes. Después lo conectamos con subida directa.
          </p>

          <button
            type="submit"
            className="w-fit rounded-xl bg-black px-5 py-3 text-white"
          >
            Guardar cambios
          </button>
        </form>
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <h2 className="text-xl font-semibold">Gestión</h2>
        <div className="flex gap-3">
          <a href="/admin/productos" className="rounded-xl bg-black px-4 py-2 text-white">
            Ir a productos
          </a>
          <a href={`/${store.slug}`} className="rounded-xl border px-4 py-2">
            Ver tienda pública
          </a>
        </div>
      </div>
    </main>
  );
}
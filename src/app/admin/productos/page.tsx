import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';
import { hasFeature } from '@/lib/plans';
import { createProduct } from './actions';
import LogoutButton from '@/components/admin/LogoutButton';

export default async function ProductosPage() {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    redirect('/login');
  }

  const store = membership.stores;

  if (!hasFeature(store.plan, 'products')) {
    return (
      <main className="p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Productos</h1>
          <LogoutButton />
        </div>
        <p>Tu plan no incluye gestión de productos.</p>
      </main>
    );
  }

  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  return (
    <main className="p-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-gray-600">Tienda: {store.name}</p>
        </div>
        <div className="flex gap-3">
          <a href="/admin" className="rounded-xl border px-4 py-2">
            Volver
          </a>
          <LogoutButton />
        </div>
      </div>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Crear producto</h2>

        <form action={createProduct} className="grid gap-4 md:grid-cols-2">
          <input
            name="name"
            placeholder="Nombre del producto"
            className="rounded-xl border px-4 py-3"
            required
          />

          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Precio"
            className="rounded-xl border px-4 py-3"
            required
          />

          <input
            name="image_url"
            placeholder="URL de imagen"
            className="rounded-xl border px-4 py-3 md:col-span-2"
          />

          <textarea
            name="description"
            placeholder="Descripción"
            className="rounded-xl border px-4 py-3 md:col-span-2 min-h-28"
          />

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-black px-5 py-3 text-white"
            >
              Guardar producto
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Listado</h2>

        {error ? (
          <pre className="bg-red-50 text-red-700 p-4 rounded-xl overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        ) : !products || products.length === 0 ? (
          <p>No hay productos cargados todavía.</p>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <article key={product.id} className="rounded-2xl border p-4 space-y-2">
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <p className="text-gray-600">
                  ${Number(product.price).toLocaleString('es-AR')}
                </p>
                {product.description && (
                  <p className="text-sm text-gray-700">{product.description}</p>
                )}
                <p className="text-sm">
                  Estado: {product.is_active ? 'Activo' : 'Inactivo'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
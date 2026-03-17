import Link from 'next/link';

type AdminNavProps = {
  storeSlug: string;
  current?: 'panel' | 'productos' | 'categorias';
};

function getItemClass(isActive: boolean) {
  return isActive
    ? 'rounded-2xl border border-black bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition'
    : 'rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md';
}

export default function AdminNav({
  storeSlug,
  current,
}: AdminNavProps) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Gestión</h2>
        <p className="text-sm text-gray-600">
          Accesos rápidos del panel administrativo
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin"
          className={getItemClass(current === 'panel')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🏠</span>
            <div>
              <div>Panel</div>
              <div className="text-xs opacity-80 font-normal">
                Configuración general
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/productos"
          className={getItemClass(current === 'productos')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">📦</span>
            <div>
              <div>Productos</div>
              <div className="text-xs opacity-80 font-normal">
                Crear y editar productos
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/categorias"
          className={getItemClass(current === 'categorias')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🗂️</span>
            <div>
              <div>Categorías</div>
              <div className="text-xs opacity-80 font-normal">
                Crear y editar categorías
              </div>
            </div>
          </div>
        </Link>

        <Link
          href={`/${storeSlug}`}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">👁️</span>
            <div>
              <div>Ver tienda</div>
              <div className="text-xs font-normal text-emerald-800/80">
                Abrir la tienda pública
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
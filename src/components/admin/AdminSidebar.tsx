import Link from 'next/link';

type AdminSidebarProps = {
  storeName: string;
  storeSlug: string;
  current?: 'panel' | 'productos' | 'categorias' | 'pedidos';
  pendingOrdersCount?: number;
};

function itemClass(active: boolean) {
  return active
    ? 'flex items-center gap-3 rounded-2xl bg-black px-4 py-3 text-white shadow-md scale-[1.02]'
    : 'flex items-center gap-3 rounded-2xl px-4 py-3 text-gray-700 transition hover:bg-gray-100 hover:scale-[1.01]';
}

export default function AdminSidebar({
  storeName,
  storeSlug,
  current,
  pendingOrdersCount = 0,
}: AdminSidebarProps) {
  return (
    <aside className="w-full rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-md backdrop-blur lg:sticky lg:top-6">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          TiendaSmart
        </p>
        <h2 className="mt-2 text-xl font-bold text-gray-900">{storeName}</h2>
        <p className="mt-1 text-sm text-gray-500">Panel administrativo</p>
      </div>

      <nav className="space-y-2">
        <Link href="/admin" className={itemClass(current === 'panel')}>
          <span className="text-lg">🏠</span>
          <div>
            <div className="text-sm font-semibold">Panel</div>
            <div className="text-xs opacity-80">Configuración general</div>
          </div>
        </Link>

        <Link
          href="/admin/productos"
          className={itemClass(current === 'productos')}
        >
          <span className="text-lg">📦</span>
          <div>
            <div className="text-sm font-semibold">Productos</div>
            <div className="text-xs opacity-80">Crear y editar productos</div>
          </div>
        </Link>

        <Link
          href="/admin/categorias"
          className={itemClass(current === 'categorias')}
        >
          <span className="text-lg">🗂️</span>
          <div>
            <div className="text-sm font-semibold">Categorías</div>
            <div className="text-xs opacity-80">Crear y editar categorías</div>
          </div>
        </Link>

        <Link
          href="/admin/pedidos"
          className={itemClass(current === 'pedidos')}
        >
          <span className="text-lg">🧾</span>
          <div className="flex min-w-0 items-center gap-2">
            <div>
              <div className="text-sm font-semibold">Pedidos</div>
              <div className="text-xs opacity-80">Ver y gestionar pedidos</div>
            </div>

            {pendingOrdersCount > 0 ? (
              <span
                className={`ml-auto inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${
                  current === 'pedidos'
                    ? 'bg-white text-black'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {pendingOrdersCount}
              </span>
            ) : null}
          </div>
        </Link>
      </nav>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <Link
          href={`/${storeSlug}`}
          className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900 transition hover:bg-emerald-100"
        >
          <span className="text-lg">👁️</span>
          <div>
            <div className="text-sm font-semibold">Ver tienda</div>
            <div className="text-xs text-emerald-800/80">
              Abrir la tienda pública
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
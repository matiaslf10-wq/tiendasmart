import LogoutButton from '@/components/admin/LogoutButton';
import AdminSidebar from '@/components/admin/AdminSidebar';

type AdminShellProps = {
  title: string;
  subtitle?: string;
  storeName: string;
  storeSlug: string;
  current?: 'panel' | 'productos' | 'categorias' | 'pedidos';
  pendingOrdersCount?: number;
  children: React.ReactNode;
};

export default function AdminShell({
  title,
  subtitle,
  storeName,
  storeSlug,
  current,
  pendingOrdersCount = 0,
  children,
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl p-4 lg:p-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <AdminSidebar
            storeName={storeName}
            storeSlug={storeSlug}
            current={current}
            pendingOrdersCount={pendingOrdersCount}
          />

          <section className="min-w-0 space-y-6">
            <header className="rounded-3xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                  {subtitle && (
                    <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <LogoutButton />
                </div>
              </div>
            </header>

            <div className="space-y-6">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';
import { hasFeature } from '@/lib/plans';
import ProductEditForm from '@/components/admin/ProductEditForm';
import ProductCreateForm from '@/components/admin/ProductCreateForm';
import AdminShell from '@/components/admin/AdminShell';
import AdminStatCard from '@/components/admin/AdminStatCard';

type CategoryOption = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type ProductImage = {
  id: string;
  image_url: string;
  is_cover: boolean;
  sort_order: number | null;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  category_id: string | null;
  track_stock: boolean;
  stock_quantity: number;
  allow_backorder: boolean;
  created_at: string;
  product_images?: ProductImage[];
};

type Category = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type ProductosPageProps = {
  searchParams?: Promise<{
    success?: string;
  }>;
};

function getSuccessMessage(success?: string) {
  switch (success) {
    case 'created':
      return 'Producto creado correctamente.';
    case 'updated':
      return 'Producto actualizado correctamente.';
    case 'image-deleted':
      return 'Imagen eliminada correctamente.';
    case 'status-updated':
      return 'Estado del producto actualizado.';
    default:
      return null;
  }
}

export default async function ProductosPage({ searchParams }: ProductosPageProps) {
  const membership = await getCurrentUserStore();

  if (!membership || !membership.stores) {
    redirect('/login');
  }

  const store = membership.stores;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const successMessage = getSuccessMessage(resolvedSearchParams?.success);

  if (!hasFeature(store.plan, 'products')) {
    return (
      <main className="space-y-4 p-8">
        <h1 className="text-3xl font-bold">Productos</h1>
        <p>Tu plan no incluye gestión de productos.</p>
      </main>
    );
  }

  const supabase = await createClient();

  const [
    { data: products, error: productsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        is_active,
        category_id,
        track_stock,
        stock_quantity,
        allow_backorder,
        created_at,
        product_images (
          id,
          image_url,
          is_cover,
          sort_order
        )
      `)
      .eq('store_id', store.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('categories')
      .select(`
        id,
        name,
        is_active,
        sort_order,
        created_at
      `)
      .eq('store_id', store.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  const safeProducts: Product[] = (products ?? []) as Product[];
  const safeCategories: Category[] = (categories ?? []) as Category[];

  const totalProducts = safeProducts.length;
  const activeProducts = safeProducts.filter((product) => product.is_active).length;
  const inactiveProducts = totalProducts - activeProducts;
  const activeCategoriesCount = safeCategories.filter((category) => category.is_active).length;

  const categoryOptions: CategoryOption[] = safeCategories.map((category) => ({
    id: category.id,
    name: category.name,
    is_active: category.is_active,
    sort_order: category.sort_order,
  }));

  const activeCategoryOptions = categoryOptions.filter((category) => category.is_active);

  return (
    <AdminShell
      title="Productos"
      subtitle={`Tienda: ${store.name}`}
      storeName={store.name}
      storeSlug={store.slug}
      current="productos"
    >
      <div className="-mt-1">
        <p className="text-sm text-gray-500">
          Gestioná los productos que se muestran en tu tienda.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Productos totales"
          value={totalProducts}
          helper="Cantidad total cargada"
        />
        <AdminStatCard
          label="Activos"
          value={activeProducts}
          helper="Visibles para la tienda"
          tone="success"
        />
        <AdminStatCard
          label="Inactivos"
          value={inactiveProducts}
          helper="Ocultos temporalmente"
          tone="warning"
        />
        <AdminStatCard
          label="Categorías activas"
          value={activeCategoriesCount}
          helper="Disponibles para asignar"
        />
      </section>

      {successMessage && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          {successMessage}
        </div>
      )}

      <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Crear producto</h2>

        {categoriesError ? (
          <pre className="overflow-auto rounded-xl bg-red-50 p-4 text-red-700">
            {JSON.stringify(categoriesError, null, 2)}
          </pre>
        ) : (
          <ProductCreateForm categories={activeCategoryOptions} />
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Listado</h2>

        {productsError ? (
          <pre className="overflow-auto rounded-xl bg-red-50 p-4 text-red-700">
            {JSON.stringify(productsError, null, 2)}
          </pre>
        ) : safeProducts.length === 0 ? (
          <p>No hay productos cargados todavía.</p>
        ) : (
          <div className="grid gap-4">
            {safeProducts.map((product) => {
              const sortedImages = [...(product.product_images || [])].sort(
                (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
              );

              return (
                <ProductEditForm
                  key={product.id}
                  product={{
                    ...product,
                    product_images: sortedImages,
                  }}
                  categories={activeCategoryOptions}
                />
              );
            })}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
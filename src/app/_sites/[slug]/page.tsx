import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import WhatsAppCart from '@/components/WhatsAppCart';
import ProductCard from '@/components/ProductCard';

type PageProps = {
  params: Promise<{ slug: string }>;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  category_id: string | null;
};

function sectionIdFromCategory(category: Pick<Category, 'id' | 'slug' | 'name'>) {
  const safeSlug =
    category.slug?.trim() ||
    category.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  return `categoria-${safeSlug || category.id}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from('stores')
    .select('name, slug, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!store) {
    return {
      title: 'Tienda no encontrada | TiendaSmart',
      description: 'La tienda que buscás no está disponible.',
    };
  }

  return {
    title: `${store.name} | TiendaSmart`,
    description: `Comprá online en ${store.name}.`,
  };
}

export default async function PublicStorePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select(`
      id,
      name,
      slug,
      subdomain,
      custom_domain,
      whatsapp_number,
      logo_url,
      cover_url,
      is_active
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (storeError || !store) {
    notFound();
  }

  const [
    { data: products, error: productsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, price, image_url, is_active, category_id')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    supabase
      .from('categories')
      .select('id, name, slug, description, is_active, sort_order')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (productsError || categoriesError) {
    return (
      <main className="min-h-screen bg-white">
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h1 className="text-3xl font-bold">{store.name}</h1>
          <p className="mt-4 text-red-600">
            No se pudieron cargar los productos o categorías.
          </p>
        </section>
      </main>
    );
  }

  const typedProducts: Product[] = products || [];
  const typedCategories: Category[] = categories || [];

  const productsByCategory = new Map<string, Product[]>();
  for (const category of typedCategories) {
    productsByCategory.set(category.id, []);
  }

  const uncategorizedProducts: Product[] = [];
  for (const product of typedProducts) {
    if (product.category_id && productsByCategory.has(product.category_id)) {
      productsByCategory.get(product.category_id)?.push(product);
    } else {
      uncategorizedProducts.push(product);
    }
  }

  const visibleCategories = typedCategories.filter((category) => {
    const items = productsByCategory.get(category.id) || [];
    return items.length > 0;
  });

  const hasAnyProducts = typedProducts.length > 0;

  return (
    <main className="min-h-screen bg-white">
      <section className="relative border-b bg-gray-50">
        {store.cover_url && (
          <div className="absolute inset-0">
            <img
              src={store.cover_url}
              alt={`Portada de ${store.name}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/45" />
          </div>
        )}

        <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-16">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt={`Logo de ${store.name}`}
                className="h-20 w-20 rounded-3xl border bg-white object-cover shadow-sm"
              />
            )}

            <div className="max-w-3xl">
              <p
                className={`text-sm uppercase tracking-[0.2em] ${
                  store.cover_url ? 'text-white/80' : 'text-gray-500'
                }`}
              >
                Tienda online
              </p>

              <h1
                className={`mt-2 text-4xl font-bold md:text-5xl ${
                  store.cover_url ? 'text-white' : 'text-gray-900'
                }`}
              >
                {store.name}
              </h1>

              <p
                className={`mt-3 max-w-2xl text-base md:text-lg ${
                  store.cover_url ? 'text-white/90' : 'text-gray-600'
                }`}
              >
                Explorá nuestros productos disponibles y elegí lo que necesitás.
              </p>
            </div>
          </div>
        </div>
      </section>

      {hasAnyProducts && (visibleCategories.length > 0 || uncategorizedProducts.length > 0) && (
        <section className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-6xl px-6 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleCategories.map((category) => (
                <a
                  key={category.id}
                  href={`#${sectionIdFromCategory(category)}`}
                  className="whitespace-nowrap rounded-full border px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  {category.name}
                </a>
              ))}

              {uncategorizedProducts.length > 0 && (
                <a
                  href="#otros-productos"
                  className="whitespace-nowrap rounded-full border px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  Otros productos
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 py-10 space-y-12">
        {!hasAnyProducts ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <h2 className="text-xl font-semibold">Todavía no hay productos publicados</h2>
            <p className="mt-2 text-gray-600">Volvé pronto para ver novedades.</p>
          </div>
        ) : (
          <>
            {visibleCategories.map((category) => {
              const items = productsByCategory.get(category.id) || [];

              return (
                <section
                  key={category.id}
                  id={sectionIdFromCategory(category)}
                  className="scroll-mt-24 space-y-5"
                >
                  <div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">{category.name}</h2>
                      {category.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {category.description}
                        </p>
                      )}
                    </div>

                    <span className="text-sm text-gray-500">
                      {items.length} {items.length === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((product) => (
                      <a key={product.id} href={`/${store.slug}/producto/${product.id}`} className="block">
  <ProductCard product={product} />
</a>
                    ))}
                  </div>
                </section>
              );
            })}

            {uncategorizedProducts.length > 0 && (
              <section id="otros-productos" className="scroll-mt-24 space-y-5">
                <div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Otros productos</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Productos publicados sin una categoría asignada.
                    </p>
                  </div>

                  <span className="text-sm text-gray-500">
                    {uncategorizedProducts.length}{' '}
                    {uncategorizedProducts.length === 1 ? 'producto' : 'productos'}
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {uncategorizedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </section>

      {store.whatsapp_number && <WhatsAppCart phone={store.whatsapp_number} />}
    </main>
  );
}
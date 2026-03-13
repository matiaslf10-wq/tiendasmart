import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import WhatsAppCart from '@/components/WhatsAppCart';
import ProductCard from '@/components/ProductCard';

type PageProps = {
  params: Promise<{ slug: string }>;
};

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

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, description, price, image_url, is_active')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (productsError) {
    return (
      <main className="min-h-screen bg-white">
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h1 className="text-3xl font-bold">{store.name}</h1>
          <p className="mt-4 text-red-600">No se pudieron cargar los productos.</p>
        </section>
      </main>
    );
  }

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
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        <div className="relative mx-auto max-w-6xl px-6 py-12">
          <div className="flex items-center gap-4">
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt={`Logo de ${store.name}`}
                className="h-16 w-16 rounded-2xl object-cover border bg-white"
              />
            )}

            <div>
              <p className={`text-sm uppercase tracking-wide ${store.cover_url ? 'text-white/80' : 'text-gray-500'}`}>
                Tienda online
              </p>
              <h1 className={`mt-2 text-4xl font-bold ${store.cover_url ? 'text-white' : 'text-gray-900'}`}>
                {store.name}
              </h1>
              <p className={`mt-3 ${store.cover_url ? 'text-white/90' : 'text-gray-600'}`}>
                Explorá nuestros productos disponibles.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {!products || products.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <h2 className="text-xl font-semibold">Todavía no hay productos publicados</h2>
            <p className="mt-2 text-gray-600">Volvé pronto para ver novedades.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {store.whatsapp_number && <WhatsAppCart phone={store.whatsapp_number} />}
    </main>
  );
}
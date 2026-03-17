import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import WhatsAppCart from '@/components/WhatsAppCart';

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
};

type ProductImage = {
  id: string;
  image_url: string;
  is_cover: boolean;
  sort_order: number | null;
};

type RelatedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!store) {
    return {
      title: 'Producto no encontrado | TiendaSmart',
      description: 'El producto que buscás no está disponible.',
    };
  }

  const { data: product } = await supabase
    .from('products')
    .select('name, description, slug, is_active')
    .eq('slug', productSlug)
    .eq('store_id', store.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!product) {
    return {
      title: `${store.name} | Producto no encontrado`,
      description: 'El producto que buscás no está disponible.',
    };
  }

  return {
    title: `${product.name} | ${store.name}`,
    description: product.description || `Comprá ${product.name} en ${store.name}.`,
  };
}

export default async function PublicProductPage({ params }: PageProps) {
  const { slug, productSlug } = await params;
  const supabase = await createClient();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select(`
      id,
      name,
      slug,
      whatsapp_number,
      logo_url,
      is_active
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (storeError || !store) {
    notFound();
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      description,
      price,
      image_url,
      is_active,
      category_id
    `)
    .eq('slug', productSlug)
    .eq('store_id', store.id)
    .eq('is_active', true)
    .maybeSingle();

  if (productError || !product) {
    notFound();
  }

  const [{ data: images }, { data: category }, { data: relatedProducts }] = await Promise.all([
    supabase
      .from('product_images')
      .select('id, image_url, is_cover, sort_order')
      .eq('product_id', product.id)
      .order('sort_order', { ascending: true }),

    product.category_id
      ? supabase
          .from('categories')
          .select('id, name, slug')
          .eq('id', product.category_id)
          .eq('store_id', store.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    supabase
      .from('products')
      .select('id, name, slug, price, image_url')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .neq('id', product.id)
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const typedImages: ProductImage[] = images || [];
  const typedRelatedProducts: RelatedProduct[] = relatedProducts || [];

  const mainImage =
    typedImages.find((img) => img.is_cover)?.image_url ||
    typedImages[0]?.image_url ||
    product.image_url ||
    null;

  const productPath = `/${store.slug}/producto/${product.slug}`;
  const whatsappText = encodeURIComponent(
    `Hola! Quiero consultar por este producto: ${product.name} (${store.name}). Link: ${productPath}`
  );

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4 text-sm text-gray-600">
          <a href={`/${store.slug}`} className="hover:underline">
            {store.name}
          </a>
          <span>/</span>
          {category ? (
            <>
              <span>{category.name}</span>
              <span>/</span>
            </>
          ) : null}
          <span className="text-gray-900">{product.name}</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border bg-gray-50">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="h-[420px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[420px] items-center justify-center text-gray-400">
                  Sin imagen
                </div>
              )}
            </div>

            {typedImages.length > 1 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {typedImages.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-2xl border bg-gray-50"
                  >
                    <img
                      src={image.image_url}
                      alt={product.name}
                      className="h-28 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <a
                href={`/${store.slug}`}
                className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                ← Volver a la tienda
              </a>

              <div className="flex items-center gap-3">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={`Logo de ${store.name}`}
                    className="h-12 w-12 rounded-2xl border object-cover"
                  />
                ) : null}

                <div>
                  <p className="text-sm text-gray-500">Tienda</p>
                  <p className="font-medium text-gray-900">{store.name}</p>
                </div>
              </div>

              {category ? (
                <p className="text-sm text-gray-500">Categoría: {category.name}</p>
              ) : null}

              <h1 className="text-4xl font-bold text-gray-900">{product.name}</h1>

              <p className="text-3xl font-semibold text-gray-900">
                ${Number(product.price).toLocaleString('es-AR')}
              </p>

              {product.description ? (
                <p className="text-base leading-relaxed text-gray-600">
                  {product.description}
                </p>
              ) : (
                <p className="text-base text-gray-500">
                  Este producto no tiene descripción todavía.
                </p>
              )}
            </div>

            <div className="rounded-2xl border p-5 space-y-4">
              <h2 className="text-lg font-semibold">¿Te interesa este producto?</h2>

              <div className="flex flex-wrap gap-3">
                {store.whatsapp_number ? (
                  <a
                    href={`https://wa.me/${store.whatsapp_number}?text=${whatsappText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-black px-5 py-3 text-white"
                  >
                    Consultar por WhatsApp
                  </a>
                ) : null}

                <a
                  href={`/${store.slug}`}
                  className="rounded-xl border px-5 py-3"
                >
                  Seguir comprando
                </a>
              </div>

              <p className="text-sm text-gray-500">
                Podés consultar disponibilidad, medios de pago y envío directamente con la tienda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {typedRelatedProducts.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="space-y-5 border-t pt-8">
            <h2 className="text-2xl font-semibold">También te puede interesar</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {typedRelatedProducts.map((item) => (
                <a
                  key={item.id}
                  href={`/${store.slug}/producto/${item.slug}`}
                  className="rounded-2xl border p-4 transition hover:shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-xl border bg-gray-50">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-40 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-gray-700">
                        ${Number(item.price).toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {store.whatsapp_number && (
  <WhatsAppCart
    storeSlug={store.slug}
    storeName={store.name}
    whatsappNumber={store.whatsapp_number}
  />
)}    </main>
  );
}
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import WhatsAppCart from '@/components/store/WhatsAppCart';
import ProductDetailActions from '@/components/store/ProductDetailActions';
import ProductImageGallery from '@/components/store/ProductImageGallery';
import ViewItemTracker from '@/components/store/ViewItemTracker';
import { getStockLabel } from '@/lib/stock';
import ProductWhatsAppButton from '@/components/store/ProductWhatsAppButton';

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
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
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  category_id: string | null;
  track_stock: boolean;
  stock_quantity: number;
  allow_backorder: boolean;
};

type RelatedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  track_stock: boolean;
  stock_quantity: number;
  allow_backorder: boolean;
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
      category_id,
      track_stock,
      stock_quantity,
      allow_backorder
    `)
    .eq('slug', productSlug)
    .eq('store_id', store.id)
    .eq('is_active', true)
    .maybeSingle();

  if (productError || !product) {
    notFound();
  }

  const [{ data: images }, { data: category }, { data: relatedProducts }] =
    await Promise.all([
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
        .select(`
          id,
          name,
          slug,
          price,
          image_url,
          track_stock,
          stock_quantity,
          allow_backorder
        `)
        .eq('store_id', store.id)
        .eq('is_active', true)
        .neq('id', product.id)
        .order('created_at', { ascending: false })
        .limit(4),
    ]);

  const typedProduct: Product = product as Product;
  const typedImages: ProductImage[] = (images || []) as ProductImage[];
  const typedRelatedProducts: RelatedProduct[] =
    (relatedProducts || []) as RelatedProduct[];

  const orderedImages = [...typedImages].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1;
    if (!a.is_cover && b.is_cover) return 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const stockLabel = getStockLabel(typedProduct);

  const productPath = `/${store.slug}/producto/${typedProduct.slug}`;
  const whatsappText = encodeURIComponent(
    `Hola! Quiero consultar por este producto: ${typedProduct.name} (${store.name}). Link: ${productPath}`
  );

  return (
    <>
      <ViewItemTracker
        item={{
          id: typedProduct.id,
          name: typedProduct.name,
          price: Number(typedProduct.price),
          categoryName: category?.name ?? null,
        }}
      />

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
            <span className="text-gray-900">{typedProduct.name}</span>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <ProductImageGallery
                productName={typedProduct.name}
                images={orderedImages}
                fallbackImage={typedProduct.image_url}
              />
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
                  <p className="text-sm text-gray-500">
                    Categoría: {category.name}
                  </p>
                ) : null}

                <h1 className="text-4xl font-bold text-gray-900">
                  {typedProduct.name}
                </h1>

                <p className="text-3xl font-semibold text-gray-900">
                  ${Number(typedProduct.price).toLocaleString('es-AR')}
                </p>

                <div className="inline-flex rounded-full border px-3 py-1 text-sm text-gray-700">
                  {stockLabel}
                </div>

                {typedProduct.description ? (
                  <p className="text-base leading-relaxed text-gray-600">
                    {typedProduct.description}
                  </p>
                ) : (
                  <p className="text-base text-gray-500">
                    Este producto no tiene descripción todavía.
                  </p>
                )}
              </div>

              <div className="space-y-4 rounded-2xl border p-5">
                <h2 className="text-lg font-semibold">
                  ¿Te interesa este producto?
                </h2>

                <ProductDetailActions
                  storeSlug={store.slug}
                  product={{
                    id: typedProduct.id,
                    name: typedProduct.name,
                    price: Number(typedProduct.price),
                    image_url: typedProduct.image_url ?? null,
                    is_active: typedProduct.is_active,
                    track_stock: typedProduct.track_stock,
                    stock_quantity: typedProduct.stock_quantity,
                    allow_backorder: typedProduct.allow_backorder,
                  }}
                />

                <div className="flex flex-wrap gap-3">
                  {store.whatsapp_number ? (
  <ProductWhatsAppButton
    href={`https://wa.me/${store.whatsapp_number}?text=${whatsappText}`}
    storeSlug={store.slug}
    product={{
      id: typedProduct.id,
      name: typedProduct.name,
      price: Number(typedProduct.price),
      categoryName: category?.name ?? null,
    }}
  />
) : null}

                  <a
                    href={`/${store.slug}`}
                    className="rounded-xl border px-5 py-3"
                  >
                    Seguir comprando
                  </a>
                </div>

                <p className="text-sm text-gray-500">
                  {!typedProduct.track_stock
                    ? 'Producto disponible. Podés consultar medios de pago y envío directamente con la tienda.'
                    : typedProduct.stock_quantity > 0
                      ? `Hay ${typedProduct.stock_quantity} unidad${typedProduct.stock_quantity === 1 ? '' : 'es'} cargada${typedProduct.stock_quantity === 1 ? '' : 's'} en stock.`
                      : typedProduct.allow_backorder
                        ? 'Actualmente no hay stock cargado, pero la tienda acepta pedidos por encargo.'
                        : 'Actualmente el producto figura sin stock. Podés consultar si vuelve a ingresar.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {typedRelatedProducts.length > 0 && (
          <section className="mx-auto max-w-6xl px-6 pb-12">
            <div className="space-y-5 border-t pt-8">
              <h2 className="text-2xl font-semibold">
                También te puede interesar
              </h2>

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
                        <p className="mt-1 text-xs text-gray-500">
                          {getStockLabel(item)}
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
        )}
      </main>
    </>
  );
}
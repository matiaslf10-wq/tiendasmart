'use client';

import { trackContactWhatsApp } from '@/lib/ga';

type Props = {
  href: string;
  product: {
    id: string;
    name: string;
    price: number;
    categoryName?: string | null;
  };
  storeSlug: string;
};

export default function ProductWhatsAppButton({
  href,
  product,
  storeSlug,
}: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        trackContactWhatsApp({
          source: 'product',
          store_slug: storeSlug,
          item: {
            item_id: product.id,
            item_name: product.name,
            price: product.price,
            quantity: 1,
            item_category: product.categoryName ?? undefined,
          },
        });
      }}
      className="rounded-xl border px-5 py-3"
    >
      Consultar por WhatsApp
    </a>
  );
}
type TodayActionTone = 'success' | 'warning' | 'danger' | 'info';

export type TodayAction = {
  id: string;
  title: string;
  description: string;
  tone: TodayActionTone;
};

type ProductLike = {
  productId: string;
  productName: string;
  views: number;
  addToCart: number;
  contactWhatsapp: number;
  purchases: number;
};

type CategoryLike = {
  categoryName: string;
  views: number;
  addToCart: number;
  contactWhatsapp: number;
  purchases: number;
};

type FunnelLike = {
  views: number;
  addToCart: number;
  checkout: number;
  whatsapp: number;
  contactWhatsapp: number;
  orders: number;
};

function safeRate(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return part / total;
}

function toneScore(tone: TodayActionTone) {
  if (tone === 'danger') return 4;
  if (tone === 'warning') return 3;
  if (tone === 'success') return 2;
  return 1;
}

export function buildTodayActions(params: {
  funnel: FunnelLike;
  products: ProductLike[];
  categories: CategoryLike[];
}): TodayAction[] {
  const actions: TodayAction[] = [];

  const { funnel, products, categories } = params;

  const viewToCart = safeRate(funnel.addToCart, funnel.views);
  const contactToPurchase = safeRate(funnel.orders, funnel.contactWhatsapp);

  if (funnel.views >= 20 && viewToCart < 0.08) {
    actions.push({
      id: 'improve-product-conversion',
      title: 'Revisar fichas de producto',
      description:
        'Hay vistas, pero pocas personas agregan al carrito. Hoy conviene mejorar fotos, títulos, precios y descripción en los productos más vistos.',
      tone: 'warning',
    });
  }

  if (funnel.contactWhatsapp >= 5 && contactToPurchase < 0.35) {
    actions.push({
      id: 'improve-whatsapp-close',
      title: 'Mejorar el cierre por WhatsApp',
      description:
        'Se están generando consultas, pero cierran pocas ventas. Hoy conviene revisar tiempos de respuesta, disponibilidad y guion comercial.',
      tone: 'danger',
    });
  }

  const productWithManyContactsNoSales = products
    .filter((product) => product.contactWhatsapp >= 5 && product.purchases === 0)
    .sort((a, b) => b.contactWhatsapp - a.contactWhatsapp)[0];

  if (productWithManyContactsNoSales) {
    actions.push({
      id: `follow-up-${productWithManyContactsNoSales.productId}`,
      title: `Revisar ${productWithManyContactsNoSales.productName}`,
      description:
        `Este producto recibió ${productWithManyContactsNoSales.contactWhatsapp} consultas y no registró ventas. Hoy conviene revisar precio, stock o argumentos de cierre.`,
      tone: 'danger',
    });
  }

  const productWithViewsNoCart = products
    .filter((product) => product.views >= 30 && product.addToCart <= 1)
    .sort((a, b) => b.views - a.views)[0];

  if (productWithViewsNoCart) {
    actions.push({
      id: `improve-card-${productWithViewsNoCart.productId}`,
      title: `Optimizar ${productWithViewsNoCart.productName}`,
      description:
        `Tiene mucho interés (${productWithViewsNoCart.views} vistas) pero casi no pasa al carrito. Hoy conviene mejorar presentación, precio o propuesta de valor.`,
      tone: 'warning',
    });
  }

  const bestCategory = categories
    .filter((category) => category.purchases >= 3)
    .sort((a, b) => b.purchases - a.purchases)[0];

  if (bestCategory) {
    actions.push({
      id: `push-category-${bestCategory.categoryName}`,
      title: `Destacar la categoría ${bestCategory.categoryName}`,
      description:
        `Es una de las categorías con mejor desempeño reciente. Hoy puede convenir darle más visibilidad en la tienda o en difusión.`,
      tone: 'success',
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'stable-store',
      title: 'Mantener seguimiento del rendimiento',
      description:
        'No aparecen urgencias claras. Hoy conviene sostener la operación, revisar stock y seguir acumulando datos para nuevas decisiones.',
      tone: 'info',
    });
  }

  return actions
    .sort((a, b) => toneScore(b.tone) - toneScore(a.tone))
    .slice(0, 3);
}
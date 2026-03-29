export type ProductAlertTone = 'success' | 'warning' | 'danger' | 'info';

export type ProductAlertRow = {
  productId: string;
  productName: string;
  views: number;
  addToCart: number;
  contactWhatsapp: number;
  purchases: number;
};

export type ProductAlert = {
  id: string;
  productId: string;
  productName: string;
  title: string;
  description: string;
  tone: ProductAlertTone;
  views: number;
  addToCart: number;
  contactWhatsapp: number;
  purchases: number;
};

function scoreTone(tone: ProductAlertTone) {
  if (tone === 'danger') return 4;
  if (tone === 'warning') return 3;
  if (tone === 'success') return 2;
  return 1;
}

export function buildProductAlerts(rows: ProductAlertRow[]): ProductAlert[] {
  const alerts: ProductAlert[] = [];

  for (const row of rows) {
    if (row.contactWhatsapp >= 5 && row.purchases === 0) {
      alerts.push({
        id: `contact-no-sales-${row.productId}`,
        productId: row.productId,
        productName: row.productName,
        title: 'Muchas consultas y ninguna venta',
        description: `"${row.productName}" recibió ${row.contactWhatsapp} contactos por WhatsApp, pero no registró ventas en el período.`,
        tone: 'danger',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }

    if (row.views >= 30 && row.addToCart <= 1) {
      alerts.push({
        id: `views-no-cart-${row.productId}`,
        productId: row.productId,
        productName: row.productName,
        title: 'Muchas vistas y casi sin carrito',
        description: `"${row.productName}" tiene alto interés, pero casi no se agrega al carrito.`,
        tone: 'warning',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }

    if (row.addToCart >= 5 && row.contactWhatsapp === 0 && row.purchases === 0) {
      alerts.push({
        id: `cart-no-close-${row.productId}`,
        productId: row.productId,
        productName: row.productName,
        title: 'Llega a carrito pero no cierra',
        description: `"${row.productName}" logra intención de compra, pero no deriva a contacto ni venta.`,
        tone: 'warning',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }

    if (row.purchases >= 3 && row.contactWhatsapp >= 3) {
      alerts.push({
        id: `healthy-product-${row.productId}`,
        productId: row.productId,
        productName: row.productName,
        title: 'Producto con buen desempeño',
        description: `"${row.productName}" está generando ventas y también buena conversación comercial.`,
        tone: 'success',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }
  }

  return alerts
    .sort((a, b) => {
      const scoreA =
        scoreTone(a.tone) * 1000 +
        a.contactWhatsapp * 20 +
        a.purchases * 15 +
        a.views * 2;

      const scoreB =
        scoreTone(b.tone) * 1000 +
        b.contactWhatsapp * 20 +
        b.purchases * 15 +
        b.views * 2;

      return scoreB - scoreA;
    })
    .slice(0, 8);
}
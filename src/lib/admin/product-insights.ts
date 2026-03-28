export type ProductInsightTone = 'success' | 'warning' | 'danger' | 'info';

export type ProductInsightRow = {
  productId: string;
  productName: string;
  views: number;
  addToCart: number;
  contactWhatsapp: number;
  purchases: number;
};

export type ProductInsight = {
  id: string;
  productId: string;
  productName: string;
  title: string;
  description: string;
  recommendation: string;
  tone: ProductInsightTone;
  views: number;
  addToCart: number;
  contactWhatsapp: number;
  purchases: number;
};

function safeRate(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return part / total;
}

export function buildProductInsights(
  rows: ProductInsightRow[]
): ProductInsight[] {
  const insights: ProductInsight[] = [];

  for (const row of rows) {
    const addRate = safeRate(row.addToCart, row.views);
    const contactRate = safeRate(row.contactWhatsapp, row.views);
    const purchaseRateFromContact = safeRate(row.purchases, row.contactWhatsapp);

    if (row.views >= 20 && row.addToCart <= 1) {
      insights.push({
        id: `low-cart-${row.productId}`,
        productId: row.productId,
        productName: row.productName,
        title: 'Mucho interés, poco avance',
        description: `"${row.productName}" recibe vistas, pero casi no se agrega al carrito.`,
        recommendation:
          'Revisá precio, foto principal, título y descripción. También puede ayudar destacar stock, medios de pago o beneficios.',
        tone: 'warning',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }

    if (row.contactWhatsapp >= 5 && row.purchases === 0) {
      insights.push({
        id: `no-close-${row.productId}`,
        productId: row.productId,
        productName: row.productName,
        title: 'Consulta mucho pero no cierra',
        description: `"${row.productName}" genera conversaciones por WhatsApp, pero no registra ventas en el período.`,
        recommendation:
          'Conviene revisar precio final, disponibilidad, tiempos de respuesta y objeciones frecuentes del cliente.',
        tone: 'danger',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }

    if (
      row.views >= 10 &&
      row.contactWhatsapp >= 3 &&
      purchaseRateFromContact >= 0.5
    ) {
      insights.push({
        id: `great-close-${row.productId}`,
        productId: row.productId,
        productName: row.productName,
        title: 'Buen desempeño comercial',
        description: `"${row.productName}" convierte bien desde el contacto hasta la venta.`,
        recommendation:
          'Podría destacarse más en la tienda, usarlo en campañas o tomarlo como referencia para otros productos.',
        tone: 'success',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }

    if (row.views >= 30 && addRate >= 0.15 && row.contactWhatsapp === 0) {
      insights.push({
        id: `cart-no-contact-${row.productId}`,
        productId: row.productId,
        productName: row.productName,
        title: 'Interesa, pero no activa conversación',
        description: `"${row.productName}" genera interés y carrito, pero casi no deriva a WhatsApp.`,
        recommendation:
          'Probá reforzar el botón de consulta, agregar llamados a la acción o aclarar que se puede comprar por WhatsApp.',
        tone: 'info',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }
  }

  return insights
    .sort((a, b) => {
      const toneWeight = (tone: ProductInsightTone) =>
        tone === 'danger' ? 4 : tone === 'warning' ? 3 : tone === 'success' ? 2 : 1;

      const scoreA =
        toneWeight(a.tone) * 1000 +
        a.views * 5 +
        a.contactWhatsapp * 10 +
        a.purchases * 20;

      const scoreB =
        toneWeight(b.tone) * 1000 +
        b.views * 5 +
        b.contactWhatsapp * 10 +
        b.purchases * 20;

      return scoreB - scoreA;
    })
    .slice(0, 8);
}
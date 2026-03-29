export type CategoryInsightTone = 'success' | 'warning' | 'info';

export type CategoryInsightRow = {
  categoryName: string;
  views: number;
  addToCart: number;
  contactWhatsapp: number;
  purchases: number;
};

export type CategoryInsight = {
  id: string;
  categoryName: string;
  title: string;
  description: string;
  recommendation: string;
  tone: CategoryInsightTone;
  views: number;
  addToCart: number;
  contactWhatsapp: number;
  purchases: number;
};

function safeRate(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return part / total;
}

function toneScore(tone: CategoryInsightTone) {
  if (tone === 'warning') return 3;
  if (tone === 'success') return 2;
  return 1;
}

export function buildCategoryInsights(
  rows: CategoryInsightRow[]
): CategoryInsight[] {
  const insights: CategoryInsight[] = [];

  for (const row of rows) {
    const addRate = safeRate(row.addToCart, row.views);
    const closeRate = safeRate(row.purchases, row.contactWhatsapp);

    if (row.views >= 30 && addRate < 0.08) {
      insights.push({
        id: `low-cart-${row.categoryName}`,
        categoryName: row.categoryName,
        title: 'Atrae interés, pero cuesta llevar al carrito',
        description: `La categoría "${row.categoryName}" recibe visitas, pero pocas terminan en agregado al carrito.`,
        recommendation:
          'Revisá precio promedio, foto principal de los productos, títulos y claridad de la propuesta.',
        tone: 'warning',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }

    if (row.contactWhatsapp >= 5 && closeRate < 0.3) {
      insights.push({
        id: `low-close-${row.categoryName}`,
        categoryName: row.categoryName,
        title: 'Genera consultas, pero cierra poco',
        description: `La categoría "${row.categoryName}" despierta conversaciones por WhatsApp, pero convierte poco en ventas.`,
        recommendation:
          'Conviene revisar objeciones frecuentes, tiempos de respuesta, precio y disponibilidad.',
        tone: 'warning',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }

    if (row.purchases >= 4 && row.contactWhatsapp >= 3) {
      insights.push({
        id: `best-performer-${row.categoryName}`,
        categoryName: row.categoryName,
        title: 'Buen desempeño comercial',
        description: `La categoría "${row.categoryName}" muestra buena señal de venta y conversación comercial.`,
        recommendation:
          'Podría destacarse más en la tienda, en banners o en difusión externa.',
        tone: 'success',
        views: row.views,
        addToCart: row.addToCart,
        contactWhatsapp: row.contactWhatsapp,
        purchases: row.purchases,
      });
    }

    if (row.views >= 20 && row.contactWhatsapp === 0 && row.purchases === 0) {
      insights.push({
        id: `interest-no-result-${row.categoryName}`,
        categoryName: row.categoryName,
        title: 'Se mira, pero no activa compra',
        description: `La categoría "${row.categoryName}" genera atención, pero no está llevando ni a consulta ni a venta.`,
        recommendation:
          'Puede ayudar mejorar llamados a la acción, comunicar mejor beneficios o reordenar productos destacados.',
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
      const scoreA =
        toneScore(a.tone) * 1000 +
        a.views * 3 +
        a.contactWhatsapp * 10 +
        a.purchases * 15;
      const scoreB =
        toneScore(b.tone) * 1000 +
        b.views * 3 +
        b.contactWhatsapp * 10 +
        b.purchases * 15;
      return scoreB - scoreA;
    })
    .slice(0, 6);
}
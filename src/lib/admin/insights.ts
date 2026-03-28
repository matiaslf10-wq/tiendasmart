export type FunnelInsightTone = 'success' | 'warning' | 'danger' | 'info';

export type FunnelInsight = {
  id: string;
  title: string;
  description: string;
  tone: FunnelInsightTone;
};

export type FunnelInsightInput = {
  views: number;
  addsToCart: number;
  checkout: number;
  whatsapp: number;
  contactWhatsapp: number;
  purchases?: number;
};

function safeRate(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return part / total;
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

export function buildFunnelSummary(data: FunnelInsightInput) {
  return {
    addRate: safeRate(data.addsToCart, data.views),
    checkoutRate: safeRate(data.checkout, data.addsToCart),
    whatsappRate: safeRate(data.whatsapp, data.checkout),
    closeRateFromContact: safeRate(data.purchases ?? 0, data.contactWhatsapp),
  };
}

export function buildFunnelInsights(data: FunnelInsightInput): FunnelInsight[] {
  const insights: FunnelInsight[] = [];
  const purchases = data.purchases ?? 0;

  const addRate = safeRate(data.addsToCart, data.views);
  const checkoutRate = safeRate(data.checkout, data.addsToCart);
  const whatsappRate = safeRate(data.whatsapp, data.checkout);
  const closeRateFromContact = safeRate(purchases, data.contactWhatsapp);

  if (data.views >= 20 && addRate < 0.08) {
    insights.push({
      id: 'low-add-rate',
      title: 'Mucha gente mira pero no agrega',
      description:
        'Hay vistas de productos, pero pocas personas los agregan al carrito. Conviene revisar precio, fotos, descripción y claridad de la propuesta.',
      tone: 'warning',
    });
  }

  if (data.addsToCart >= 10 && checkoutRate < 0.4) {
    insights.push({
      id: 'drop-before-checkout',
      title: 'Se pierde entre carrito e inicio de compra',
      description:
        'Los usuarios agregan productos, pero muchos no llegan a iniciar checkout. Puede haber fricción en el carrito o poca claridad en el siguiente paso.',
      tone: 'danger',
    });
  }

  if (data.checkout >= 10 && whatsappRate < 0.6) {
    insights.push({
      id: 'drop-before-whatsapp',
      title: 'Se pierde entre carrito y WhatsApp',
      description:
        'Hay intención de compra, pero no todos terminan pasando al canal de contacto. Revisá visibilidad del botón, mensaje y facilidad del flujo.',
      tone: 'warning',
    });
  }

  if (data.contactWhatsapp > data.whatsapp) {
    insights.push({
      id: 'direct-contact-preference',
      title: 'Prefieren contacto directo por WhatsApp',
      description:
        'Se registran más contactos directos que derivaciones desde el carrito. La tienda parece tener un comportamiento más conversacional que transaccional.',
      tone: 'info',
    });
  }

  if (data.contactWhatsapp >= 5 && closeRateFromContact > 0 && closeRateFromContact < 0.35) {
    insights.push({
      id: 'many-contacts-few-sales',
      title: 'Mucha consulta pero pocas ventas',
      description:
        'Llegan conversaciones por WhatsApp, pero pocas terminan cerrando. Puede mejorar el tiempo de respuesta, el seguimiento y la estrategia comercial.',
      tone: 'danger',
    });
  }

  if (data.contactWhatsapp >= 5 && closeRateFromContact >= 0.45) {
    insights.push({
      id: 'great-commercial-close',
      title: 'Buen cierre comercial',
      description:
        'Una buena parte de los contactos por WhatsApp termina en venta. El canal comercial está funcionando bien.',
      tone: 'success',
    });
  }

  if (
    data.views > 0 &&
    addRate >= 0.12 &&
    checkoutRate >= 0.5 &&
    whatsappRate >= 0.6
  ) {
    insights.push({
      id: 'healthy-funnel',
      title: 'Buen rendimiento del funnel',
      description:
        'El recorrido desde vistas hacia carrito, checkout y WhatsApp muestra una tracción saludable.',
      tone: 'success',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'not-enough-data',
      title: 'Todavía no hay suficiente volumen para conclusiones fuertes',
      description:
        'Ya se están registrando eventos propios, pero conviene acumular más tráfico o más pedidos para detectar patrones más claros.',
      tone: 'info',
    });
  }

  return insights;
}
import type { FunnelDailyPoint } from '@/lib/admin/funnel-daily-series';

export type FunnelTrendInsightTone = 'success' | 'warning' | 'info';

export type FunnelTrendInsight = {
  id: string;
  title: string;
  description: string;
  tone: FunnelTrendInsightTone;
};

function sumRange(points: FunnelDailyPoint[], key: keyof FunnelDailyPoint) {
  return points.reduce((acc, point) => {
    const value = point[key];
    return acc + (typeof value === 'number' ? value : 0);
  }, 0);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

export function buildFunnelTrendInsights(
  points: FunnelDailyPoint[]
): FunnelTrendInsight[] {
  if (points.length < 4) {
    return [
      {
        id: 'not-enough-data',
        title: 'Todavía no hay suficiente histórico',
        description:
          'Se necesitan más días de actividad para detectar tendencias diarias con mayor claridad.',
        tone: 'info',
      },
    ];
  }

  const half = Math.floor(points.length / 2);
  const previous = points.slice(0, half);
  const current = points.slice(half);

  const previousViews = sumRange(previous, 'views');
  const currentViews = sumRange(current, 'views');

  const previousContacts = sumRange(previous, 'contactWhatsapp');
  const currentContacts = sumRange(current, 'contactWhatsapp');

  const previousPurchases = sumRange(previous, 'purchases');
  const currentPurchases = sumRange(current, 'purchases');

  const viewsDelta = percentChange(currentViews, previousViews);
  const contactsDelta = percentChange(currentContacts, previousContacts);
  const purchasesDelta = percentChange(currentPurchases, previousPurchases);

  const insights: FunnelTrendInsight[] = [];

  if (viewsDelta !== null && viewsDelta >= 20) {
    insights.push({
      id: 'views-up',
      title: 'Subió el interés en la tienda',
      description:
        'Las vistas crecieron en la parte más reciente del período. Hay más movimiento en productos o más tráfico entrando.',
      tone: 'success',
    });
  }

  if (viewsDelta !== null && viewsDelta <= -20) {
    insights.push({
      id: 'views-down',
      title: 'Cayó el interés general',
      description:
        'Las vistas bajaron respecto a la parte anterior del período. Conviene revisar difusión, stock visible y actividad comercial.',
      tone: 'warning',
    });
  }

  if (
    contactsDelta !== null &&
    contactsDelta >= 20 &&
    (purchasesDelta === null || purchasesDelta < 10)
  ) {
    insights.push({
      id: 'contacts-up-purchases-flat',
      title: 'Subieron las consultas, pero no las ventas',
      description:
        'Está creciendo el contacto por WhatsApp, aunque ese aumento no se refleja igual en compras. Puede haber una oportunidad de mejora en el cierre.',
      tone: 'warning',
    });
  }

  if (
    purchasesDelta !== null &&
    purchasesDelta >= 20 &&
    (contactsDelta === null || contactsDelta >= 0)
  ) {
    insights.push({
      id: 'purchases-up',
      title: 'Mejoró el cierre comercial',
      description:
        'Las ventas crecieron en la parte más reciente del período. El funnel parece estar cerrando mejor.',
      tone: 'success',
    });
  }

  if (
    contactsDelta !== null &&
    contactsDelta <= -20 &&
    purchasesDelta !== null &&
    purchasesDelta <= -20
  ) {
    insights.push({
      id: 'contacts-and-sales-down',
      title: 'Bajaron consultas y ventas',
      description:
        'Se observa una caída simultánea en conversaciones y compras. Puede haber menos demanda, menos tráfico o menor activación comercial.',
      tone: 'warning',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'stable-trend',
      title: 'Tendencia relativamente estable',
      description:
        'No se detectan cambios fuertes entre la primera y la segunda parte del período analizado.',
      tone: 'info',
    });
  }

  return insights.slice(0, 4);
}
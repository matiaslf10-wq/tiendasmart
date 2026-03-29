export type FunnelData = {
  views: number;
  addToCart: number;
  checkout: number;
  whatsapp: number;
  contactWhatsapp: number;
  purchases: number;
};

export type FunnelComparisonMetric = {
  current: number;
  previous: number;
  diffPercent: number | null;
  trend: 'up' | 'down' | 'stable';
};

export type FunnelComparison = {
  views: FunnelComparisonMetric;
  addToCart: FunnelComparisonMetric;
  checkout: FunnelComparisonMetric;
  whatsapp: FunnelComparisonMetric;
  contactWhatsapp: FunnelComparisonMetric;
  purchases: FunnelComparisonMetric;
};

function calcDiff(current: number, previous: number): FunnelComparisonMetric {
  if (previous === 0) {
    return {
      current,
      previous,
      diffPercent: null,
      trend: current > 0 ? 'up' : 'stable',
    };
  }

  const diff = ((current - previous) / previous) * 100;

  return {
    current,
    previous,
    diffPercent: diff,
    trend: diff > 2 ? 'up' : diff < -2 ? 'down' : 'stable',
  };
}

export function buildFunnelComparison(params: {
  current: FunnelData;
  previous: FunnelData;
}): FunnelComparison {
  return {
    views: calcDiff(params.current.views, params.previous.views),
    addToCart: calcDiff(params.current.addToCart, params.previous.addToCart),
    checkout: calcDiff(params.current.checkout, params.previous.checkout),
    whatsapp: calcDiff(params.current.whatsapp, params.previous.whatsapp),
    contactWhatsapp: calcDiff(
      params.current.contactWhatsapp,
      params.previous.contactWhatsapp
    ),
    purchases: calcDiff(params.current.purchases, params.previous.purchases),
  };
}
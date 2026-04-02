import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import CopyToClipboardButton from '@/components/admin/CopyToClipboardButton';
import ExecutiveSummary, {
  type ExecutiveSummaryItem,
} from '@/components/admin/ExecutiveSummary';
import FunnelSection from '@/components/admin/FunnelSection';
import Ga4Charts from '@/components/admin/Ga4Charts';
import Ga4DailySeries from '@/components/admin/Ga4DailySeries';
import Ga4TopProductsInsights from '@/components/admin/Ga4TopProductsInsights';
import Ga4TopProductsPlaceholder from '@/components/admin/Ga4TopProductsPlaceholder';
import OrdersAnalyticsSection from '@/components/admin/OrdersAnalyticsSection';
import OrdersRangeTabs from '@/components/admin/OrdersRangeTabs';
import {
  filterOrderItemsByRange,
  filterOrders,
  getOrdersComparison,
  type Order,
  type OrderItemRow,
  type OrdersPeriodComparison,
  type RangeValue,
} from '@/lib/admin/orders';
import {
  getTopProductsInsights,
  type TopProductInsightRow,
} from '@/lib/admin/top-products';
import { getGa4DailySeries, getGa4Overview } from '@/lib/ga4';
import { hasFeature } from '@/lib/plans';
import { getCurrentUserStore } from '@/lib/stores';
import { createClient } from '@/lib/supabase/server';
import {
  ensureAnalyticsApiKey,
  regenerateAnalyticsApiKeyAction,
} from './actions';
import ProductInsights from '@/components/admin/ProductInsights';
import { buildProductInsights } from '@/lib/admin/product-insights';
import FunnelComparison from '@/components/admin/FunnelComparison';
import { buildFunnelComparison } from '@/lib/admin/funnel-comparison';
import FunnelDailyChart from '@/components/admin/FunnelDailyChart';
import { buildFunnelDailySeries } from '@/lib/admin/funnel-daily-series';
import FunnelTrendInsights from '@/components/admin/FunnelTrendInsights';
import { buildFunnelTrendInsights } from '@/lib/admin/funnel-trend-insights';
import ProductAlerts from '@/components/admin/ProductAlerts';
import { buildProductAlerts } from '@/lib/admin/product-alerts';
import CategoryInsights from '@/components/admin/CategoryInsights';
import { buildCategoryInsights } from '@/lib/admin/category-insights';
import TodayActions from '@/components/admin/TodayActions';
import { buildTodayActions } from '@/lib/admin/today-actions';
import SourceLinksCard from '@/components/admin/SourceLinksCard';
import LinkGeneratorCard from '@/components/admin/LinkGeneratorCard';
import { getDefaultSourceLinkPresets } from '@/lib/admin/source-links';

type PageProps = {
  searchParams: Promise<{
    range?: RangeValue;
  }>;
};

type Insight = {
  title: string;
  description: string;
  tone: 'neutral' | 'warning' | 'success';
};

type AnalyticsEventRow = {
  event_name: string;
  created_at: string;
  session_id: string | null;
  product_id: string | null;
  metadata:
    | {
        item_id?: string | null;
        item_name?: string | null;
        product_name?: string | null;
        item_category?: string | null;
        traffic_source?: string | null;
        traffic_medium?: string | null;
        traffic_campaign?: string | null;
        traffic_referrer?: string | null;
        landing_path?: string | null;
        traffic_ts_link?: string | null;
      }
    | null;
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDelta(value: number | null) {
  if (value === null) return 'nuevo';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

type SourcePerformanceRow = {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  views: number;
  addToCart: number;
  checkout: number;
  whatsapp: number;
  contacts: number;
};

type SourceInsight = {
  title: string;
  description: string;
  tone: 'neutral' | 'warning' | 'success';
};

type TsLinkRow = {
  tsLink: string;
  sessions: number;
  views: number;
  addToCart: number;
  checkout: number;
  whatsapp: number;
  contacts: number;
  purchases: number;
  revenue: number;
  averageTicket: number;
  conversionToContact: number;
};

function getTrafficSource(event: AnalyticsEventRow) {
  return event.metadata?.traffic_source?.trim() || 'direct';
}

function getTrafficMedium(event: AnalyticsEventRow) {
  return event.metadata?.traffic_medium?.trim() || 'none';
}

function getTrafficCampaign(event: AnalyticsEventRow) {
  return event.metadata?.traffic_campaign?.trim() || '—';
}

function getTrafficTsLink(event: AnalyticsEventRow) {
  return event.metadata?.traffic_ts_link?.trim() || 'sin_link';
}

function buildSourcePerformanceRows(events: AnalyticsEventRow[]) {
  const map = new Map<
    string,
    {
      source: string;
      medium: string;
      campaign: string;
      sessions: Set<string>;
      views: number;
      addToCart: number;
      checkout: number;
      whatsapp: number;
      contacts: number;
    }
  >();

  for (const event of events) {
    const source = getTrafficSource(event);
    const medium = getTrafficMedium(event);
    const campaign = getTrafficCampaign(event);
    const key = `${source}__${medium}__${campaign}`;

    const current = map.get(key) ?? {
      source,
      medium,
      campaign,
      sessions: new Set<string>(),
      views: 0,
      addToCart: 0,
      checkout: 0,
      whatsapp: 0,
      contacts: 0,
    };

    if (event.session_id) {
      current.sessions.add(event.session_id);
    }

    if (event.event_name === 'view_item') current.views += 1;
    if (event.event_name === 'add_to_cart') current.addToCart += 1;
    if (event.event_name === 'begin_checkout') current.checkout += 1;
    if (event.event_name === 'send_to_whatsapp') current.whatsapp += 1;
    if (event.event_name === 'contact_whatsapp') current.contacts += 1;

    map.set(key, current);
  }

  return Array.from(map.values())
    .map(
      (row): SourcePerformanceRow => ({
        source: row.source,
        medium: row.medium,
        campaign: row.campaign,
        sessions: row.sessions.size,
        views: row.views,
        addToCart: row.addToCart,
        checkout: row.checkout,
        whatsapp: row.whatsapp,
        contacts: row.contacts,
      })
    )
    .sort((a, b) => {
      if (b.views !== a.views) return b.views - a.views;
      if (b.contacts !== a.contacts) return b.contacts - a.contacts;
      return b.sessions - a.sessions;
    });
}


function buildTsLinkRows(
  events: AnalyticsEventRow[],
  orders: Array<
    Order & {
      total?: number | string | null;
      metadata?: {
        traffic_ts_link?: string | null;
      } | null;
    }
  >
) {
  const map = new Map<
    string,
    {
      tsLink: string;
      sessions: Set<string>;
      views: number;
      addToCart: number;
      checkout: number;
      whatsapp: number;
      contacts: number;
      purchases: number;
      revenue: number;
    }
  >();

  for (const event of events) {
    const tsLink = getTrafficTsLink(event);

    const current = map.get(tsLink) ?? {
      tsLink,
      sessions: new Set<string>(),
      views: 0,
      addToCart: 0,
      checkout: 0,
      whatsapp: 0,
      contacts: 0,
      purchases: 0,
      revenue: 0,
    };

    if (event.session_id) {
      current.sessions.add(event.session_id);
    }

    if (event.event_name === 'view_item') current.views += 1;
    if (event.event_name === 'add_to_cart') current.addToCart += 1;
    if (event.event_name === 'begin_checkout') current.checkout += 1;
    if (event.event_name === 'send_to_whatsapp') current.whatsapp += 1;
    if (event.event_name === 'contact_whatsapp') current.contacts += 1;

    map.set(tsLink, current);
  }

  for (const order of orders) {
    const tsLink = order.metadata?.traffic_ts_link?.trim() || 'sin_link';

    const current = map.get(tsLink) ?? {
      tsLink,
      sessions: new Set<string>(),
      views: 0,
      addToCart: 0,
      checkout: 0,
      whatsapp: 0,
      contacts: 0,
      purchases: 0,
      revenue: 0,
    };

    current.purchases += 1;
    current.revenue += Number(order.total ?? 0) || 0;

    map.set(tsLink, current);
  }

  return Array.from(map.values())
    .map(
      (row): TsLinkRow => ({
        tsLink: row.tsLink,
        sessions: row.sessions.size,
        views: row.views,
        addToCart: row.addToCart,
        checkout: row.checkout,
        whatsapp: row.whatsapp,
        contacts: row.contacts,
        purchases: row.purchases,
        revenue: row.revenue,
        averageTicket:
          row.purchases > 0 ? row.revenue / row.purchases : 0,
        conversionToContact:
          row.views > 0 ? (row.contacts / row.views) * 100 : 0,
      })
    )
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.purchases !== a.purchases) return b.purchases - a.purchases;
      if (b.contacts !== a.contacts) return b.contacts - a.contacts;
      return b.views - a.views;
    });
}
function getTopSourcesSummary(rows: SourcePerformanceRow[]) {
  if (rows.length === 0) return null;

  const topByViews = [...rows].sort((a, b) => b.views - a.views)[0];
  const topByContacts = [...rows].sort((a, b) => b.contacts - a.contacts)[0];

  const bestConversion = [...rows]
    .map((row) => ({
      ...row,
      conversion: row.views > 0 ? (row.contacts / row.views) * 100 : 0,
    }))
    .sort((a, b) => b.conversion - a.conversion)[0];

  return {
    topByViews,
    topByContacts,
    bestConversion,
  };
}

function getTopTsLinksSummary(rows: TsLinkRow[]) {
  if (rows.length === 0) return null;

  const topByPurchases = [...rows].sort((a, b) => {
    if (b.purchases !== a.purchases) return b.purchases - a.purchases;
    return b.revenue - a.revenue;
  })[0];

  const topByRevenue = [...rows].sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return b.purchases - a.purchases;
  })[0];

  const rowsWithPurchases = rows.filter((row) => row.purchases > 0);

  const bestAverageTicket =
    rowsWithPurchases.length > 0
      ? [...rowsWithPurchases].sort((a, b) => {
          if (b.averageTicket !== a.averageTicket) {
            return b.averageTicket - a.averageTicket;
          }
          return b.revenue - a.revenue;
        })[0]
      : null;

  return {
    topByPurchases,
    topByRevenue,
    bestAverageTicket,
  };
}

function formatTsLinkDisplay(tsLink: string) {
  if (!tsLink || tsLink === 'sin_link') return 'Sin link identificado';
  return tsLink;
}

function buildSourceInsights(rows: SourcePerformanceRow[]): SourceInsight[] {
  const insights: SourceInsight[] = [];

  if (rows.length === 0) {
    return insights;
  }

  const topByViews = [...rows].sort((a, b) => b.views - a.views)[0];
  const topByContacts = [...rows].sort((a, b) => b.contacts - a.contacts)[0];

  const rowsWithRates = rows.map((row) => ({
    ...row,
    viewToContactRate: row.views > 0 ? (row.contacts / row.views) * 100 : 0,
    viewToCartRate: row.views > 0 ? (row.addToCart / row.views) * 100 : 0,
    checkoutToWhatsappRate:
      row.checkout > 0 ? (row.whatsapp / row.checkout) * 100 : 0,
  }));

  const bestConversion = [...rowsWithRates].sort(
    (a, b) => b.viewToContactRate - a.viewToContactRate
  )[0];

  const weakHighTraffic = rowsWithRates.find(
    (row) => row.views >= 20 && row.viewToContactRate < 3
  );

  const strongEfficient = rowsWithRates.find(
    (row) => row.views >= 10 && row.viewToContactRate >= 8
  );

  if (topByViews && topByViews.views > 0) {
    insights.push({
      title: `El canal con más tráfico es ${topByViews.source}`,
      description: `Es el origen que más vistas aporta en este período, con ${topByViews.views} views. Conviene usarlo como referencia principal para comparar calidad contra volumen.`,
      tone: 'neutral',
    });
  }

  if (
    topByContacts &&
    topByContacts.contacts > 0 &&
    topByContacts.source !== topByViews.source
  ) {
    insights.push({
      title: `${topByContacts.source} genera más conversaciones que otros canales`,
      description: `Aunque no necesariamente sea el de mayor tráfico, es el origen con más contactos registrados (${topByContacts.contacts}). Puede estar trayendo usuarios con mejor intención de compra.`,
      tone: 'success',
    });
  }

  if (weakHighTraffic) {
    insights.push({
      title: `${weakHighTraffic.source} trae volumen, pero convierte poco`,
      description: `Este origen reúne ${weakHighTraffic.views} views, pero su tasa de contacto es solo ${formatPercent(
        weakHighTraffic.viewToContactRate
      )}. Puede haber interés inicial, pero poco avance comercial.`,
      tone: 'warning',
    });
  }

  if (strongEfficient) {
    insights.push({
      title: `${strongEfficient.source} muestra buena calidad de tráfico`,
      description: `Este canal convierte ${formatPercent(
        strongEfficient.viewToContactRate
      )} de sus vistas en contactos. Está atrayendo usuarios con intención más clara.`,
      tone: 'success',
    });
  }

  if (
    bestConversion &&
    bestConversion.views >= 5 &&
    bestConversion.contacts > 0
  ) {
    insights.push({
      title: `${bestConversion.source} es el canal con mejor conversión a contacto`,
      description: `Dentro de los orígenes medidos, es el que mejor transforma vistas en conversaciones, con una tasa de ${formatPercent(
        bestConversion.viewToContactRate
      )}.`,
      tone: 'success',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Todavía no hay suficiente volumen por canal',
      description:
        'Ya se registran orígenes de tráfico, pero todavía no hay suficiente movimiento como para detectar diferencias fuertes entre canales.',
      tone: 'neutral',
    });
  }

  return insights.slice(0, 4);
}

function getPreviousRangeDates(range: RangeValue): {
  start: Date | null;
  end: Date | null;
} {
  const now = new Date();

  if (range === 'all') {
    return { start: null, end: null };
  }

  if (range === 'today') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  if (range === '7d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() - 7);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  if (range === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 59);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() - 30);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  if (range === 'month') {
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    previousMonthEnd.setHours(23, 59, 59, 999);

    return {
      start: previousMonthStart,
      end: previousMonthEnd,
    };
  }

  return { start: null, end: null };
}

function getRangeStartDate(range: RangeValue): string | null {
  const now = new Date();

  if (range === 'all') return null;

  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  if (range === '7d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  if (range === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  return null;
}

function buildOwnFunnelInsights(params: {
  views: number;
  addToCart: number;
  checkout: number;
  whatsapp: number;
  contactWhatsapp: number;
  purchases: number;
}) {
  const { views, addToCart, checkout, whatsapp, contactWhatsapp, purchases } =
    params;

  const viewToCart = views > 0 ? (addToCart / views) * 100 : 0;
  const cartToCheckout = addToCart > 0 ? (checkout / addToCart) * 100 : 0;
  const checkoutToWhatsapp = checkout > 0 ? (whatsapp / checkout) * 100 : 0;
  const contactToPurchase =
    contactWhatsapp > 0 ? (purchases / contactWhatsapp) * 100 : 0;

  const insights: Insight[] = [];

  if (views >= 20 && viewToCart < 8) {
    insights.push({
      title: 'Mucha gente consulta pero no compra',
      description:
        'Hay visualizaciones de productos, pero pocas personas avanzan hacia el carrito. Conviene revisar precio, fotos, descripción y claridad de la propuesta.',
      tone: 'warning',
    });
  }

  if (addToCart >= 10 && cartToCheckout < 40) {
    insights.push({
      title: 'Se pierde entre carrito e inicio de compra',
      description:
        'Los usuarios agregan productos, pero muchos no llegan al checkout. Puede haber fricción en el carrito o poca claridad en el siguiente paso.',
      tone: 'warning',
    });
  }

  if (checkout >= 10 && checkoutToWhatsapp < 60) {
    insights.push({
      title: 'Se pierde entre carrito y WhatsApp',
      description:
        'Hay intención de compra, pero no todos terminan pasando al canal de contacto. Revisá visibilidad del botón, mensaje y facilidad del flujo.',
      tone: 'warning',
    });
  }

  if (contactWhatsapp > whatsapp) {
    insights.push({
      title: 'Prefieren contacto directo por WhatsApp',
      description:
        'Se registran más contactos directos que derivaciones desde el carrito. La tienda parece tener un comportamiento más conversacional que transaccional.',
      tone: 'neutral',
    });
  }

  if (contactWhatsapp >= 5 && contactToPurchase < 35) {
    insights.push({
      title: 'Mucha consulta pero pocas ventas',
      description:
        'Llegan conversaciones por WhatsApp, pero pocas terminan cerrando. Puede mejorar el tiempo de respuesta, el seguimiento y la estrategia comercial.',
      tone: 'warning',
    });
  }

  if (contactWhatsapp >= 5 && contactToPurchase >= 45) {
    insights.push({
      title: 'Buen cierre comercial',
      description:
        'Una buena parte de los contactos por WhatsApp termina en venta. El canal comercial está funcionando bien.',
      tone: 'success',
    });
  }

  if (
    views > 0 &&
    viewToCart >= 12 &&
    cartToCheckout >= 50 &&
    checkoutToWhatsapp >= 60
  ) {
    insights.push({
      title: 'Buen rendimiento del funnel',
      description:
        'El recorrido desde vistas hacia carrito, checkout y WhatsApp muestra una tracción saludable.',
      tone: 'success',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Todavía no hay suficiente volumen para conclusiones fuertes',
      description:
        'Ya se están registrando eventos propios, pero conviene acumular más tráfico o más pedidos para detectar patrones más claros.',
      tone: 'neutral',
    });
  }

  return insights;
}

function buildExecutiveSummary(params: {
  comparison: OrdersPeriodComparison | null;
  ownConversion: {
    viewToCart: number;
    cartToCheckout: number;
    checkoutToWhatsapp: number;
    contactToPurchase: number;
  } | null;
  ownFunnelData: {
    views: number;
    addToCart: number;
    checkout: number;
    whatsapp: number;
    contactWhatsapp: number;
    orders: number;
  } | null;
}): ExecutiveSummaryItem[] {
  const { comparison, ownConversion, ownFunnelData } = params;
  const summary: ExecutiveSummaryItem[] = [];

  if (comparison) {
    const revenueDelta = comparison.revenue.diffPercent;
    const ordersDelta = comparison.orders.diffPercent;
    const ticketDelta = comparison.averageTicket.diffPercent;

    if (comparison.revenue.current === 0 && comparison.orders.current === 0) {
      summary.push({
        title: 'Sin ventas en el período seleccionado',
        description:
          'No se registran pedidos en este rango. Conviene revisar adquisición de tráfico, visibilidad de productos y activación comercial.',
        tone: 'warning',
      });
    } else if (
      comparison.revenue.trend === 'up' &&
      comparison.orders.trend === 'up'
    ) {
      summary.push({
        title: 'Crecimiento comercial frente al período anterior',
        description: `La facturación creció ${formatDelta(
          revenueDelta
        )} y los pedidos subieron ${formatDelta(
          ordersDelta
        )}. El período muestra una mejora general del rendimiento comercial.`,
        tone: 'success',
      });
    } else if (
      comparison.revenue.trend === 'up' &&
      comparison.orders.trend !== 'up'
    ) {
      summary.push({
        title: 'Mejor facturación con menos volumen de pedidos',
        description: `La facturación avanzó ${formatDelta(
          revenueDelta
        )}, pero los pedidos no crecieron al mismo ritmo. Esto sugiere tickets más altos o una mejor mezcla de productos.`,
        tone: 'neutral',
      });
    } else if (
      comparison.revenue.trend === 'down' &&
      comparison.orders.trend === 'down'
    ) {
      summary.push({
        title: 'Caída comercial frente al período anterior',
        description: `La facturación cayó ${formatDelta(
          revenueDelta
        )} y los pedidos bajaron ${formatDelta(
          ordersDelta
        )}. Conviene revisar demanda, surtido, difusión y ejecución comercial.`,
        tone: 'warning',
      });
    }

    if (ticketDelta !== null && comparison.averageTicket.trend === 'up') {
      summary.push({
        title: 'Suba del ticket promedio',
        description: `El ticket promedio mejoró ${formatDelta(
          ticketDelta
        )}. Puede estar empujado por precios, combos, upselling o compras más grandes por pedido.`,
        tone: 'success',
      });
    } else if (
      ticketDelta !== null &&
      comparison.averageTicket.trend === 'down'
    ) {
      summary.push({
        title: 'Baja del ticket promedio',
        description: `El ticket promedio cayó ${formatDelta(
          ticketDelta
        )}. Conviene revisar estrategia de precios, combos y productos de mayor valor.`,
        tone: 'warning',
      });
    }
  }

  if (ownFunnelData && ownConversion) {
    if (ownFunnelData.views > 0 && ownConversion.viewToCart < 8) {
      summary.push({
        title: 'Hay interés en productos, pero cuesta llevarlo al carrito',
        description:
          'Las vistas existen, pero pocas llegan a agregado al carrito. El foco debería estar en ficha de producto, precio, fotos y propuesta.',
        tone: 'warning',
      });
    }

    if (
      ownFunnelData.addToCart > 0 &&
      ownConversion.cartToCheckout >= 50 &&
      ownConversion.checkoutToWhatsapp >= 60
    ) {
      summary.push({
        title: 'El proceso de compra muestra buena tracción',
        description:
          'Una proporción saludable de usuarios avanza desde carrito a checkout y luego a WhatsApp.',
        tone: 'success',
      });
    }

    if (
      ownFunnelData.contactWhatsapp > 0 &&
      ownConversion.contactToPurchase < 35
    ) {
      summary.push({
        title: 'La oportunidad está en el cierre por WhatsApp',
        description:
          'La tienda genera conversaciones, pero muchas no terminan en compra. La mejora principal parece estar en respuesta, seguimiento y cierre comercial.',
        tone: 'warning',
      });
    }
  }

  if (summary.length === 0) {
    summary.push({
      title: 'Rendimiento estable, todavía sin señales fuertes',
      description:
        'El panel ya muestra comportamiento comercial y operativo, pero todavía no aparecen patrones suficientemente marcados como para sacar una conclusión dominante.',
      tone: 'neutral',
    });
  }

  return summary.slice(0, 4);
}

function MetricCard({
  label,
  value,
  helpText,
}: {
  label: string;
  value: number | string;
  helpText?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {helpText ? (
        <p className="mt-2 text-xs text-slate-400">{helpText}</p>
      ) : null}
    </div>
  );
}

function TsLinkHighlightCard({
  label,
  tsLink,
  metric,
  submetric,
  accent = 'slate',
}: {
  label: string;
  tsLink: string;
  metric: string;
  submetric: string;
  accent?: 'emerald' | 'violet' | 'amber' | 'slate';
}) {
  const accentClasses =
    accent === 'emerald'
      ? 'border-emerald-200 bg-emerald-50'
      : accent === 'violet'
        ? 'border-violet-200 bg-violet-50'
        : accent === 'amber'
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-slate-50';

  const badgeClasses =
    accent === 'emerald'
      ? 'bg-emerald-100 text-emerald-800'
      : accent === 'violet'
        ? 'bg-violet-100 text-violet-800'
        : accent === 'amber'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{metric}</p>
        </div>

        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses}`}
        >
          Destacado
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-white/70 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Link
        </p>
        <p className="mt-1 break-all font-mono text-sm text-slate-900">
          {formatTsLinkDisplay(tsLink)}
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-600">{submetric}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const toneClasses =
    insight.tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : insight.tone === 'success'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-slate-200 bg-slate-50';

  const titleClasses =
    insight.tone === 'warning'
      ? 'text-amber-950'
      : insight.tone === 'success'
        ? 'text-emerald-950'
        : 'text-slate-900';

  const bodyClasses =
    insight.tone === 'warning'
      ? 'text-amber-900'
      : insight.tone === 'success'
        ? 'text-emerald-900'
        : 'text-slate-600';

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className={`text-sm font-semibold ${titleClasses}`}>{insight.title}</p>
      <p className={`mt-2 text-sm ${bodyClasses}`}>{insight.description}</p>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const membership = await getCurrentUserStore();

  if (!membership?.stores) {
    redirect('/login');
  }

  const store = membership.stores;
  const resolvedSearchParams = await searchParams;
  const range: RangeValue = resolvedSearchParams.range ?? '30d';

  if (!hasFeature(store.plan, 'advanced_analytics')) {
    return (
      <AdminShell
        title="Analytics"
        subtitle={`Tienda: ${store.name}`}
        storeName={store.name}
        storeSlug={store.slug}
        plan={store.plan}
        current="analytics"
        pendingOrdersCount={0}
      >
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
              Función disponible en planes superiores
            </p>

            <h2 className="text-2xl font-bold text-amber-950">
              Analytics avanzado no está incluido en tu plan
            </h2>

            <p className="max-w-2xl text-sm text-amber-900">
              Tu tienda está usando el plan <strong>{store.plan}</strong>. Para
              acceder a métricas avanzadas, comparativas y análisis comercial,
              necesitás actualizar a <strong>Pro</strong> o{' '}
              <strong>Intelligence</strong>.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/admin/pedidos"
                className="inline-flex items-center rounded-2xl bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
              >
                Volver a Pedidos
              </Link>

              <Link
                href="/admin"
                className="inline-flex items-center rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
              >
                Ir al panel
              </Link>
            </div>
          </div>
        </section>
      </AdminShell>
    );
  }

  const analyticsApiKey =
    store.analytics_api_key ?? (await ensureAnalyticsApiKey()).apiKey;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const publicAnalyticsUrl = appUrl
    ? `${appUrl}/api/public/analytics/orders-detailed?range=${range}&api_key=${analyticsApiKey}`
    : `/api/public/analytics/orders-detailed?range=${range}&api_key=${analyticsApiKey}`;

  const publicAnalyticsJsonUrl = appUrl
    ? `${appUrl}/api/public/analytics/orders-detailed-json?range=${range}&api_key=${analyticsApiKey}`
    : `/api/public/analytics/orders-detailed-json?range=${range}&api_key=${analyticsApiKey}`;

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '';

const storeBaseUrl =
  rootDomain && store.slug
    ? `https://${store.slug}.${rootDomain}`
    : appUrl
      ? `${appUrl.replace(/\/$/, '')}/${store.slug}`
      : `/${store.slug}`;

const sourceLinks = getDefaultSourceLinkPresets(storeBaseUrl);

  const excelExportUrl = `/api/admin/export/analytics?range=${range}`;
  const powerBiOpenUrl = process.env.NEXT_PUBLIC_POWER_BI_OPEN_URL ?? '';
  const powerBiEmbedUrl = process.env.NEXT_PUBLIC_POWER_BI_EMBED_URL ?? '';

  const supabase = await createClient();

  const ga4ServiceAccountJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const hasGa4Credentials = Boolean(ga4ServiceAccountJson);
  const ga4PropertyId = store.google_analytics_property_id ?? null;

  let ga4Data: Awaited<ReturnType<typeof getGa4Overview>> | null = null;
  let ga4DailySeries: Awaited<ReturnType<typeof getGa4DailySeries>> = [];
  let ga4Error: string | null = null;

  const rangeStart = getRangeStartDate(range);

  const ordersQuery = supabase.from('orders').select('*').eq('store_id', store.id);

  const itemsQuery = supabase
    .from('order_items')
    .select(
      'product_id, product_name, quantity, line_total, orders!inner(created_at, store_id)'
    )
    .eq('orders.store_id', store.id);

    const productsQuery = supabase
  .from('products')
  .select('id, category_id, categories(name)')
  .eq('store_id', store.id);

  let eventsQuery = supabase
  .from('analytics_events')
  .select('event_name, created_at, session_id, product_id, metadata')
  .eq('store_id', store.id);

  if (rangeStart) {
    eventsQuery = eventsQuery.gte('created_at', rangeStart);
  }

  const [
  { data: ordersData, error: ordersError },
  { data: itemsData, error: itemsError },
  { data: productsData, error: productsError },
  { data: analyticsEventsData, error: analyticsEventsError },
] = await Promise.all([
  ordersQuery,
  itemsQuery,
  productsQuery,
  eventsQuery,
]);

  if (ga4PropertyId && hasGa4Credentials) {
    try {
      const [overview, dailySeries] = await Promise.all([
        getGa4Overview({
          propertyId: ga4PropertyId,
          range,
        }),
        getGa4DailySeries({
          propertyId: ga4PropertyId,
          range,
        }),
      ]);

      ga4Data = overview;
      ga4DailySeries = dailySeries;
    } catch (error) {
      ga4Error =
        error instanceof Error ? error.message : 'Error desconocido GA4';
    }
  }

  if (ordersError) {
    throw new Error(`Error cargando pedidos: ${ordersError.message}`);
  }

  if (itemsError) {
    throw new Error(`Error cargando items de pedidos: ${itemsError.message}`);
  }

  if (productsError) {
  throw new Error(`Error cargando productos: ${productsError.message}`);
}

  if (analyticsEventsError) {
    throw new Error(
      `Error cargando analytics events: ${analyticsEventsError.message}`
    );
  }

  const allOrders = (ordersData ?? []) as Array<
  Order & {
    metadata?: {
      traffic_source?: string | null;
      traffic_medium?: string | null;
      traffic_campaign?: string | null;
      traffic_referrer?: string | null;
      traffic_ts_link?: string | null;
      landing_path?: string | null;
    } | null;
  }
>;

  const allOrderItems = ((itemsData ?? []) as Array<{
    product_id: string | null;
    product_name: string | null;
    quantity: number | string | null;
    line_total: number | string | null;
    orders: { created_at: string; store_id: string }[];
  }>).map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    line_total: item.line_total,
    orders: item.orders?.[0] ?? null,
  })) as OrderItemRow[];

  const productCategoryMap = new Map<string, string>();

for (const product of (productsData ?? []) as Array<{
  id: string;
  category_id: string | null;
  categories:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
}>) {
  const category =
    Array.isArray(product.categories)
      ? (product.categories[0]?.name ?? null)
      : (product.categories?.name ?? null);

  productCategoryMap.set(product.id, category ?? 'Sin categoría');
}

const analyticsEvents = (analyticsEventsData ?? []) as AnalyticsEventRow[];

const sourceRows = buildSourcePerformanceRows(analyticsEvents);

const sourceSummary = getTopSourcesSummary(sourceRows);

const sourceInsights = buildSourceInsights(sourceRows);

const customEventCounts = analyticsEvents.reduce<Record<string, number>>(
  (acc, event) => {
    acc[event.event_name] = (acc[event.event_name] ?? 0) + 1;
    return acc;
  },
  {}
);

const analyticsSessions = new Set(
  analyticsEvents
    .map((event) => event.session_id)
    .filter((value): value is string => Boolean(value))
).size;

const { rangeFilteredOrders, pendingOrdersCount } = filterOrders({
  orders: allOrders,
  status: 'all',
  queryText: '',
  delivery: 'all',
  notes: 'all',
  range,
});

const tsLinkRows = buildTsLinkRows(analyticsEvents, rangeFilteredOrders);
const tsLinkSummary = getTopTsLinksSummary(tsLinkRows);

const previousRangeDates = getPreviousRangeDates(range);

const previousRangeFilteredOrders =
  previousRangeDates.start && previousRangeDates.end
    ? allOrders.filter((order) => {
        const createdAt = new Date(order.created_at);
        return (
          createdAt >= previousRangeDates.start! &&
          createdAt <= previousRangeDates.end!
        );
      })
    : [];

const rangeFilteredOrderItems = filterOrderItemsByRange(
  allOrderItems,
  range
);

const funnelDailySeries = buildFunnelDailySeries({
  analyticsEvents,
  orders: rangeFilteredOrders.map((order) => ({
    created_at: order.created_at,
  })),
});

const funnelTrendInsights = buildFunnelTrendInsights(funnelDailySeries);

const productEventMap = new Map<
  string,
  {
    productId: string;
    productName: string;
    views: number;
    addToCart: number;
    contactWhatsapp: number;
    purchases: number;
  }
>();

for (const event of analyticsEvents) {
  const productId = event.product_id ?? event.metadata?.item_id ?? null;
  if (!productId) continue;

  const productName =
    event.metadata?.item_name ?? event.metadata?.product_name ?? 'Producto';

  const current = productEventMap.get(productId) ?? {
    productId,
    productName,
    views: 0,
    addToCart: 0,
    contactWhatsapp: 0,
    purchases: 0,
  };

  if (!current.productName || current.productName === 'Producto') {
    current.productName = productName;
  }

  if (event.event_name === 'view_item') current.views += 1;
  if (event.event_name === 'add_to_cart') current.addToCart += 1;
  if (event.event_name === 'contact_whatsapp') current.contactWhatsapp += 1;

  productEventMap.set(productId, current);
}

for (const item of rangeFilteredOrderItems) {
  const productId = item.product_id ?? null;
  if (!productId) continue;

  const productName = item.product_name ?? 'Producto';

  const current = productEventMap.get(productId) ?? {
    productId,
    productName,
    views: 0,
    addToCart: 0,
    contactWhatsapp: 0,
    purchases: 0,
  };

  current.purchases += Number(item.quantity ?? 0) || 0;

  if (!current.productName || current.productName === 'Producto') {
    current.productName = productName;
  }

  productEventMap.set(productId, current);
}

const productInsights = buildProductInsights(
  Array.from(productEventMap.values())
);

const productAlerts = buildProductAlerts(
  Array.from(productEventMap.values())
);

const categoryMap = new Map<
  string,
  {
    categoryName: string;
    views: number;
    addToCart: number;
    contactWhatsapp: number;
    purchases: number;
  }
>();

for (const event of analyticsEvents) {
  const categoryName = event.metadata?.item_category ?? 'Sin categoría';
  const current = categoryMap.get(categoryName) ?? {
    categoryName,
    views: 0,
    addToCart: 0,
    contactWhatsapp: 0,
    purchases: 0,
  };

  if (event.event_name === 'view_item') current.views += 1;
  if (event.event_name === 'add_to_cart') current.addToCart += 1;
  if (event.event_name === 'contact_whatsapp') current.contactWhatsapp += 1;

  categoryMap.set(categoryName, current);
}

for (const item of rangeFilteredOrderItems) {
  const categoryName = item.product_id
    ? (productCategoryMap.get(item.product_id) ?? 'Sin categoría')
    : 'Sin categoría';

  const current = categoryMap.get(categoryName) ?? {
    categoryName,
    views: 0,
    addToCart: 0,
    contactWhatsapp: 0,
    purchases: 0,
  };

  current.purchases += Number(item.quantity ?? 0) || 0;
  categoryMap.set(categoryName, current);
}

const categoryInsights = buildCategoryInsights(
  Array.from(categoryMap.values())
);



  const comparison = getOrdersComparison(allOrders, allOrderItems, range);

  const funnelData = {
    views: customEventCounts.view_item ?? 0,
    addToCart: customEventCounts.add_to_cart ?? 0,
    checkout: customEventCounts.begin_checkout ?? 0,
    whatsapp: customEventCounts.send_to_whatsapp ?? 0,
    contactWhatsapp: customEventCounts.contact_whatsapp ?? 0,
    orders: rangeFilteredOrders.length,
  };

  const todayActions = buildTodayActions({
  funnel: funnelData,
  products: Array.from(productEventMap.values()),
  categories: Array.from(categoryMap.values()),
});


const previousAnalyticsEvents =
  previousRangeDates.start && previousRangeDates.end
    ? analyticsEvents.filter((event) => {
        const createdAt = new Date(event.created_at);
        return (
          createdAt >= previousRangeDates.start! &&
          createdAt <= previousRangeDates.end!
        );
      })
    : [];

const previousCustomEventCounts = previousAnalyticsEvents.reduce<Record<string, number>>(
  (acc, event) => {
    acc[event.event_name] = (acc[event.event_name] ?? 0) + 1;
    return acc;
  },
  {}
);

const previousFunnelData = {
  views: previousCustomEventCounts.view_item ?? 0,
  addToCart: previousCustomEventCounts.add_to_cart ?? 0,
  checkout: previousCustomEventCounts.begin_checkout ?? 0,
  whatsapp: previousCustomEventCounts.send_to_whatsapp ?? 0,
  contactWhatsapp: previousCustomEventCounts.contact_whatsapp ?? 0,
  purchases: previousRangeFilteredOrders.length,
};

const funnelComparison = buildFunnelComparison({
  current: {
    views: funnelData.views,
    addToCart: funnelData.addToCart,
    checkout: funnelData.checkout,
    whatsapp: funnelData.whatsapp,
    contactWhatsapp: funnelData.contactWhatsapp,
    purchases: funnelData.orders,
  },
  previous: previousFunnelData,
});

  const ownConversion = {
    viewToCart:
      funnelData.views > 0
        ? (funnelData.addToCart / funnelData.views) * 100
        : 0,
    cartToCheckout:
      funnelData.addToCart > 0
        ? (funnelData.checkout / funnelData.addToCart) * 100
        : 0,
    checkoutToWhatsapp:
      funnelData.checkout > 0
        ? (funnelData.whatsapp / funnelData.checkout) * 100
        : 0,
    contactToPurchase:
      funnelData.contactWhatsapp > 0
        ? (funnelData.orders / funnelData.contactWhatsapp) * 100
        : 0,
  };

  const insights = buildOwnFunnelInsights({
    views: funnelData.views,
    addToCart: funnelData.addToCart,
    checkout: funnelData.checkout,
    whatsapp: funnelData.whatsapp,
    contactWhatsapp: funnelData.contactWhatsapp,
    purchases: funnelData.orders,
  });

  const executiveSummary = buildExecutiveSummary({
    comparison,
    ownConversion,
    ownFunnelData: funnelData,
  });

  let topProductsInsights: TopProductInsightRow[] = [];

  if (ga4PropertyId && hasGa4Credentials) {
    try {
      topProductsInsights = await getTopProductsInsights({
        propertyId: ga4PropertyId,
        range,
        orderItems: rangeFilteredOrderItems,
        limit: 10,
      });
    } catch (error) {
      const details =
        error instanceof Error
          ? error.message
          : 'Error desconocido GA4 top products';

      ga4Error = ga4Error
        ? `${ga4Error} | Top productos: ${details}`
        : `Top productos: ${details}`;
    }
  }

  const ga4Conversion = ga4Data
    ? {
        viewToCart:
          ga4Data.viewItemEvents > 0
            ? (ga4Data.addToCartEvents / ga4Data.viewItemEvents) * 100
            : 0,
        cartToCheckout:
          ga4Data.addToCartEvents > 0
            ? (ga4Data.beginCheckoutEvents / ga4Data.addToCartEvents) * 100
            : 0,
        checkoutToWhatsapp:
          ga4Data.beginCheckoutEvents > 0
            ? (ga4Data.sendToWhatsAppEvents / ga4Data.beginCheckoutEvents) * 100
            : 0,
        whatsappToPurchase:
          ga4Data.sendToWhatsAppEvents > 0
            ? (ga4Data.purchaseEvents / ga4Data.sendToWhatsAppEvents) * 100
            : 0,
      }
    : null;

  return (
    <AdminShell
      title="Analytics"
      subtitle={`Tienda: ${store.name}`}
      storeName={store.name}
      storeSlug={store.slug}
      plan={store.plan}
      current="analytics"
      pendingOrdersCount={pendingOrdersCount}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Exportación y Power BI
              </h2>
              <p className="text-sm text-slate-600">
                Descargá analytics en Excel, abrí Power BI y usá las URLs para
                conectar Power Query o integraciones externas.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={excelExportUrl}
                className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                Descargar Excel directo
              </a>

              {powerBiOpenUrl ? (
                <a
                  href={powerBiOpenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  Abrir en Power BI
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
                >
                  Abrir en Power BI
                </button>
              )}
            </div>

            <div className="grid gap-4">
              <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    API key
                  </p>
                  <CopyToClipboardButton value={analyticsApiKey} />
                </div>

                <code className="block break-all text-sm text-slate-900">
                  {analyticsApiKey}
                </code>
              </div>

              <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    URL CSV (Excel / Power Query)
                  </p>
                  <CopyToClipboardButton value={publicAnalyticsUrl} />
                </div>

                <code className="block break-all text-sm text-slate-900">
                  {publicAnalyticsUrl}
                </code>
              </div>

              <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    URL JSON (Power BI)
                  </p>
                  <CopyToClipboardButton value={publicAnalyticsJsonUrl} />
                </div>

                <code className="block break-all text-sm text-slate-900">
                  {publicAnalyticsJsonUrl}
                </code>
              </div>
            </div>

            <form action={regenerateAnalyticsApiKeyAction}>
              <button
                type="submit"
                className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Regenerar API key
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Estado de Google Analytics
            </h2>

            <p className="text-sm text-slate-600">
              Credenciales backend:{' '}
              <span className="font-medium">
                {hasGa4Credentials ? 'Configuradas' : 'Faltan variables'}
              </span>
            </p>

            <p className="text-sm text-slate-600">
              Property ID:{' '}
              <span className="font-medium">
                {ga4PropertyId ? 'Configurado' : 'No configurado'}
              </span>
            </p>

            {ga4Error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  Error al consultar GA4
                </p>
                <p className="mt-1 break-words text-sm text-red-700">
                  {ga4Error}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <TodayActions actions={todayActions} />

        <LinkGeneratorCard baseUrl={storeBaseUrl} />

        {sourceLinks.length > 0 ? <SourceLinksCard links={sourceLinks} /> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Sesiones propias"
            value={analyticsSessions}
            helpText="Sesiones registradas en analytics_events"
          />
          <MetricCard
            label="Views propias"
            value={funnelData.views}
            helpText="Eventos view_item guardados por TiendaSmart"
          />
          <MetricCard
            label="Add to cart propios"
            value={funnelData.addToCart}
            helpText="Eventos add_to_cart guardados por TiendaSmart"
          />
          <MetricCard
            label="WhatsApp propios"
            value={funnelData.whatsapp}
            helpText="Eventos send_to_whatsapp guardados por TiendaSmart"
          />
          <MetricCard
            label="Contactos WhatsApp"
            value={funnelData.contactWhatsapp}
            helpText="Eventos contact_whatsapp guardados por TiendaSmart"
          />
        </section>

        {ga4Data ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Usuarios activos"
              value={ga4Data.activeUsers}
              helpText="Personas activas en el período"
            />
            <MetricCard
              label="Sesiones"
              value={ga4Data.sessions}
              helpText="Cantidad total de sesiones"
            />
            <MetricCard
              label="Views"
              value={ga4Data.screenPageViews}
              helpText="Vistas de páginas y pantallas"
            />
            <MetricCard
              label="Purchases"
              value={ga4Data.purchaseEvents}
              helpText="Compras detectadas por GA4"
            />
            <MetricCard
              label="View item"
              value={ga4Data.viewItemEvents}
              helpText="Visualizaciones de producto"
            />
            <MetricCard
              label="Add to cart"
              value={ga4Data.addToCartEvents}
              helpText="Agregados al carrito"
            />
            <MetricCard
              label="Begin checkout"
              value={ga4Data.beginCheckoutEvents}
              helpText="Inicio de checkout"
            />
            <MetricCard
              label="Enviar a WhatsApp"
              value={ga4Data.sendToWhatsAppEvents}
              helpText="Derivaciones al canal de venta"
            />
            <MetricCard
              label="Contact WhatsApp"
              value={ga4Data.contactWhatsAppEvents}
              helpText="Consultas directas detectadas por GA4"
            />
          </section>
        ) : null}

        {ga4Data && ga4Conversion ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Funnel de conversión GA4
            </h3>

            <div className="grid gap-4 text-center sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Views</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.viewItemEvents}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Add to cart</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.addToCartEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatPercent(ga4Conversion.viewToCart)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Checkout</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.beginCheckoutEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatPercent(ga4Conversion.cartToCheckout)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">WhatsApp</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.sendToWhatsAppEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatPercent(ga4Conversion.checkoutToWhatsapp)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Purchase</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.purchaseEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatPercent(ga4Conversion.whatsappToPurchase)}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {ga4Data && ga4Conversion ? (
          <Ga4Charts ga4Data={ga4Data} conversion={ga4Conversion} />
        ) : null}

        {ga4DailySeries.length > 0 ? (
          <Ga4DailySeries points={ga4DailySeries} />
        ) : null}

        <FunnelSection
  viewItemEvents={funnelData.views}
  addToCartEvents={funnelData.addToCart}
  beginCheckoutEvents={funnelData.checkout}
  sendToWhatsAppEvents={funnelData.whatsapp}
  contactWhatsAppEvents={funnelData.contactWhatsapp}
  purchaseEvents={funnelData.orders}
/>

<FunnelComparison comparison={funnelComparison} />

<FunnelDailyChart points={funnelDailySeries} />

<FunnelTrendInsights insights={funnelTrendInsights} />

{sourceSummary ? (
  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <MetricCard
      label="Origen con más tráfico"
      value={`${sourceSummary.topByViews.source}`}
      helpText={`${sourceSummary.topByViews.views} views`}
    />

    <MetricCard
      label="Origen con más contactos"
      value={`${sourceSummary.topByContacts.source}`}
      helpText={`${sourceSummary.topByContacts.contacts} contactos`}
    />

    <MetricCard
      label="Mejor conversión a contacto"
      value={`${sourceSummary.bestConversion.source}`}
      helpText={`${formatPercent(
        sourceSummary.bestConversion.views > 0
          ? (sourceSummary.bestConversion.contacts /
              sourceSummary.bestConversion.views) *
              100
          : 0
      )}`}
    />
  </section>
) : null}

{sourceRows.length > 0 ? (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-slate-900">
        Rendimiento por origen
      </h3>
      <p className="text-sm text-slate-600">
        Qué canales generan más sesiones, vistas, intención de compra y contactos.
      </p>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="px-3 py-2 font-medium">Origen</th>
            <th className="px-3 py-2 font-medium">Medio</th>
            <th className="px-3 py-2 font-medium">Campaña</th>
            <th className="px-3 py-2 font-medium">Sesiones</th>
            <th className="px-3 py-2 font-medium">Views</th>
            <th className="px-3 py-2 font-medium">Add to cart</th>
            <th className="px-3 py-2 font-medium">Checkout</th>
            <th className="px-3 py-2 font-medium">WhatsApp</th>
            <th className="px-3 py-2 font-medium">Contactos</th>
          </tr>
        </thead>
        <tbody>
          {sourceRows.map((row) => (
            <tr
              key={`${row.source}-${row.medium}-${row.campaign}`}
              className="border-b border-slate-100"
            >
              <td className="px-3 py-2 font-medium text-slate-900">
                {row.source}
              </td>
              <td className="px-3 py-2 text-slate-600">{row.medium}</td>
              <td className="px-3 py-2 text-slate-600">{row.campaign}</td>
              <td className="px-3 py-2 text-slate-600">{row.sessions}</td>
              <td className="px-3 py-2 text-slate-600">{row.views}</td>
              <td className="px-3 py-2 text-slate-600">{row.addToCart}</td>
              <td className="px-3 py-2 text-slate-600">{row.checkout}</td>
              <td className="px-3 py-2 text-slate-600">{row.whatsapp}</td>
              <td className="px-3 py-2 text-slate-600">{row.contacts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
) : null}

{tsLinkRows.length > 0 ? (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Rendimiento por link
        </h3>
        <p className="text-sm text-slate-600">
          Qué links específicos generan más sesiones, vistas, contactos y ventas.
        </p>
      </div>

      {tsLinkSummary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TsLinkHighlightCard
            label="Link con más ventas"
            tsLink={tsLinkSummary.topByPurchases.tsLink}
            metric={`${tsLinkSummary.topByPurchases.purchases} ventas`}
            submetric={`Facturación: ${formatMoney(
              tsLinkSummary.topByPurchases.revenue
            )}`}
            accent="emerald"
          />

          <TsLinkHighlightCard
            label="Link con más facturación"
            tsLink={tsLinkSummary.topByRevenue.tsLink}
            metric={formatMoney(tsLinkSummary.topByRevenue.revenue)}
            submetric={`${tsLinkSummary.topByRevenue.purchases} ventas registradas`}
            accent="violet"
          />

          <TsLinkHighlightCard
            label="Mejor ticket promedio"
            tsLink={tsLinkSummary.bestAverageTicket?.tsLink ?? 'sin_link'}
            metric={
              tsLinkSummary.bestAverageTicket
                ? formatMoney(tsLinkSummary.bestAverageTicket.averageTicket)
                : 'Sin ventas'
            }
            submetric={
              tsLinkSummary.bestAverageTicket
                ? `${tsLinkSummary.bestAverageTicket.purchases} ventas para este link`
                : 'Todavía no hay compras atribuidas a links'
            }
            accent="amber"
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-3 font-medium">Link</th>
              <th className="px-3 py-3 font-medium">Sesiones</th>
              <th className="px-3 py-3 font-medium">Views</th>
              <th className="px-3 py-3 font-medium">Add to cart</th>
              <th className="px-3 py-3 font-medium">Checkout</th>
              <th className="px-3 py-3 font-medium">WhatsApp</th>
              <th className="px-3 py-3 font-medium">Contactos</th>
              <th className="px-3 py-3 font-medium">Ventas</th>
              <th className="px-3 py-3 font-medium">Facturación</th>
              <th className="px-3 py-3 font-medium">Ticket prom.</th>
              <th className="px-3 py-3 font-medium">Conv. a contacto</th>
            </tr>
          </thead>
          <tbody>
            {tsLinkRows.map((row) => (
              <tr key={row.tsLink} className="border-b border-slate-100 last:border-b-0">
                <td className="px-3 py-3 font-medium text-slate-900">
                  <span className="break-all font-mono text-xs sm:text-sm">
                    {formatTsLinkDisplay(row.tsLink)}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600">{row.sessions}</td>
                <td className="px-3 py-3 text-slate-600">{row.views}</td>
                <td className="px-3 py-3 text-slate-600">{row.addToCart}</td>
                <td className="px-3 py-3 text-slate-600">{row.checkout}</td>
                <td className="px-3 py-3 text-slate-600">{row.whatsapp}</td>
                <td className="px-3 py-3 text-slate-600">{row.contacts}</td>
                <td className="px-3 py-3 text-slate-600">{row.purchases}</td>
                <td className="px-3 py-3 text-slate-600">
                  {formatMoney(row.revenue)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatMoney(row.averageTicket)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatPercent(row.conversionToContact)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
) : null}

{sourceInsights.length > 0 ? (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="mb-4 text-lg font-semibold text-slate-900">
      Insights automáticos por canal
    </h3>

    <div className="grid gap-4 xl:grid-cols-2">
      {sourceInsights.map((insight) => (
        <InsightCard
          key={`${insight.title}-${insight.description}`}
          insight={insight}
        />
      ))}
    </div>
  </section>
) : null}

        <ExecutiveSummary items={executiveSummary} />

        <ProductInsights insights={productInsights} />

        <ProductAlerts alerts={productAlerts} />

<CategoryInsights insights={categoryInsights} />

        {insights.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Insights automáticos del funnel propio
            </h3>

            <div className="grid gap-4 xl:grid-cols-2">
              {insights.map((insight) => (
                <InsightCard
                  key={`${insight.title}-${insight.description}`}
                  insight={insight}
                />
              ))}
            </div>
          </section>
        ) : null}

        {topProductsInsights.length > 0 ? (
          <Ga4TopProductsInsights rows={topProductsInsights} />
        ) : (
          <Ga4TopProductsPlaceholder
            hasGa4Credentials={hasGa4Credentials}
            hasPropertyId={Boolean(ga4PropertyId)}
            hasOrdersData={rangeFilteredOrderItems.length > 0}
            ga4Error={ga4Error}
          />
        )}

        <OrdersRangeTabs
          basePath="/admin/analytics"
          currentRange={range}
          status="all"
          queryText=""
          delivery="all"
          notes="all"
        />

        <OrdersAnalyticsSection
          orders={rangeFilteredOrders}
          items={rangeFilteredOrderItems}
          range={range}
          comparison={comparison}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Dashboard embebido
            </h2>
            <p className="text-sm text-slate-600">
              Visualización integrada de Power BI dentro del panel de
              TiendaSmart.
            </p>
          </div>

          {powerBiEmbedUrl ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <iframe
                title="Power BI Dashboard"
                src={powerBiEmbedUrl}
                className="h-[720px] w-full"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
              Todavía no configuraste el enlace embebible de Power BI en
              <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-slate-700">
                NEXT_PUBLIC_POWER_BI_EMBED_URL
              </code>
              .
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
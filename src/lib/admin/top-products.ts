import type { OrderItemRow, RangeValue } from '@/lib/admin/orders';
import { getGa4TopProducts } from '@/lib/ga4';

export type TopProductInsightTone = 'success' | 'warning' | 'neutral';

export type TopProductInsightRow = {
  itemId: string;
  itemName: string;
  views: number;
  addToCartEvents: number;
  addedUnits: number;
  purchasedUnits: number;
  revenue: number;
  viewToCartRate: number | null;
  cartToPurchaseRate: number | null;
  viewToPurchaseRate: number | null;
  insightTitle: string;
  insightText: string;
  tone: TopProductInsightTone;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

function toSafeNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return null;
  return numerator / denominator;
}

function buildInsight(row: {
  views: number;
  addToCartEvents: number;
  purchasedUnits: number;
  viewToCartRate: number | null;
  cartToPurchaseRate: number | null;
  viewToPurchaseRate: number | null;
}): Pick<TopProductInsightRow, 'insightTitle' | 'insightText' | 'tone'> {
  if (row.views >= 20 && row.purchasedUnits === 0) {
    return {
      insightTitle: 'Mucho interés, cero cierre',
      insightText:
        'Este producto recibe atención pero no está cerrando ventas. Revisá precio, fotos, descripción o stock.',
      tone: 'warning',
    };
  }

  if (
    (row.viewToCartRate ?? 0) >= 0.08 &&
    (row.cartToPurchaseRate ?? 0) < 0.25 &&
    row.addToCartEvents >= 3
  ) {
    return {
      insightTitle: 'Llega al carrito pero se cae',
      insightText:
        'Hay intención clara de compra, pero el cierre es bajo. Puede haber fricción en WhatsApp, precio final o costo de envío.',
      tone: 'warning',
    };
  }

  if ((row.viewToPurchaseRate ?? 0) >= 0.05 && row.purchasedUnits >= 2) {
    return {
      insightTitle: 'Producto fuerte',
      insightText:
        'Conviene destacarlo en portada, historias, catálogo y campañas. Ya probó que convierte.',
      tone: 'success',
    };
  }

  if (row.purchasedUnits > 0 && row.views < 10) {
    return {
      insightTitle: 'Nicho eficiente',
      insightText:
        'No tiene gran volumen, pero cuando lo ven suele rendir bien. Puede servir para venta cruzada.',
      tone: 'success',
    };
  }

  return {
    insightTitle: 'Señal estable',
    insightText:
      'Todavía no hay una señal comercial fuerte. Seguimos juntando datos para decidir mejor.',
      tone: 'neutral',
  };
}

export async function getTopProductsInsights(params: {
  propertyId: string;
  range: RangeValue;
  orderItems: OrderItemRow[];
  limit?: number;
}): Promise<TopProductInsightRow[]> {
  const { propertyId, range, orderItems, limit = 10 } = params;

  const gaRows = await getGa4TopProducts({
    propertyId,
    range,
    limit: Math.max(limit * 2, 20),
  });

  const salesMap = new Map<
    string,
    {
      itemId: string;
      itemName: string;
      purchasedUnits: number;
      revenue: number;
    }
  >();

  for (const item of orderItems) {
    const itemId =
      typeof item.product_id === 'string' ? item.product_id.trim() : '';

    const itemName =
      typeof item.product_name === 'string' && item.product_name.trim()
        ? item.product_name.trim()
        : 'Producto';

    const fallbackKey = normalizeText(itemName);
    const key = itemId || fallbackKey;

    if (!key) continue;

    const current = salesMap.get(key) ?? {
      itemId,
      itemName,
      purchasedUnits: 0,
      revenue: 0,
    };

    current.purchasedUnits += toSafeNumber(item.quantity);
    current.revenue += toSafeNumber(item.line_total);

    if (!current.itemId && itemId) current.itemId = itemId;
    if (!current.itemName || current.itemName === 'Producto') {
      current.itemName = itemName;
    }

    salesMap.set(key, current);
  }

  const merged = new Map<string, TopProductInsightRow>();

  for (const ga of gaRows) {
    const normalizedItemId = ga.itemId?.trim() ?? '';
    const normalizedItemName = ga.itemName?.trim() || 'Producto';
    const fallbackKey = normalizeText(normalizedItemName);
    const key = normalizedItemId || fallbackKey;

    if (!key) continue;

    const sales = salesMap.get(key);

    const views = toSafeNumber(ga.itemViewEvents);
    const addToCartEvents = toSafeNumber(ga.addToCartEvents);
    const purchasedUnits = sales?.purchasedUnits ?? 0;
    const revenue = sales?.revenue ?? 0;

    const rowBase = {
      itemId: normalizedItemId || sales?.itemId || '',
      itemName: normalizedItemName || sales?.itemName || 'Producto',
      views,
      addToCartEvents,
      addedUnits: addToCartEvents,
      purchasedUnits,
      revenue,
      viewToCartRate: percent(addToCartEvents, views),
      cartToPurchaseRate: percent(purchasedUnits, addToCartEvents),
      viewToPurchaseRate: percent(purchasedUnits, views),
    };

    const insight = buildInsight(rowBase);

    merged.set(key, {
      ...rowBase,
      ...insight,
    });
  }

  for (const [key, sales] of salesMap.entries()) {
    if (merged.has(key)) continue;

    const rowBase = {
      itemId: sales.itemId,
      itemName: sales.itemName || 'Producto',
      views: 0,
      addToCartEvents: 0,
      addedUnits: 0,
      purchasedUnits: sales.purchasedUnits,
      revenue: sales.revenue,
      viewToCartRate: null,
      cartToPurchaseRate: null,
      viewToPurchaseRate: null,
    };

    const insight = buildInsight(rowBase);

    merged.set(key, {
      ...rowBase,
      ...insight,
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => {
      const scoreA =
        a.revenue * 100 +
        a.purchasedUnits * 20 +
        a.addToCartEvents * 10 +
        a.views;

      const scoreB =
        b.revenue * 100 +
        b.purchasedUnits * 20 +
        b.addToCartEvents * 10 +
        b.views;

      return scoreB - scoreA;
    })
    .slice(0, limit);
}
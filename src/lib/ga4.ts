import { GoogleAuth } from 'google-auth-library';
import type { RangeValue } from '@/lib/admin/orders';

type Ga4MetricValue = {
  name: string;
  value: number;
};

export type Ga4Overview = {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  totalEventCount: number;
  viewItemEvents: number;
  addToCartEvents: number;
  beginCheckoutEvents: number;
  purchaseEvents: number;
  sendToWhatsAppEvents: number;
  contactWhatsAppEvents: number;
};

type Ga4DateRange = {
  startDate: string;
  endDate: string;
};

export type Ga4DailyPoint = {
  date: string;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  viewItemEvents: number;
  addToCartEvents: number;
  beginCheckoutEvents: number;
  purchaseEvents: number;
  sendToWhatsAppEvents: number;
};

export type Ga4TopProductRow = {
  itemId: string;
  itemName: string;
  itemViewEvents: number;
  addToCartEvents: number;
};

type Ga4ReportRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

type Ga4MetadataResponse = {
  dimensions?: Array<{
    apiName?: string;
    uiName?: string;
    customDefinition?: boolean;
  }>;
  metrics?: Array<{
    apiName?: string;
    uiName?: string;
    customDefinition?: boolean;
  }>;
};

function getCredentials() {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON no está definida');
  }

  let parsed: {
    client_email?: string;
    private_key?: string;
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON no contiene un JSON válido');
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      'GA4_SERVICE_ACCOUNT_JSON no contiene client_email o private_key'
    );
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, '\n'),
  };
}

async function getAccessToken() {
  const { client_email, private_key } = getCredentials();

  const auth = new GoogleAuth({
    credentials: {
      client_email,
      private_key,
    },
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  if (!token.token) {
    throw new Error('No se pudo obtener token');
  }

  return token.token;
}

async function runGa4Report(params: {
  propertyId: string;
  dateRanges: Ga4DateRange[];
  metrics: Array<{ name: string }>;
  dimensions?: Array<{ name: string }>;
  dimensionFilter?: unknown;
  orderBys?: unknown[];
  limit?: string;
}) {
  const token = await getAccessToken();

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${params.propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: params.dateRanges,
        metrics: params.metrics,
        dimensions: params.dimensions,
        dimensionFilter: params.dimensionFilter,
        orderBys: params.orderBys,
        limit: params.limit,
      }),
      cache: 'no-store',
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(json));
  }

  return json;
}

export async function getGa4Metadata(
  propertyId: string
): Promise<Ga4MetadataResponse> {
  const token = await getAccessToken();

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1alpha/properties/${propertyId}/metadata`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(json));
  }

  return json as Ga4MetadataResponse;
}

export async function hasGa4ProductCustomDimensions(propertyId: string) {
  const metadata = await getGa4Metadata(propertyId);

  const dimensionNames = new Set(
    (metadata.dimensions ?? []).map((dimension) => dimension.apiName ?? '')
  );

  return {
    hasProductId: dimensionNames.has('customEvent:product_id'),
    hasProductName: dimensionNames.has('customEvent:product_name'),
  };
}

function parseMetricRows(
  row:
    | {
        metricValues?: Array<{ value?: string }>;
      }
    | undefined,
  metricNames: string[]
): Ga4MetricValue[] {
  return metricNames.map((name, index) => ({
    name,
    value: Number(row?.metricValues?.[index]?.value ?? 0),
  }));
}

function getDateRange(range: RangeValue): Ga4DateRange {
  return range === 'today'
    ? { startDate: 'today', endDate: 'today' }
    : range === '7d'
      ? { startDate: '7daysAgo', endDate: 'today' }
      : range === '30d'
        ? { startDate: '30daysAgo', endDate: 'today' }
        : range === 'month'
          ? { startDate: '28daysAgo', endDate: 'today' }
          : { startDate: '365daysAgo', endDate: 'today' };
}

async function getEventCountByName(params: {
  propertyId: string;
  eventName:
    | 'view_item'
    | 'add_to_cart'
    | 'begin_checkout'
    | 'purchase'
    | 'send_to_whatsapp'
    | 'contact_whatsapp';
  dateRange: Ga4DateRange;
}) {
  const data = await runGa4Report({
    propertyId: params.propertyId,
    dateRanges: [params.dateRange],
    metrics: [{ name: 'eventCount' }],
    dimensions: [{ name: 'eventName' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: {
          matchType: 'EXACT',
          value: params.eventName,
        },
      },
    },
  });

  return Number(data?.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

async function getDailyEventSeries(params: {
  propertyId: string;
  eventName:
    | 'view_item'
    | 'add_to_cart'
    | 'begin_checkout'
    | 'purchase'
    | 'send_to_whatsapp';
  dateRange: Ga4DateRange;
}) {
  const data = await runGa4Report({
    propertyId: params.propertyId,
    dateRanges: [params.dateRange],
    metrics: [{ name: 'eventCount' }],
    dimensions: [{ name: 'date' }, { name: 'eventName' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: {
          matchType: 'EXACT',
          value: params.eventName,
        },
      },
    },
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  const rows = (data?.rows ?? []) as Ga4ReportRow[];

  return rows.map((row) => ({
    date: String(row.dimensionValues?.[0]?.value ?? ''),
    value: Number(row.metricValues?.[0]?.value ?? 0),
  }));
}

async function getProductEventSeries(params: {
  propertyId: string;
  eventName: 'view_item' | 'add_to_cart';
  range: RangeValue;
  limit?: number;
}) {
  const dateRange = getDateRange(params.range);

  const dims = await hasGa4ProductCustomDimensions(params.propertyId);

  if (!dims.hasProductId || !dims.hasProductName) {
    return [];
  }

  const report = await runGa4Report({
    propertyId: params.propertyId,
    dateRanges: [dateRange],
    dimensions: [
      { name: 'customEvent:product_id' },
      { name: 'customEvent:product_name' },
    ],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'eventName',
              stringFilter: {
                matchType: 'EXACT',
                value: params.eventName,
              },
            },
          },
          {
            filter: {
              fieldName: 'customEvent:product_id',
              stringFilter: {
                matchType: 'FULL_REGEXP',
                value: '.+',
              },
            },
          },
        ],
      },
    },
    orderBys: [
      {
        metric: {
          metricName: 'eventCount',
        },
        desc: true,
      },
    ],
    limit: String(params.limit ?? 50),
  });

  const rows = (report.rows ?? []) as Ga4ReportRow[];

  return rows.map((row) => {
    const [itemId = '', itemName = 'Sin nombre'] =
      row.dimensionValues?.map((dimension) => dimension.value ?? '') ?? [];

    const [eventCount = '0'] =
      row.metricValues?.map((metric) => metric.value ?? '0') ?? [];

    return {
      itemId,
      itemName,
      eventCount: Number(eventCount) || 0,
    };
  });
}

export async function getGa4Overview(params: {
  propertyId: string;
  range: RangeValue;
}): Promise<Ga4Overview> {
  const dateRange = getDateRange(params.range);

  const overviewData = await runGa4Report({
    propertyId: params.propertyId,
    dateRanges: [dateRange],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'eventCount' },
    ],
  });

  const metrics = parseMetricRows(overviewData?.rows?.[0], [
    'activeUsers',
    'sessions',
    'screenPageViews',
    'eventCount',
  ]);

  const getMetric = (name: string) =>
    metrics.find((metric) => metric.name === name)?.value ?? 0;

  const [
    viewItemEvents,
    addToCartEvents,
    beginCheckoutEvents,
    purchaseEvents,
    sendToWhatsAppEvents,
    contactWhatsAppEvents,
  ] = await Promise.all([
    getEventCountByName({
      propertyId: params.propertyId,
      eventName: 'view_item',
      dateRange,
    }),
    getEventCountByName({
      propertyId: params.propertyId,
      eventName: 'add_to_cart',
      dateRange,
    }),
    getEventCountByName({
      propertyId: params.propertyId,
      eventName: 'begin_checkout',
      dateRange,
    }),
    getEventCountByName({
      propertyId: params.propertyId,
      eventName: 'purchase',
      dateRange,
    }),
    getEventCountByName({
      propertyId: params.propertyId,
      eventName: 'send_to_whatsapp',
      dateRange,
    }),
    getEventCountByName({
      propertyId: params.propertyId,
      eventName: 'contact_whatsapp',
      dateRange,
    }),
  ]);

  return {
    activeUsers: getMetric('activeUsers'),
    sessions: getMetric('sessions'),
    screenPageViews: getMetric('screenPageViews'),
    totalEventCount: getMetric('eventCount'),
    viewItemEvents,
    addToCartEvents,
    beginCheckoutEvents,
    purchaseEvents,
    sendToWhatsAppEvents,
    contactWhatsAppEvents,
  };
}

export async function getGa4DailySeries(params: {
  propertyId: string;
  range: RangeValue;
}): Promise<Ga4DailyPoint[]> {
  const dateRange = getDateRange(params.range);

  const [
    trafficData,
    viewItemSeries,
    addToCartSeries,
    beginCheckoutSeries,
    purchaseSeries,
    whatsappSeries,
  ] = await Promise.all([
    runGa4Report({
      propertyId: params.propertyId,
      dateRanges: [dateRange],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    getDailyEventSeries({
      propertyId: params.propertyId,
      eventName: 'view_item',
      dateRange,
    }),
    getDailyEventSeries({
      propertyId: params.propertyId,
      eventName: 'add_to_cart',
      dateRange,
    }),
    getDailyEventSeries({
      propertyId: params.propertyId,
      eventName: 'begin_checkout',
      dateRange,
    }),
    getDailyEventSeries({
      propertyId: params.propertyId,
      eventName: 'purchase',
      dateRange,
    }),
    getDailyEventSeries({
      propertyId: params.propertyId,
      eventName: 'send_to_whatsapp',
      dateRange,
    }),
  ]);

  const rows = (trafficData?.rows ?? []) as Ga4ReportRow[];

  const map = new Map<string, Ga4DailyPoint>();

  for (const row of rows) {
    const date = String(row.dimensionValues?.[0]?.value ?? '');

    map.set(date, {
      date,
      activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
      screenPageViews: Number(row.metricValues?.[2]?.value ?? 0),
      viewItemEvents: 0,
      addToCartEvents: 0,
      beginCheckoutEvents: 0,
      purchaseEvents: 0,
      sendToWhatsAppEvents: 0,
    });
  }

  for (const point of viewItemSeries) {
    const current = map.get(point.date);
    if (current) current.viewItemEvents = point.value;
  }

  for (const point of addToCartSeries) {
    const current = map.get(point.date);
    if (current) current.addToCartEvents = point.value;
  }

  for (const point of beginCheckoutSeries) {
    const current = map.get(point.date);
    if (current) current.beginCheckoutEvents = point.value;
  }

  for (const point of purchaseSeries) {
    const current = map.get(point.date);
    if (current) current.purchaseEvents = point.value;
  }

  for (const point of whatsappSeries) {
    const current = map.get(point.date);
    if (current) current.sendToWhatsAppEvents = point.value;
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getGa4TopProducts(params: {
  propertyId: string;
  range: RangeValue;
  limit?: number;
}): Promise<Ga4TopProductRow[]> {
  const limit = Math.max(params.limit ?? 20, 20);

  const dims = await hasGa4ProductCustomDimensions(params.propertyId);

  if (!dims.hasProductId || !dims.hasProductName) {
    return [];
  }

  const [viewRows, cartRows] = await Promise.all([
    getProductEventSeries({
      propertyId: params.propertyId,
      eventName: 'view_item',
      range: params.range,
      limit,
    }),
    getProductEventSeries({
      propertyId: params.propertyId,
      eventName: 'add_to_cart',
      range: params.range,
      limit,
    }),
  ]);

  const merged = new Map<string, Ga4TopProductRow>();

  for (const row of viewRows) {
    const key = row.itemId || row.itemName;

    if (!key) continue;

    merged.set(key, {
      itemId: row.itemId,
      itemName: row.itemName,
      itemViewEvents: row.eventCount,
      addToCartEvents: 0,
    });
  }

  for (const row of cartRows) {
    const key = row.itemId || row.itemName;

    if (!key) continue;

    const current = merged.get(key);

    if (current) {
      current.addToCartEvents = row.eventCount;
      if (!current.itemName && row.itemName) current.itemName = row.itemName;
      if (!current.itemId && row.itemId) current.itemId = row.itemId;
    } else {
      merged.set(key, {
        itemId: row.itemId,
        itemName: row.itemName,
        itemViewEvents: 0,
        addToCartEvents: row.eventCount,
      });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => {
      const scoreA = a.itemViewEvents * 10 + a.addToCartEvents * 20;
      const scoreB = b.itemViewEvents * 10 + b.addToCartEvents * 20;
      return scoreB - scoreA;
    })
    .slice(0, params.limit ?? 20);
}
import { GoogleAuth } from 'google-auth-library';

type Ga4MetricValue = {
  name: string;
  value: number;
};

type Ga4Overview = {
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

export async function getGa4Overview(params: {
  propertyId: string;
  range: 'today' | '7d' | '30d' | 'month' | 'all';
}): Promise<Ga4Overview> {
  const dateRange =
    params.range === 'today'
      ? { startDate: 'today', endDate: 'today' }
      : params.range === '7d'
      ? { startDate: '7daysAgo', endDate: 'today' }
      : params.range === '30d'
      ? { startDate: '30daysAgo', endDate: 'today' }
      : params.range === 'month'
      ? { startDate: '28daysAgo', endDate: 'today' }
      : { startDate: '365daysAgo', endDate: 'today' };

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
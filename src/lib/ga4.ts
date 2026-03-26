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

function getAccessTokenConfig() {
  const clientEmailRaw = process.env.GA4_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GA4_PRIVATE_KEY;

  if (!clientEmailRaw || !privateKeyRaw) {
    throw new Error(
      'Faltan GA4_CLIENT_EMAIL o GA4_PRIVATE_KEY en las variables de entorno.'
    );
  }

  const clientEmail = clientEmailRaw
    .trim()
    .replace(/^"([\s\S]*)"$/, '$1')
    .replace(/^'([\s\S]*)'$/, '$1');

  const privateKey = privateKeyRaw
    .trim()
    .replace(/^"([\s\S]*)"$/, '$1')
    .replace(/^'([\s\S]*)'$/, '$1')
    .replace(/\\n/g, '\n');

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('GA4_PRIVATE_KEY no tiene un formato PEM válido.');
  }

  return {
    clientEmail,
    privateKey,
  };
}

async function getAccessToken() {
  const { clientEmail, privateKey } = getAccessTokenConfig();

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const token = accessTokenResponse.token;

  if (!token) {
    throw new Error('No se pudo obtener el access token de Google.');
  }

  return token;
}

async function runGa4Report(params: {
  propertyId: string;
  dateRanges: Ga4DateRange[];
  metrics: Array<{ name: string }>;
  dimensions?: Array<{ name: string }>;
  dimensionFilter?: unknown;
}) {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${params.propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error consultando GA4 Data API: ${errorText}`);
  }

  return response.json();
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

  const getMetric = (name: string) =>
    metrics.find((metric) => metric.name === name)?.value ?? 0;

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
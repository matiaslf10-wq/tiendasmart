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
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Faltan GA4_CLIENT_EMAIL o GA4_PRIVATE_KEY en las variables de entorno.'
    );
  }

  return {
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

async function createJwt() {
  const { clientEmail, privateKey } = getAccessTokenConfig();

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();

  const base64UrlEncode = (input: string | Uint8Array) => {
    const bytes =
      typeof input === 'string' ? encoder.encode(input) : input;

    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return Buffer.from(binary, 'binary')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;

  const crypto = await import('crypto');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(privateKey);

  const signedToken = `${unsignedToken}.${signature
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')}`;

  return signedToken;
}

async function getAccessToken() {
  const assertion = await createJwt();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No se pudo obtener access token de Google: ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
  };

  return data.access_token;
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
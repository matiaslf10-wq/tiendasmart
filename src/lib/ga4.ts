import { GoogleAuth } from 'google-auth-library';

function getCredentials() {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON no está definida');
  }

  const parsed = JSON.parse(raw);

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

  if (!token.token) throw new Error('No se pudo obtener token');

  return token.token;
}

export async function getGa4Overview({
  propertyId,
}: {
  propertyId: string;
  range: string;
}) {
  const token = await getAccessToken();

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'eventCount' },
        ],
      }),
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(json));
  }

  const row = json.rows?.[0];

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
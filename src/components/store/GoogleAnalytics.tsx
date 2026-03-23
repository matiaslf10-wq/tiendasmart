'use client';

import { Suspense } from 'react';
import Script from 'next/script';
import GoogleAnalyticsPageTracker from './GoogleAnalyticsPageTracker';

type Props = {
  measurementId: string;
};

export default function GoogleAnalytics({ measurementId }: Props) {
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>

      <Suspense fallback={null}>
        <GoogleAnalyticsPageTracker measurementId={measurementId} />
      </Suspense>
    </>
  );
}
"use client";

/**
 * GA4 + GTM injection and page-view tracking (Req 14.1, 14.2).
 *
 * Mounted once in the root layout. Responsibilities:
 *   - Inject the Google Analytics 4 (gtag.js) and Google Tag Manager loader
 *     scripts via the Next.js App Router `<Script>` strategy
 *     (`afterInteractive`), so they never block first paint.
 *   - Emit a GA4 `page_view` on every client-side route change (Req 14.1),
 *     including search-param changes, since the SPA navigation does not trigger
 *     a fresh gtag config page_view.
 *
 * Graceful no-op: when neither `NEXT_PUBLIC_GA4_ID`/`NEXT_PUBLIC_GA_ID` nor
 * `NEXT_PUBLIC_GTM_ID` is configured, this component renders nothing and adds
 * no scripts. Analytics is strictly best-effort and must never block render.
 *
 * The companion `<AnalyticsNoScript />` renders the GTM `<noscript>` iframe and
 * is placed at the top of `<body>` in the layout.
 */
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import {
  GA_MEASUREMENT_ID,
  GTM_CONTAINER_ID,
  isGaEnabled,
  isGtmEnabled,
  trackPageView,
} from "@/lib/analytics/gtag";

/** Fires a GA4 page-view whenever the resolved URL changes. */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isGaEnabled && !isGtmEnabled) {
      return;
    }
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

/**
 * Injects analytics loader scripts and tracks page views. Renders nothing when
 * no analytics IDs are configured.
 */
export function Analytics() {
  if (!isGaEnabled && !isGtmEnabled) {
    return null;
  }

  return (
    <>
      {isGaEnabled ? (
        <>
          <Script
            id="ga4-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
            `}
          </Script>
        </>
      ) : null}

      {isGtmEnabled ? (
        <Script id="gtm-loader" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
          `}
        </Script>
      ) : null}

      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}

/**
 * GTM `<noscript>` fallback iframe. Rendered immediately after the opening
 * `<body>` tag per Google's installation guidance. No-op when GTM is unset.
 */
export function AnalyticsNoScript() {
  if (!isGtmEnabled) {
    return null;
  }
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}

export default Analytics;

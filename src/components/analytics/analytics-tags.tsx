import { PixelPageViews } from "@/components/analytics/pixel-page-views";

/**
 * Google Analytics 4 and the Meta Pixel, on the shop's pages only (not admin). Their start-up
 * snippets are plain scripts in the page itself, so they run before the page comes to life:
 * an event sent straight away (a product view or a purchase on a page someone lands on from
 * Instagram) waits in their queue until Google's and Meta's code has loaded, instead of being lost.
 */
export function AnalyticsTags({ gaId, pixelId }: { gaId: string | null; pixelId: string | null }) {
  return (
    <>
      {gaId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}');`,
            }}
          />
        </>
      )}
      {pixelId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`,
            }}
          />
          <PixelPageViews />
        </>
      )}
    </>
  );
}

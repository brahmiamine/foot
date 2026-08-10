"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

function isAdminSection(pathname: string | null): boolean {
  return pathname === "/login" || (pathname?.startsWith("/admin") ?? false);
}

/**
 * Legacy "Footclub" vitrine template assets (Bootstrap plugins, GSAP, Swiper,
 * custom cursor, parallax...) — only needed by the handful of public pages
 * still built on that template (e.g. /devenir-sponsor). The admin section and
 * /login render their own dedicated stylesheets (skote-admin.css,
 * login-skote.css) and never touch jQuery/Bootstrap JS, so none of this
 * ~600KB bundle should ever be fetched on those routes.
 *
 * jQuery itself stays in the root layout (see layout.tsx): Next.js requires
 * `beforeInteractive` scripts to live directly in app/layout.tsx, and every
 * script below depends on jQuery already being defined.
 */
export function TemplateAssets() {
  const pathname = usePathname();
  if (isAdminSection(pathname)) return null;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />

      <link rel="preload" href="/css/bootstrap.min.css" as="style" />
      <link rel="preload" href="/css/custom.css" as="style" />
      <link rel="preload" href="/css/all.min.css" as="style" />

      {/* Bootstrap JS from template - Loaded after jQuery */}
      <Script src="/js/bootstrap.min.js" strategy="afterInteractive" />

      {/* All other template JS files */}
      <Script src="/js/validator.min.js" strategy="afterInteractive" />
      <Script src="/js/jquery.slicknav.js" strategy="afterInteractive" />
      <Script src="/js/swiper-bundle.min.js" strategy="afterInteractive" />
      <Script src="/js/jquery.waypoints.min.js" strategy="afterInteractive" />
      <Script src="/js/jquery.counterup.min.js" strategy="afterInteractive" />
      <Script src="/js/jquery.magnific-popup.min.js" strategy="afterInteractive" />
      <Script src="/js/SmoothScroll.js" strategy="afterInteractive" />
      <Script src="/js/parallaxie.js" strategy="afterInteractive" />
      <Script src="/js/gsap.min.js" strategy="afterInteractive" />
      <Script src="/js/magiccursor.js" strategy="afterInteractive" />
      <Script src="/js/SplitText.js" strategy="afterInteractive" />
      <Script src="/js/ScrollTrigger.min.js" strategy="afterInteractive" />
      <Script src="/js/jquery.mb.YTPlayer.min.js" strategy="afterInteractive" />
      <Script src="/js/wow.min.js" strategy="afterInteractive" />
      <Script src="/js/function.js" strategy="afterInteractive" />
    </>
  );
}

import type { Metadata } from "next";
import Script from "next/script";
import { TemplateAssets } from "@/components/TemplateAssets";
import "./globals.css";

export const metadata: Metadata = {
  title: "Footclub - Soccer and Football Club",
  description: "Site vitrine du club avec le template Footclub (Next.js + TypeScript).",
  icons: {
    icon: "/images/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="css-loading" suppressHydrationWarning>
      <body>
        {/* Critical inline styles to prevent FOUC - Loads immediately */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Hide everything immediately until CSS is ready */
              html.css-loading body,
              html:not(.css-ready) body {
                visibility: hidden !important;
                opacity: 0 !important;
              }
              
              /* Show content smoothly when CSS is ready */
              html.css-ready body {
                visibility: visible !important;
                opacity: 1 !important;
                transition: opacity 0.15s ease-in;
              }
              
              /* Ensure admin pages are also hidden until CSS is ready */
              html.css-loading .admin-layout,
              html:not(.css-ready) .admin-layout,
              html.css-loading .admin-main,
              html:not(.css-ready) .admin-main,
              html.css-loading .admin-content-wrapper,
              html:not(.css-ready) .admin-content-wrapper {
                visibility: hidden !important;
                opacity: 0 !important;
              }
            `,
          }}
        />

        {/* CRITICAL: Load Template CSS files synchronously in exact template order */}
        {/* Order matches template/index.html exactly to prevent style conflicts */}
        <Script
          id="load-template-css-blocking"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // The admin section and /login use their own dedicated stylesheets
                // (skote-admin.css, login-skote.css) instead of the Footclub template —
                // skip loading Bootstrap/FontAwesome/custom.css there entirely so the
                // two never collide on the same page.
                var isAdminSection = /^\\/admin(\\/|$)/.test(window.location.pathname) || window.location.pathname === '/login';
                if (isAdminSection) {
                  document.documentElement.classList.remove('css-loading');
                  document.documentElement.classList.add('css-ready');
                  return;
                }

                var cssLoaded = 0;
                var totalCSS = 4; // Bootstrap, SlickNav, Font Awesome, Custom CSS

                function checkAllLoaded() {
                  cssLoaded++;
                  if (cssLoaded >= totalCSS) {
                    // Remove loading class and add ready class
                    document.documentElement.classList.remove('css-loading');
                    document.documentElement.classList.add('css-ready');
                    // Force a reflow to ensure styles are applied
                    void document.body.offsetHeight;
                  }
                }
                
                // Start with loading state
                document.documentElement.classList.add('css-loading');
                
                // Load CSS files in EXACT order as template/index.html
                // Use blocking method to ensure CSS loads before rendering
                
                // 1. Bootstrap CSS (from template/css/bootstrap.min.css) - CRITICAL
                var bootstrapLink = document.createElement('link');
                bootstrapLink.rel = 'stylesheet';
                bootstrapLink.href = '/css/bootstrap.min.css';
                bootstrapLink.media = 'screen';
                bootstrapLink.onload = checkAllLoaded;
                bootstrapLink.onerror = checkAllLoaded;
                // Insert at the beginning to ensure it loads first
                document.head.insertBefore(bootstrapLink, document.head.firstChild);
                
                // 2. SlickNav CSS (from template/css/slicknav.min.css)
                var slicknavLink = document.createElement('link');
                slicknavLink.rel = 'stylesheet';
                slicknavLink.href = '/css/slicknav.min.css';
                slicknavLink.onload = checkAllLoaded;
                slicknavLink.onerror = checkAllLoaded;
                document.head.appendChild(slicknavLink);
                
                // 3. Font Awesome CSS (from template/css/all.min.css) - CRITICAL
                var faLink = document.createElement('link');
                faLink.rel = 'stylesheet';
                faLink.href = '/css/all.min.css';
                faLink.media = 'screen';
                faLink.onload = checkAllLoaded;
                faLink.onerror = checkAllLoaded;
                document.head.appendChild(faLink);
                
                // 4. Custom CSS (from template/css/custom.css) - MUST load last to override all - CRITICAL
                var customLink = document.createElement('link');
                customLink.rel = 'stylesheet';
                customLink.href = '/css/custom.css';
                customLink.media = 'screen';
                customLink.onload = function() {
                  checkAllLoaded();
                  // Force a reflow to ensure styles are applied
                  document.body.offsetHeight;
                };
                customLink.onerror = checkAllLoaded;
                document.head.appendChild(customLink);
                
                // Fallback: show content after 800ms even if CSS isn't fully loaded
                // This ensures content is visible even if CSS loading is slow
                setTimeout(function() {
                  document.documentElement.classList.remove('css-loading');
                  document.documentElement.classList.add('css-ready');
                }, 800);
              })();
            `,
          }}
        />

        {/* Load remaining template CSS files asynchronously (non-critical) */}
        <Script
          id="load-template-css-async"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var isAdminSection = /^\\/admin(\\/|$)/.test(window.location.pathname) || window.location.pathname === '/login';
                if (isAdminSection) return;

                // Load in template order
                var cssFiles = [
                  '/css/swiper-bundle.min.css',
                  '/css/animate.css',
                  '/css/magnific-popup.css',
                  '/css/mousecursor.css'
                ];
                
                cssFiles.forEach(function(href) {
                  var link = document.createElement('link');
                  link.rel = 'stylesheet';
                  link.href = href;
                  document.head.appendChild(link);
                });
                
                // Google Fonts (same as template)
                var fontsLink = document.createElement('link');
                fontsLink.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@200..800&display=swap';
                fontsLink.rel = 'stylesheet';
                document.head.appendChild(fontsLink);
              })();
            `,
          }}
        />
        {/* jQuery must load first (beforeInteractive) - Next.js only allows this
            strategy directly in the root layout. Every other template script
            (Bootstrap JS, GSAP, Swiper...) depends on it and is loaded by
            <TemplateAssets>, which skips /admin and /login entirely. */}
        <Script src="/js/jquery-3.7.1.min.js" strategy="beforeInteractive" />

        <TemplateAssets />

        {children}
      </body>
    </html>
  );
}

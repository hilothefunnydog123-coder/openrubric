"use client";

import { useEffect } from "react";

/**
 * Google Translate web widget — a lightweight, free way to translate the whole site into
 * any language. Client-only: the GT script is injected once after mount, and the dropdown
 * renders into #google_translate_element. Kept isolated so it doesn't fight React hydration
 * (the container is hydration-suppressed; GT mutates its DOM after load).
 *
 * Note: this is the drop-in web widget (cosmetic GT banner may appear). A full i18n setup
 * (next-intl) remains a future option for higher-quality, SEO-friendly translations.
 */
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: { translate?: { TranslateElement: new (opts: unknown, el: string) => void } };
  }
}

export function TranslateWidget() {
  useEffect(() => {
    if (document.getElementById("google-translate-script")) return;

    window.googleTranslateElementInit = () => {
      if (window.google?.translate) {
        new window.google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "google_translate_element",
        );
      }
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div
      id="google_translate_element"
      suppressHydrationWarning
      className="fixed bottom-4 left-4 z-40 rounded-[9px] border border-line bg-surface/95 px-2 py-1 shadow-card backdrop-blur"
      aria-label="Translate this site"
    />
  );
}

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * OpenRubric design system.
 *
 * Themeable tokens read CSS variables defined in app/globals.css (light = :root,
 * dark = .dark), so light/dark switching recolors the whole app from one place.
 * Fixed tokens (panel.*, line.dark, ondark, signal.*) belong to the dark "product
 * screenshot" panels and stay constant in both themes.
 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---- themeable surfaces / text (CSS-var driven) ----
        background: v("--background"),
        foreground: v("--foreground"),
        canvas: v("--background"), // alias for page background
        surface: v("--surface"), // cards
        raised: v("--surface-raised"), // raised panels / inputs
        sunken: v("--sunken"), // tracks, active states, segmented control
        ink: v("--foreground"), // primary text + primary buttons
        dim: v("--muted"), // secondary text
        faint: v("--faint"), // tertiary / mono metadata

        line: {
          DEFAULT: v("--border"),
          soft: v("--border-soft"),
          softer: v("--border-softer"),
          dark: "#1D1D1D", // fixed — product panels
          darker: "#161616",
        },
        border: v("--border"),

        accent: {
          DEFAULT: v("--accent"),
          fg: "#FFFFFF",
          soft: "rgba(93,95,239,0.08)",
          line: "rgba(93,95,239,0.24)",
        },

        // ---- fixed: dark product "screenshot" panels ----
        panel: {
          DEFAULT: "#070707",
          900: "#0B0B0B",
          800: "#0D0D0D",
          700: "#0E0E0E",
        },
        ondark: "#A8A8A8",

        // ---- fixed: review signal scale (muted, never aggressive) ----
        signal: {
          clean: "#2E8A5E",
          "clean-dot": "#4FB286",
          review: "#A8791F",
          "review-dot": "#C99A3A",
          high: "#B4453C",
          "high-dot": "#C0584E",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        label: ["11px", { lineHeight: "1", letterSpacing: "0.14em" }],
      },
      maxWidth: {
        marketing: "1200px",
        app: "1180px",
        content: "1080px",
        wizard: "780px",
      },
      borderRadius: {
        panel: "22px",
        card: "14px",
        control: "10px",
      },
      boxShadow: {
        panel: "0 40px 120px -40px rgba(0,0,0,0.55)",
        card: "0 1px 2px rgba(0,0,0,0.03)",
        lift: "0 18px 50px -24px rgba(0,0,0,0.22)",
      },
      keyframes: {
        blink: {
          "0%,49%": { opacity: "1" },
          "50%,100%": { opacity: "0" },
        },
        "pulse-dot": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        floatup: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        indeterminate: {
          "0%": { left: "-40%", width: "40%" },
          "50%": { left: "30%", width: "55%" },
          "100%": { left: "100%", width: "40%" },
        },
      },
      animation: {
        blink: "blink 1.1s step-end infinite",
        "pulse-dot": "pulse-dot 0.8s ease-in-out infinite",
        floatup: "floatup 0.5s ease-out both",
        shimmer: "shimmer 2.2s linear infinite",
        indeterminate: "indeterminate 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

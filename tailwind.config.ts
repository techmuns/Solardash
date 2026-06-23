import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

/**
 * Solardash design tokens — a "solar research terminal": data-dense,
 * professional, legible. Light theme is primary with a `class`-strategy dark
 * mode. Surface/semantic colours flip via CSS variables (see globals.css);
 * brand + categorical energy colours are fixed hex so charts stay consistent
 * across themes.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Semantic surface tokens (driven by CSS variables, theme-aware).
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Deep-slate structural chrome for the nav / sidebar.
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          muted: "hsl(var(--sidebar-muted))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
        },

        // Brand accent — solar amber / gold. Fixed across themes.
        brand: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          dark: "#D97706",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        // Warm-orange "energy" highlight.
        highlight: {
          DEFAULT: "#F97316",
          light: "#FB923C",
          dark: "#EA580C",
        },

        // Financial deltas.
        positive: {
          DEFAULT: "#059669", // emerald-600
          light: "#10B981",
          subtle: "#ECFDF5",
        },
        negative: {
          DEFAULT: "#E11D48", // rose-600
          light: "#F43F5E",
          subtle: "#FFF1F2",
        },

        // Energy-source categorical map — must stay in lockstep with
        // ENERGY_COLORS in src/lib/colors.ts (every chart uses these).
        energy: {
          solar: "#F59E0B",
          wind: "#0EA5E9",
          hybrid: "#8B5CF6",
          fdre: "#14B8A6",
          rtc: "#6366F1",
          "solar-bess": "#10B981",
          bess: "#059669",
          thermal: "#475569",
          nuclear: "#A855F7",
          hydro: "#3B82F6",
          gas: "#FB923C",
          peak: "#EC4899",
        },
      },

      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },

      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover":
          "0 4px 12px -2px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.06)",
        panel: "0 1px 0 0 rgb(15 23 42 / 0.04)",
        focus: "0 0 0 3px rgb(245 158 11 / 0.35)",
      },

      spacing: {
        sidebar: "16rem",
        "sidebar-collapsed": "4.25rem",
        topbar: "3.5rem",
      },

      fontSize: {
        // Compact, tabular-friendly steps for dense tables / metrics.
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        stat: ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
      },

      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

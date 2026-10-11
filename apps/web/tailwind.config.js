/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--navbar-bg)",
        navbar: "var(--navbar-bg)",
        surface: "var(--navbar-bg)",
        "surface-2": "var(--search-bg)",
        search: "var(--search-bg)",
        border: "var(--border-gold)",
        "border-soft": "var(--divider)",
        divider: "var(--divider)",
        gold: "var(--primary-gold)",
        "gold-soft": "#F6C56A",
        teal: "var(--status-success)",
        red: "var(--status-danger)",
        blue: "var(--status-info)",
        text: "var(--primary-text)",
        "text-dim": "var(--secondary-text)",
        "text-dimmer": "var(--secondary-text)",
        hover: "var(--hover-bg)",
      },
      fontFamily: {
        display: ["Rajdhani", "Noto Sans Bengali", "sans-serif"],
        body: ["Inter", "Noto Sans Bengali", "sans-serif"],
        promo: ["Barlow Condensed", "Noto Sans Bengali", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 0 1px color-mix(in srgb, var(--primary-gold) 28%, transparent), 0 12px 40px rgba(0,0,0,0.55)",
        "gold-sm": "0 0 0 1px color-mix(in srgb, var(--primary-gold) 22%, transparent), 0 8px 24px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};

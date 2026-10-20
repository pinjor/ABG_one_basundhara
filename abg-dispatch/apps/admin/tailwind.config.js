/** Tokens mirror packages/shared/src/tokens.ts — midnight navy and platinum from the ABG mark. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#071225",
        navy: { DEFAULT: "#0C1727", deep: "#142238", 700: "#1E2E48", 500: "#33466A" },
        platinum: { DEFAULT: "#CAD0D8", bright: "#EEF1F5", deep: "#9AA4B2" },
        silver: "#E7EBF0",
        surface: "#F7F9FC",
        ink: { DEFAULT: "#0C1727", muted: "#5B6678", subtle: "#8A94A6" },
        line: { DEFAULT: "#E3E8EF", strong: "#CBD3DE" },
        active: { DEFAULT: "#2F6FED", soft: "#E8F0FE" },
        pending: { DEFAULT: "#B7791F", soft: "#FDF3E1" },
        success: { DEFAULT: "#1F8A5B", soft: "#E3F4EC" },
        danger: { DEFAULT: "#C93C3C", soft: "#FBE9E9" },
        neutral: { DEFAULT: "#6B7588", soft: "#EEF1F5" },
        series: { 1: "#2a78d6", 2: "#eb6834" },
      },
      fontFamily: {
        display: ["Manrope", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(12,23,39,0.04), 0 6px 18px rgba(12,23,39,0.05)",
        raised: "0 12px 32px rgba(12,23,39,0.16)",
      },
      backgroundImage: {
        hero: "linear-gradient(135deg, #071225 0%, #0B1A31 55%, #142238 100%)",
        platinum: "linear-gradient(135deg, #F4F6F9 0%, #CAD0D8 38%, #E9EDF2 62%, #AEB6C2 100%)",
      },
    },
  },
  plugins: [],
};

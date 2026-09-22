/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0E17",
        surface: "#111827",
        "surface-2": "#17202F",
        border: "#232D40",
        "border-soft": "#1B2434",
        gold: "#C9A24B",
        "gold-soft": "#E4C878",
        teal: "#35B99C",
        red: "#E1685E",
        blue: "#5B9FE1",
        text: "#F2EFE8",
        "text-dim": "#99A2B5",
        "text-dimmer": "#5C6579",
      },
      fontFamily: {
        display: ["'Big Shoulders Display'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

import type { SVGProps } from "react";

const PATHS = {
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  search: "M11 11m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0M16 16l4 4",
  chevron: "M8 10l4 4 4-4",
  ticket: "M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1z",
  users: "M9 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM17 12a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 17 12zM4 19c.5-2.5 2.4-4 5-4s4.5 1.5 5 4M14 15.2c1.6.2 3 .9 3.6 2.8",
  gate: "M5 20V6h4v14M15 20V6h4v14M9 10h6M9 14h6",
  card: "M3 7h18v10H3zM3 11h18",
  chart: "M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6",
  bell: "M6 16V10a6 6 0 1 1 12 0v6l1.5 2h-15zM10 18a2 2 0 0 0 4 0",
  sun: "M12 16a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M16 13.5A6.5 6.5 0 0 1 9.2 5 6.5 6.5 0 1 0 16 13.5z",
  globe: "M12 20a8 8 0 1 0-8-8 8 8 0 0 0 8 8zM3 12h18M12 4c2 2.2 3 4.8 3 8s-1 5.8-3 8c-2-2.2-3-4.8-3-8s1-5.8 3-8z",
  check: "M5 12.5 9.2 17 19 7",
  alert: "M12 8v5M12 16.5h.01M12 4 3 19h18z",
  stadium: "M4 18c2-6 14-6 16 0M7 18v-2a5 5 0 0 1 10 0v2M9 9h6M8 6h8",
  download: "M12 4v10M8 10l4 4 4-4M5 19h14",
  user: "M12 12a3.2 3.2 0 1 0-3.2-3.2A3.2 3.2 0 0 0 12 12zM5.5 19.2c.8-3 3-4.6 6.5-4.6s5.7 1.6 6.5 4.6",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d={PATHS[name]} />
    </svg>
  );
}

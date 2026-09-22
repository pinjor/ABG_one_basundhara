/**
 * Design tokens — Bashundhara Sports City Digital Management Platform.
 * Section 2.1 of the master build prompt. Use exactly; do not substitute.
 */
export const colors = {
  bg: "#0A0E17",
  surface: "#111827",
  surface2: "#17202F",
  border: "#232D40",
  borderSoft: "#1B2434",
  gold: "#C9A24B",
  goldSoft: "#E4C878",
  teal: "#35B99C",
  red: "#E1685E",
  blue: "#5B9FE1",
  text: "#F2EFE8",
  textDim: "#99A2B5",
  textDimmer: "#5C6579",
} as const;

export const fonts = {
  display: "'Big Shoulders Display', sans-serif",
  body: "'Inter', sans-serif",
} as const;

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export const statusToneColor: Record<StatusTone, string> = {
  success: colors.teal,
  warning: colors.gold,
  danger: colors.red,
  info: colors.blue,
  neutral: colors.textDim,
};

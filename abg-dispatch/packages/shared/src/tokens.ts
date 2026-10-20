/**
 * ABG Dispatch design tokens. Derived from the Anvir Bashundhara Group mark:
 * metallic platinum lettering on midnight navy. `midnight` is sampled from the
 * logo's own background so the mark sits on it with no visible edge.
 *
 * Mirrored in apps/admin/tailwind.config.js and apps/mobile/lib/theme/tokens.dart.
 */
export const colors = {
  midnight: "#071225",
  navy: "#0C1727",
  deepNavy: "#142238",
  navy700: "#1E2E48",
  navy500: "#33466A",
  platinum: "#CAD0D8",
  platinumBright: "#EEF1F5",
  platinumDeep: "#9AA4B2",
  softSilver: "#E7EBF0",
  surface: "#F7F9FC",
  white: "#FFFFFF",
  ink: "#0C1727",
  inkMuted: "#5B6678",
  inkSubtle: "#8A94A6",
  border: "#E3E8EF",
  borderStrong: "#CBD3DE",
  active: "#2F6FED",
  activeSoft: "#E8F0FE",
  pending: "#B7791F",
  pendingSoft: "#FDF3E1",
  success: "#1F8A5B",
  successSoft: "#E3F4EC",
  danger: "#C93C3C",
  dangerSoft: "#FBE9E9",
  neutral: "#6B7588",
  neutralSoft: "#EEF1F5",
} as const;

/** Platinum sheen used sparingly: primary CTA on dark, the logo plate, focus rings. */
export const platinumGradient = ["#F4F6F9", "#CAD0D8", "#E9EDF2", "#AEB6C2"] as const;

export const fonts = {
  display: "'Manrope', 'Noto Sans Bengali', system-ui, sans-serif",
  body: "'Inter', 'Noto Sans Bengali', system-ui, sans-serif",
} as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

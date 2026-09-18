// Maps a variant's colour name (free text, but in practice always chosen from
// COMMON_COLORS in the admin product form) to a swatch hex so shoppers can pick by sight
// instead of reading a label. Unrecognised names fall back to a text pill in the UI.
const COLOR_SWATCHES: Record<string, string> = {
  black: "#0a0a0a",
  white: "#ffffff",
  beige: "#e8dcc8",
  brown: "#6b4423",
  navy: "#1b2a4a",
  maroon: "#6b1e23",
  grey: "#8a8a8a",
  gray: "#8a8a8a",
  charcoal: "#36454f",
  red: "#d92d20",
  blue: "#2563eb",
  green: "#16a34a",
  olive: "#5f6b3a",
  yellow: "#eab308",
  mustard: "#c9a227",
  orange: "#ea580c",
  purple: "#7c3aed",
  lavender: "#b9a6e0",
  pink: "#f472b6",
  cream: "#f5eedd",
  "off white": "#f2ede3",
  khaki: "#bfb38f",
  tan: "#d2b48c",
  wine: "#5e1f30",
  teal: "#0d9488",
};

export function getColorSwatch(name: string): string | null {
  return COLOR_SWATCHES[name.trim().toLowerCase()] ?? null;
}

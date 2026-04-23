// Palette di colori vivaci per eventi
const EVENT_COLORS = [
  "#1976d2", // blue
  "#388e3c", // green
  "#d32f2f", // red
  "#7b1fa2", // purple
  "#f57c00", // orange
  "#0097a7", // cyan
  "#c2185b", // pink
  "#512da8", // deep purple
  "#00796b", // teal
  "#fbc02d", // yellow
  "#5d4037", // brown
  "#455a64", // blue grey
];

export function getRandomColor() {
  return EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)];
}
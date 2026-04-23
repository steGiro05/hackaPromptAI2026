// Converti data locale in UTC ISO string
export function toUTC(date) {
  if (!date) return null;
  return new Date(date).toISOString();
}

// Converti UTC ISO string in Date locale
export function fromUTC(isoString) {
  if (!isoString) return null;
  return new Date(isoString);
}

// Calcola differenza in minuti tra due date
export function diffInMinutes(start, end) {
  return (new Date(end) - new Date(start)) / (1000 * 60);
}

// Calcola differenza in giorni tra due date
export function diffInDays(start, end) {
  return (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
}

// Controlla se la data è nel passato
export function isInPast(date) {
  return new Date(date) < new Date();
}
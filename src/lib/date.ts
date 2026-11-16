/** Data local no formato YYYY-MM-DD (usa o fuso do dispositivo). */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const longFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Ex.: "Segunda-feira, 16 de novembro de 2026" */
export function formatLongDate(key: string): string {
  const text = longFormatter.format(keyToDate(key));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Ex.: "16/11/2026" */
export function formatShortDate(key: string): string {
  return shortFormatter.format(keyToDate(key));
}

/** Ex.: "14:35" */
export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : timeFormatter.format(date);
}

// Header / trend date formatting (brief §3.8 `calendar`; research 06 §5.1 item 13): Gregorian in the skin's
// format, or Solar Hijri (Jalali) as YYYY/MM/DD with Latin digits through Intl's persian calendar.
import type { Skin } from './types.ts';

export function formatDate(d: Date, calendar: 'gregorian' | 'solar', gregorianFormat: Skin['calendar']['gregorianFormat'] = 'DD/MM/YYYY'): string {
  if (calendar === 'solar') {
    const parts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('year')}/${get('month')}/${get('day')}`;
  }
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getUTCFullYear());
  return gregorianFormat === 'MM/DD/YYYY' ? `${mm}/${dd}/${yyyy}` : gregorianFormat === 'YYYY-MM-DD' ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`;
}

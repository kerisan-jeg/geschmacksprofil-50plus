// Handynummern: Formatierung während der Eingabe, Prüfung und Maskierung. Reine Funktionen.
//
// Unterstützte Ländervorwahlen (Standard +41). Für die Schweiz gilt eine genaue Prüfung
// (Handynummern beginnen mit 07…), für die übrigen Länder nur eine Längenprüfung, weil sich
// die Nummernpläne unterscheiden. Sichtbare Ländernamen stehen in labels.js (REGISTER.countries).

export const COUNTRIES = [
  // national: Ziffern ohne führende 0; groups: Gruppierung der nationalen Nummer mit führender 0
  { id: 'CH', dial: '+41', national: { min: 9, max: 9 }, groups: [3, 3, 2, 2], mobilePrefix: /^7[4-9]/ },
  { id: 'DE', dial: '+49', national: { min: 10, max: 11 }, groups: [4, 3, 4], mobilePrefix: /^1[5-7]/ },
  { id: 'AT', dial: '+43', national: { min: 10, max: 13 }, groups: [4, 3, 4, 2], mobilePrefix: /^6/ },
  { id: 'LI', dial: '+423', national: { min: 7, max: 7 }, groups: [3, 2, 2], mobilePrefix: /^7/ },
  { id: 'FR', dial: '+33', national: { min: 9, max: 9 }, groups: [2, 2, 2, 2, 2], mobilePrefix: /^[67]/ },
  { id: 'IT', dial: '+39', national: { min: 9, max: 10 }, groups: [3, 3, 4], mobilePrefix: /^3/ },
];

export const DEFAULT_COUNTRY = 'CH';

export function countryById(id) {
  return COUNTRIES.find((country) => country.id === id) ?? COUNTRIES[0];
}

// Nur Ziffern der nationalen Nummer, ohne Ländervorwahl und ohne führende 0.
// Eingefügte Nummern wie „+41 79 123 45 67“ oder „0041791234567“ werden erkannt.
export function nationalDigits(raw, country) {
  let digits = String(raw ?? '').replace(/[^\d+]/g, '');
  const dialDigits = country.dial.slice(1);
  if (digits.startsWith('+')) digits = digits.slice(1).startsWith(dialDigits) ? digits.slice(1 + dialDigits.length) : digits.slice(1);
  else if (digits.startsWith(`00${dialDigits}`)) digits = digits.slice(2 + dialDigits.length);
  digits = digits.replace(/\D/g, '');
  return digits.replace(/^0+/, '');
}

// Formatierung während der Eingabe, mit führender 0 wie gewohnt: „079 123 45 67“.
export function formatPhoneInput(raw, country) {
  const digits = nationalDigits(raw, country).slice(0, country.national.max);
  if (!digits) return '';
  const withZero = `0${digits}`;
  const parts = [];
  let index = 0;
  for (const size of country.groups) {
    if (index >= withZero.length) break;
    parts.push(withZero.slice(index, index + size));
    index += size;
  }
  if (index < withZero.length) parts.push(withZero.slice(index));
  return parts.join(' ');
}

// Prüfung mit verständlichem Fehlergrund:
//   empty | too_short | too_long | not_mobile
export function validatePhone(raw, country) {
  const digits = nationalDigits(raw, country);
  if (!digits) return { ok: false, error: 'empty' };
  if (digits.length < country.national.min) return { ok: false, error: 'too_short' };
  if (digits.length > country.national.max) return { ok: false, error: 'too_long' };
  if (country.mobilePrefix && !country.mobilePrefix.test(digits)) return { ok: false, error: 'not_mobile' };
  return { ok: true, e164: `${country.dial}${digits}` };
}

// Nach der Bestätigung wird die Nummer nur noch gekürzt gespeichert: „+41 79 *** ** 67“.
export function maskPhone(e164) {
  const country = COUNTRIES.find((entry) => e164?.startsWith(entry.dial));
  if (!country) return '';
  const digits = e164.slice(country.dial.length);
  const head = digits.slice(0, 2);
  const tail = digits.slice(-2);
  const hidden = digits.slice(2, -2).replace(/\d/g, '*');
  const groups = hidden.length > 3 ? `${hidden.slice(0, 3)} ${hidden.slice(3)}` : hidden;
  return `${country.dial} ${head} ${groups} ${tail}`.replace(/\s+/g, ' ').trim();
}

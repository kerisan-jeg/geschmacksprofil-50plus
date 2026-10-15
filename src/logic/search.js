// Tolerante Suche für die Autovervollständigung (A7):
// unabhängig von Gross-/Kleinschreibung, „ä“ = „ae“ = „a“, Akzente werden ignoriert.

const UMLAUTS = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

function stripAccents(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Zwei Schreibweisen je Text: mit „ae“ und mit „a“. So passt „kase“, „kaese“ und „Käse“.
export function normalizeVariants(text) {
  const lower = String(text ?? '').replace(/­/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  const expanded = stripAccents(lower.replace(/[äöüß]/g, (char) => UMLAUTS[char]));
  const folded = stripAccents(lower).replace(/ß/g, 'ss');
  // Eingaben wie „kaese“ sollen auch „käse“ treffen: „ae/oe/ue“ zusätzlich zu „a/o/u“ falten.
  const refolded = expanded.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
  return [...new Set([expanded, folded, refolded])];
}

// Mehrzahl: „Oliven“ findet „Olive“, „Tomaten“ „Tomate“, „Nüsse“ „Nuss“, „Eier“ „Ei“.
// Nur ganze Wörter zählen, damit „Eier“ nicht „Eigelb“ findet.
const PLURAL_ENDINGS = ['en', 'er', 'n', 'e', 's'];

function singulars(query) {
  if (query.length < 4) return [];
  return PLURAL_ENDINGS.filter((ending) => query.endsWith(ending) && query.length - ending.length >= 2).map((ending) => query.slice(0, -ending.length));
}

// Rang: 0 = beginnt mit der Eingabe, 1 = ein Wort beginnt damit, 2 = enthält sie, null = kein Treffer.
export function matchRank(term, query) {
  const queries = normalizeVariants(query).filter(Boolean);
  if (queries.length === 0) return null;
  let best = null;
  for (const candidate of normalizeVariants(term)) {
    const words = candidate.split(/[\s\-–(),/]+/);
    for (const q of queries) {
      let rank = null;
      if (candidate.startsWith(q)) rank = 0;
      else if (words.some((word) => word.startsWith(q))) rank = 1;
      else if (q.length >= 3 && candidate.includes(q)) rank = 2;
      else if (singulars(q).some((stem) => words.includes(stem))) rank = 1;
      else if (singulars(q).some((stem) => stem.length >= 4 && words.some((word) => word.endsWith(stem)))) rank = 2;
      if (rank !== null && (best === null || rank < best)) best = rank;
    }
  }
  return best;
}

// Tippfehler: Abstand nach Damerau-Levenshtein (vertauschte Buchstaben zählen einfach).
export function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

// Wie nah ist die Eingabe an einem Begriff (ganz oder als Anfang)? Erlaubt 1 Fehler, ab 7 Zeichen 2.
export function typoDistance(term, query) {
  const [q] = normalizeVariants(query);
  if (!q || q.length < 4) return null;
  const allowed = q.length >= 7 ? 2 : 1;
  let best = null;
  for (const candidate of normalizeVariants(term)) {
    for (const word of [candidate, ...candidate.split(/[\s\-–(),/]+/)]) {
      if (word.length < 3) continue;
      const distance = Math.min(editDistance(q, word), editDistance(q, word.slice(0, q.length)));
      if (distance <= allowed && (best === null || distance < best)) best = distance;
    }
  }
  return best;
}

// items: [{ key, label, terms: [string] }]. Liefert die besten Treffer mit `matchedTerm`,
// damit die Oberfläche zeigen kann, warum etwas gefunden wurde (z. B. „Schwein“ über „Speck“).
export function search(items, query, limit = 6) {
  if (!String(query ?? '').trim()) return [];
  const hits = [];
  for (const item of items) {
    let best = null;
    for (const term of [item.label, ...(item.terms ?? [])]) {
      const rank = matchRank(term, query);
      if (rank !== null && (best === null || rank < best.rank)) best = { rank, term };
    }
    if (best) hits.push({ ...item, rank: best.rank, matchedTerm: best.term === item.label ? null : best.term });
  }
  return hits.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, 'de')).slice(0, limit);
}

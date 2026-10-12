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

// Rang: 0 = beginnt mit der Eingabe, 1 = ein Wort beginnt damit, 2 = enthält sie, null = kein Treffer.
export function matchRank(term, query) {
  const queries = normalizeVariants(query).filter(Boolean);
  if (queries.length === 0) return null;
  let best = null;
  for (const candidate of normalizeVariants(term)) {
    for (const q of queries) {
      let rank = null;
      if (candidate.startsWith(q)) rank = 0;
      else if (candidate.split(/[\s\-–(),/]+/).some((word) => word.startsWith(q))) rank = 1;
      else if (q.length >= 3 && candidate.includes(q)) rank = 2;
      if (rank !== null && (best === null || rank < best)) best = rank;
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

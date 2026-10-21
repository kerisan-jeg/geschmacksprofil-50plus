// Hilfsfunktionen für den Kartenkatalog (Baum über parentId / children).
// Alle Funktionen sind rein.

// Untergruppen übernehmen Kartenfarbe (tint) und Illustration ihrer Gruppe, wenn sie keine eigenen haben:
// für den Platzhalter, solange ein Foto lädt oder fehlt, und für den Bildstil 'illustration'.
const INHERITED = ['tint', 'illustration'];

export function indexCatalog(rawCards) {
  const raw = new Map(rawCards.map((card) => [card.id, card]));
  const inherit = (card, field) => {
    let current = card;
    while (current && current[field] == null) current = raw.get(current.parentId);
    return current?.[field];
  };
  const cards = rawCards.map((card) =>
    !card.parentId || INHERITED.every((field) => card[field] != null)
      ? card
      : { ...card, ...Object.fromEntries(INHERITED.map((field) => [field, card[field] ?? inherit(card, field)])) }
  );
  const byId = new Map(cards.map((card) => [card.id, card]));
  return {
    cards,
    byId,
    get: (id) => byId.get(id) ?? null,
    childrenOf: (id) => (byId.get(id)?.children ?? []).map((childId) => byId.get(childId)).filter(Boolean),
  };
}

// Alle Nachkommen (ohne die Karte selbst), Tiefensuche in Katalogreihenfolge.
export function descendantIds(index, id) {
  const out = [];
  for (const child of index.childrenOf(id)) {
    out.push(child.id, ...descendantIds(index, child.id));
  }
  return out;
}

export function ancestorIds(index, id) {
  const out = [];
  let current = index.get(id);
  while (current?.parentId) {
    out.push(current.parentId);
    current = index.get(current.parentId);
  }
  return out;
}

export function isFamily(card) {
  return (card.children?.length ?? 0) > 0;
}

// Entitätstypen nach nurec v0.2, Kap. 8
export const KINDS = ['FAMILY', 'SUBGROUP', 'SIMPLE_FOOD', 'COMPOSITE_FOOD', 'DISH'];
export const STAGE3_BLOCK_LIMIT = 30; // Anhang A3: höchstens 30 Kandidatenkarten je Teilblock

// Gerichte (Stufe 4): eigene Einheiten ohne Elternkarte; ihre Antworten gehen nie auf Zutaten über.
export function isDish(card) {
  return card?.kind === 'DISH';
}

// Konkrete Karte: ein bestimmtes Lebensmittel oder Produkt, das man direkt bewerten kann (Endkarte ohne Kinder,
// z. B. „Naturtofu“, „Eier“, „Quinoa“). Nur solche Karten werden zu bestätigten Favoriten (Anhang B3.1).
export function isConcrete(card) {
  return Boolean(card) && !isFamily(card) && !isDish(card);
}

// Quellen eines Kartenbildes (Addendum A15): KI (Google Gemini), Bildagentur (Unsplash) oder eigene Grafik.
export const IMAGE_SOURCES = ['ai-gemini', 'stock', 'own'];

// Prüft die Konsistenz des Katalogs. Liefert eine Liste von Fehlern (leer = in Ordnung).
export function validateCatalog(cards) {
  const errors = [];
  const index = indexCatalog(cards);
  const seen = new Set();
  for (const card of cards) {
    if (seen.has(card.id)) errors.push(`${card.id}: doppelte ID`);
    seen.add(card.id);
    for (const field of ['allergens', 'animalOrigin', 'children', 'examples']) {
      if (!Array.isArray(card[field])) errors.push(`${card.id}: ${field} fehlt oder ist keine Liste`);
    }
    if (!KINDS.includes(card.kind)) errors.push(`${card.id}: kind fehlt oder unbekannt`);
    if ((card.stage === 1 || card.stage === 4) && card.parentId !== null) errors.push(`${card.id}: Stufe ${card.stage} ohne parentId erwartet`);
    if (card.stage === 4 && (card.kind !== 'DISH' || card.children.length > 0)) errors.push(`${card.id}: Stufe 4 ist ein Gericht ohne Kinder`);
    if (card.kind === 'DISH' && card.stage !== 4) errors.push(`${card.id}: Gerichte stehen auf Stufe 4`);
    if (card.stage === 3 && !/^3\.[1-7]$/.test(card.block ?? '')) errors.push(`${card.id}: Stufe 3 braucht einen Block 3.1 bis 3.7`);
    for (const id of card.ingredients ?? []) {
      if (!index.get(id)) errors.push(`${card.id}: Zutat ${id} unbekannt`);
    }
    if (card.titleParts) {
      const children = card.titleParts.flatMap((part) => part.children ?? []);
      if (card.titleParts.some((part) => !part.title?.trim() || !part.children?.length) ||
          children.length !== card.children.length || new Set(children).size !== children.length ||
          children.some((id) => !card.children.includes(id))) {
        errors.push(`${card.id}: titleParts müssen alle direkten Kinder genau einmal mit Titel zuordnen`);
      }
    }
    if (card.exceptionCandidate && index.get(card.exceptionCandidate)?.parentId !== card.id) errors.push(`${card.id}: Ausnahme ist kein Kind`);
    for (const id of card.contrastPair ?? []) {
      if (index.get(id)?.parentId !== card.id) errors.push(`${card.id}: Kontrast ${id} ist kein Kind`);
    }
    if (card.variantOf && !index.get(card.variantOf)) errors.push(`${card.id}: variantOf ${card.variantOf} unbekannt`);
    // Bilder (Addendum A15): eigene Datei je Karte, deutscher alt-Text, bekannte Quelle; Gruppen zeigen das neutrale Symbol
    if (card.image) {
      if (card.stage === 1) errors.push(`${card.id}: Gruppen zeigen das neutrale Symbol, kein Bild`);
      if (card.image.src !== `cards/${card.id}.webp`) errors.push(`${card.id}: Bild muss cards/${card.id}.webp sein`);
      if (!card.image.alt?.trim()) errors.push(`${card.id}: Bild ohne alt-Text`);
      if (!IMAGE_SOURCES.includes(card.image.source)) errors.push(`${card.id}: Bildquelle ${card.image.source} unbekannt`);
      for (const id of card.image.shows ?? []) if (!index.get(id)) errors.push(`${card.id}: Bild zeigt unbekannte Karte ${id}`);
    }
    if (card.stage > 1 && card.stage < 4) {
      const parent = index.get(card.parentId);
      if (!parent) errors.push(`${card.id}: parentId ${card.parentId} unbekannt`);
      else {
        if (parent.stage !== card.stage - 1) errors.push(`${card.id}: Stufe passt nicht zum Elternteil`);
        if (!parent.children.includes(card.id)) errors.push(`${card.id}: fehlt in children von ${parent.id}`);
      }
    }
    for (const childId of card.children ?? []) {
      if (index.get(childId)?.parentId !== card.id) errors.push(`${card.id}: Kind ${childId} zeigt nicht zurück`);
    }
    if (isFamily(card) && (card.allergens.length > 0 || card.animalOrigin.length > 0)) {
      errors.push(`${card.id}: Karten mit Kindern tragen keine eigenen Tags (Sichtbarkeit kommt aus den Kindern)`);
    }
  }
  const blocks = {};
  for (const card of cards) if (card.stage === 3) blocks[card.block] = (blocks[card.block] ?? 0) + 1;
  for (const [block, count] of Object.entries(blocks)) {
    if (count > STAGE3_BLOCK_LIMIT) errors.push(`Block ${block}: ${count} Karten, höchstens ${STAGE3_BLOCK_LIMIT}`);
  }
  return errors;
}

// Karten mit unklarer Zuordnung (TODO), für „Noch offen“.
export function catalogTodos(cards) {
  return cards.filter((card) => card.todo).map((card) => ({ id: card.id, title: card.title, todo: card.todo }));
}

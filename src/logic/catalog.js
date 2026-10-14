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
    if (card.stage === 1 && card.parentId !== null) errors.push(`${card.id}: Stufe 1 ohne parentId erwartet`);
    if (card.stage > 1) {
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
  return errors;
}

// Karten mit unklarer Zuordnung (TODO), für „Noch offen“.
export function catalogTodos(cards) {
  return cards.filter((card) => card.todo).map((card) => ({ id: card.id, title: card.title, todo: card.todo }));
}

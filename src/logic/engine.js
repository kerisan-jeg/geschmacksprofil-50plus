// Engine des Prototyps. Die Oberfläche kennt nur die exportierten Funktionen.
//
// Event-Log als einzige Quelle der Wahrheit (A8): Der Zustand einer Runde wird immer aus der
// Liste der Ereignisse abgeleitet (replay). Rückgängig ist ein eigenes Ereignis (UNDO),
// nichts wird gelöscht. So laufen Oberfläche, Profil und Protokoll nie auseinander, und jedes
// Profil lässt sich aus dem exportierten Protokoll nachrechnen.
// Profiländerungen (RATING_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, DIET_CHANGED, siehe events.js)
// sind weitere Ereignisse im selben Log. Sie überschreiben nie die ursprüngliche Swipe-Antwort.
//
// Alle Funktionen sind rein (kein Zufall, keine Uhrzeit).

import { DISLIKE, INTOLERANT, LIKE, PREFER, RESPONSE_SEMANTICS, RESPONSES, UNDO, UNFAMILIAR, isTasteSignal } from './answers.js';
import { ANSWER, DIET_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, RATING_CHANGED, SOURCE_PROFILE, eventType, isProfileEvent } from './events.js';
import { annotateCard, buildExclusions, isVisible } from './filter.js';
import { sectionOf } from './profile.js';
import { SOURCE_SWIPE } from './stage0.js';

export const RULE_VERSION = 'demo-0.2';

// Antwort-Ereignis (so wird es auch protokolliert, siehe logging/logger.js):
// { cardId, stage, parentId, round, positionInRound, response, timestamp, responseTimeMs,
//   inputMethod, selectionReason, excludedCardIds? }
// excludedCardIds nur bei INTOLERANT: welche Karten künftig ausgeschlossen sind
// (die Karte selbst oder eine Auswahl ihrer Nachkommen).
// round: Nummer der Runde (1, 2, …). Ereignisse ohne das Feld stammen aus Runde 1.

export function roundOfEvent(event) {
  return event?.round ?? 1;
}

function swipeEntries(event) {
  const ids = event.excludedCardIds?.length ? event.excludedCardIds : [event.cardId];
  return ids.map((id) => ({ type: 'card', value: id, source: SOURCE_SWIPE, origin: event.cardId }));
}

// Spielt die Antworten beim Wischen ab. UNDO nimmt die jeweils letzte noch gültige Antwort zurück.
// answeredAt: Position der gültigen Antwort im Log (für spätere Profiländerungen an dieser Karte).
export function replay(events) {
  const active = [];
  events.forEach((event, at) => {
    if (eventType(event) !== ANSWER) return;
    if (event.response === UNDO) {
      active.pop();
      return;
    }
    if (!RESPONSES.includes(event.response)) return;
    if (active.some((earlier) => earlier.event.cardId === event.cardId)) return;
    active.push({ event, at });
  });

  const answers = {};
  const answeredAt = {};
  const answeredInRound = {};
  const sequence = [];
  const swipeExclusions = [];
  for (const { event, at } of active) {
    answers[event.cardId] = event.response;
    answeredAt[event.cardId] = at;
    answeredInRound[event.cardId] = roundOfEvent(event);
    sequence.push(event.cardId);
    if (event.response === INTOLERANT) swipeExclusions.push(...swipeEntries(event));
  }
  return { answers, answeredAt, answeredInRound, sequence, swipeExclusions, lastEvent: active.at(-1)?.event ?? null };
}

function matchesRemoval(entry, removal, section) {
  return entry.type === removal.type && entry.value === removal.value && (!section || sectionOf(entry) === section);
}

// Ausschlüsse, Ernährungsweise und Bewertungen in zeitlicher Reihenfolge: Grundlage sind die Angaben
// aus dem Onboarding, dann folgen „Vertrage ich nicht“ beim Wischen und Änderungen im Profil.
// Ein entfernter Ausschluss fehlt danach einfach in den Einträgen; ob eine Karte wieder erlaubt ist,
// entscheidet wie immer isAllowed() (keine Sonderlogik).
function applyEvents(events, played, onboarding) {
  let entries = [...(onboarding?.exclusions ?? [])];
  let diet = onboarding?.diet ?? null;
  const ratingChanges = {};
  events.forEach((event, at) => {
    const type = eventType(event);
    if (type === ANSWER) {
      if (event.response === INTOLERANT && played.answeredAt[event.cardId] === at) entries.push(...swipeEntries(event));
      return;
    }
    if (!isProfileEvent(event)) return;
    if (type === EXCLUSION_ADDED) {
      for (const exclusion of event.exclusions ?? []) {
        const entry = { ...exclusion, source: SOURCE_PROFILE, section: event.section };
        if (!entries.some((existing) => matchesRemoval(existing, entry, event.section))) entries.push(entry);
      }
    } else if (type === EXCLUSION_REMOVED) {
      entries = entries.filter((entry) => !(event.exclusions ?? []).some((removal) => matchesRemoval(entry, removal, event.section)));
    } else if (type === DIET_CHANGED) {
      diet = event.diet ?? null;
    } else if (type === RATING_CHANGED) {
      ratingChanges[event.cardId] = { rating: event.rating ?? null, at };
    }
  });

  // Letzte direkte Antwort pro Karte: die Antwort beim Wischen oder eine spätere Änderung im Profil.
  // Wird die Antwort beim Wischen rückgängig gemacht, gelten auch frühere Änderungen nicht mehr.
  const ratings = {};
  for (const cardId of played.sequence) {
    const change = ratingChanges[cardId];
    ratings[cardId] = change && change.at > played.answeredAt[cardId] ? change.rating : played.answers[cardId];
  }
  return { entries, diet, ratings };
}

// Gesamter Zustand aus Katalog, Onboarding und Ereignissen.
// onboarding: Ergebnis von deriveOnboarding() (diet, exclusions, cardLabels, …).
// round: laufende Runde. roundSequence sind die Karten dieser Runde, lastEvent ist die letzte Antwort
// dieser Runde (Rückgängig wirkt nie in eine abgeschlossene Runde hinein).
export function deriveRoundState({ index, onboarding, diets, events = [], round = 1 }) {
  const played = replay(events);
  const { entries, diet, ratings } = applyEvents(events, played, onboarding);
  const exclusions = buildExclusions(entries, { diet, diets, index });
  const roundSequence = played.sequence.filter((id) => played.answeredInRound[id] === round);
  const lastEvent = roundOfEvent(played.lastEvent) === round ? played.lastEvent : null;
  return { index, onboarding, entries, exclusions, diet, ratings, cardLabels: onboarding?.cardLabels ?? {}, ...played, round, roundSequence, lastEvent };
}

function answeredCount(state) {
  return (state.roundSequence ?? state.sequence).filter((id) => RESPONSE_SEMANTICS[state.answers[id]]?.countsTowardLimit).length;
}

// Feste Reihenfolge über alle Runden: zuerst die Gruppen (Stufe 1) in Katalogreihenfolge, dann die
// Untergruppen (Stufe 2) abwechselnd aus allen Gruppen (von jeder Gruppe die erste, dann die zweite …),
// damit eine Runde nicht nur aus einer Gruppe besteht.
function fixedOrder(index) {
  const families = index.cards.filter((card) => card.stage === 1);
  const children = families.map((family) => index.childrenOf(family.id).filter((card) => card.stage === 2));
  const subgroups = [];
  const longest = Math.max(0, ...children.map((list) => list.length));
  for (let position = 0; position < longest; position += 1) {
    for (const list of children) if (list[position]) subgroups.push(list[position]);
  }
  return [...families, ...subgroups];
}

// Noch offene Karten über alle Runden: sichtbar nach den harten Ausschlüssen und noch nicht beantwortet.
function openCards(state) {
  return fixedOrder(state.index).filter((card) => !(card.id in state.answers) && isVisible(card, state.index, state.exclusions));
}

// Welche Karten als Nächstes gezeigt werden.
//
// TODO: Adaptive Logik folgt – Eigenleistung Team.
// Aktuell bewusst nur: feste Reihenfolge (fixedOrder) ohne Bezug auf die bisherigen Antworten,
// je Runde höchstens das Rundenlimit. Runde 1 zeigt die Gruppen, die folgenden Runden die übrigen
// Gruppen und danach die Untergruppen. Harte Ausschlüsse wirken immer (isVisible).
// Nicht umgesetzt (A2): Auswahl je nach Antwort (Stufe 1 → 2 → 3), Nachtesten von Ausnahmen nach
// DISLIKE, Unterkarte nach UNFAMILIAR, Favoritensuche nach PREFER.
export function selectNextCards(state, config) {
  const remaining = config.roundCardLimit - answeredCount(state);
  if (remaining <= 0) return [];
  return openCards(state).slice(0, remaining);
}

// Gibt es nach dieser Runde noch Karten für eine weitere Runde? nextRoundCards: die Karten der
// nächsten Runde (für den Ausblick im Abschluss).
export function hasMoreCards(state) {
  return openCards(state).length > 0;
}

export function nextRoundCards(state, config) {
  return openCards(state).slice(0, config.roundCardLimit);
}

export function selectionReason(state, card) {
  return card?.stage === 2 ? 'stage2_fixed_order' : 'stage1_fixed_order';
}

// Karte für die Anzeige: Familien zeigen nur erlaubte Beispiele und Hinweise wie „Ohne Haselnüsse“.
// group: bei Untergruppen der Name der Gruppe (z. B. „Fleisch und Geflügel“ über „Rind“).
export function presentCard(state, card) {
  const presented = annotateCard(card, state.index, state.exclusions, state.cardLabels);
  const parent = card.stage === 2 ? state.index.get(card.parentId) : null;
  return parent ? { ...presented, group: parent.title } : presented;
}

export function nextCard(state, config) {
  const card = selectNextCards(state, config)[0];
  return card ? presentCard(state, card) : null;
}

export function isRoundComplete(state, config) {
  return selectNextCards(state, config).length === 0;
}

// Fortschritt der Runde. total ist höchstens das Rundenlimit (ROUND_CARD_LIMIT, config.roundCardLimit)
// und kleiner, wenn nach den Ausschlüssen weniger Karten übrig sind. percent wird daraus abgeleitet.
export function progress(state, config) {
  const answered = answeredCount(state);
  const total = answered + selectNextCards(state, config).length;
  return { answered, total, percent: total === 0 ? 100 : Math.round((answered / total) * 100) };
}

// Stufe-1-Karten, die nach Stufe 0 überhaupt in Frage kommen (für die Vorschau vor dem Start).
export function eligibleFamilies(state) {
  return state.index.cards.filter((card) => card.stage === 1 && isVisible(card, state.index, state.exclusions));
}

// Geschmacksprofil für „Mein Profil“: gruppiert nur nach der letzten direkten Antwort pro Karte
// (beim Wischen oder später im Profil geändert). Reine Funktion.
// TODO: Score-Modell, Gewichtung und Ableitung nicht abgefragter Lebensmittel folgen – Eigenleistung Team
// Bewusst ohne Prozentwerte, ohne abgeleitete Einträge und ohne Gewichtung.
export function computeProfile(state) {
  const groups = { [PREFER]: [], [LIKE]: [], [DISLIKE]: [], [UNFAMILIAR]: [] };
  const intolerant = [];
  const removed = [];
  for (const id of state.sequence) {
    const rating = state.ratings ? state.ratings[id] : state.answers[id];
    if (rating === null) removed.push(id);
    else if (rating in groups) groups[rating].push(id);
    else if (rating === INTOLERANT) intolerant.push(id);
  }
  return { groups, intolerant, removed, answered: state.sequence.length };
}

// Profil, wie es am Ende angezeigt (und protokolliert) wird.
// Nur Geschmackssignale (DISLIKE, LIKE, PREFER) erscheinen als Geschmack.
// UNFAMILIAR und UNRATED sind keine Bewertung; INTOLERANT ist ein Ausschluss, kein Geschmack.
export function buildProfile(state) {
  const { groups, intolerant, removed } = computeProfile(state);
  const unrated = state.index.cards
    .filter((card) => card.stage === 1 && !(card.id in state.answers) && isVisible(card, state.index, state.exclusions))
    .map((card) => card.id);
  return {
    ruleVersion: RULE_VERSION,
    taste: { [PREFER]: groups[PREFER], [LIKE]: groups[LIKE], [DISLIKE]: groups[DISLIKE] },
    unfamiliar: groups[UNFAMILIAR],
    unrated,
    intolerant,
    removed,
    diet: state.diet ?? null,
    exclusions: state.entries.map(({ type, value, source, origin, label }) => ({ type, value, source, origin: origin ?? null, label: label ?? null })),
  };
}

// ---------- „Vertrage ich nicht“ auf einer Familienkarte (A4) ----------

function visibleLeaves(state, card) {
  const children = state.index.childrenOf(card.id).filter((child) => isVisible(child, state.index, state.exclusions));
  if (children.length === 0) return [card];
  return children.flatMap((child) => visibleLeaves(state, child));
}

// Optionen für die Detailauswahl: direkte Kinder ohne eigene Kinder in einem Abschnitt,
// Kinder mit eigenen Kindern (z. B. Baumnüsse) als eigener Abschnitt mit ihren Einträgen.
// Null, wenn die Karte keine sichtbaren Kinder hat: Dann gilt der Ausschluss direkt für die Karte.
export function intoleranceOptions(state, card) {
  const children = state.index.childrenOf(card.id).filter((child) => isVisible(child, state.index, state.exclusions));
  if (children.length === 0) return null;
  const direct = [];
  const sections = [];
  for (const child of children) {
    const leaves = visibleLeaves(state, child);
    if (leaves.length === 1 && leaves[0].id === child.id) direct.push(child);
    else sections.push({ id: child.id, label: child.title, options: leaves.map((leaf) => ({ id: leaf.id, label: leaf.title })) });
  }
  const directSection = direct.length > 0 ? [{ id: `${card.id}-direct`, options: direct.map((leaf) => ({ id: leaf.id, label: leaf.title })) }] : [];
  return { sections: [...directSection, ...sections] };
}

// Fasst die gewählten Einträge zusammen: alles gewählt → die Familie selbst,
// ein ganzer Abschnitt gewählt → die Untergruppe, sonst die einzelnen Einträge.
export function collapseIntolerance(state, card, selectedIds) {
  const options = intoleranceOptions(state, card);
  if (!options) return [card.id];
  const chosen = new Set(selectedIds);
  const all = options.sections.flatMap((section) => section.options.map((option) => option.id));
  if (all.length > 0 && all.every((id) => chosen.has(id))) return [card.id];
  const out = [];
  for (const section of options.sections) {
    const ids = section.options.map((option) => option.id);
    const isGroup = !section.id.endsWith('-direct');
    if (isGroup && ids.length > 1 && ids.every((id) => chosen.has(id))) out.push(section.id);
    else out.push(...ids.filter((id) => chosen.has(id)));
  }
  return out;
}

// Alle Antworten, die in einen Geschmacksscore eingehen dürfen (letzte direkte Antwort pro Karte).
// INTOLERANT ist nie dabei.
export function tasteSignals(state) {
  const current = (id) => (state.ratings ? state.ratings[id] : state.answers[id]);
  return state.sequence.filter((id) => isTasteSignal(current(id))).map((id) => ({ cardId: id, response: current(id) }));
}

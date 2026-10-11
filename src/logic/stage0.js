// Stufe 0: harte Ausschlüsse vor dem ersten Swipe (nurec v0.2, Kap. 2).
//
// Leitregel aus dem Konzept: Diese Regeln stehen über jedem Geschmacksscore.
// Eine Swipe-Antwort hebt sie nie auf, und ein DISLIKE ist kein Ausschluss.
//
// Alle Funktionen sind rein: Gleiche Antworten ergeben immer dieselben Regeln.
// So lässt sich der Kartenstapel jeder Testperson später nachvollziehen.

export function emptyAnswers(questions) {
  return Object.fromEntries(
    questions.map((question) => [question.id, question.type === 'single' ? null : { gate: null, selected: [] }])
  );
}

// Eine Frage gilt als beantwortet, wenn eine Antwort gewählt ist.
// Bei „Ja“ muss mindestens ein Punkt ausgewählt sein, sonst bleibt unklar, was gemeint ist.
export function isAnswered(question, answer) {
  if (question.type === 'single') return answer != null;
  if (!answer || answer.gate == null) return false;
  return answer.gate !== 'yes' || answer.selected.length > 0;
}

function childrenByParent(cards) {
  const map = new Map();
  for (const card of cards) {
    if (!card.parent) continue;
    if (!map.has(card.parent)) map.set(card.parent, []);
    map.get(card.parent).push(card);
  }
  return map;
}

// Leitet aus den Antworten die Regeln ab:
// - excludedIds: alle Karten, die nie gezeigt werden (Familien und Untergruppen)
// - badges: Hinweise auf erlaubten Karten, z. B. „Nur glutenfrei“
// - rules: verständliche Liste für die Zusammenfassung vor Stufe 1 (nurec v0.2, Kap. 2.2)
// - unsure: Fragen mit „Unsicher“; daraus folgt keine Freigabe
export function deriveRules(definition, answers, catalogCards) {
  const direct = new Set();
  const exclusionLabels = {};
  const badgeMap = new Map();
  const hiddenExamples = new Set();
  const rules = [];
  const unsure = [];

  function apply(question, option, text) {
    for (const id of option.excludes ?? []) {
      direct.add(id);
      // Für Hinweise wie „Ohne Schweinefleisch“: die Worte der Person, nicht der Katalogtitel.
      exclusionLabels[id] ??= option.label;
    }
    for (const word of option.hidesExamples ?? []) hiddenExamples.add(word.toLowerCase());

    const ruleId = `${question.id}.${option.id}`;
    if (option.constraint) {
      const constraint = definition.constraints[option.constraint];
      for (const cardId of constraint.targets) {
        if (!badgeMap.has(cardId)) badgeMap.set(cardId, new Set());
        badgeMap.get(cardId).add(constraint.badge);
      }
      rules.push({ id: ruleId, kind: 'constraint', text: constraint.summary, source: question.source });
      return;
    }
    // „watch“: gilt ebenfalls immer, hat aber im heutigen Katalog noch keine eigene Karte (z. B. Erdnüsse).
    const kind = option.excludes?.length ? 'exclude' : 'watch';
    rules.push({ id: ruleId, kind, text, source: question.source });
  }

  for (const question of definition.questions) {
    const answer = answers[question.id];
    if (question.type === 'single') {
      const option = question.options.find((candidate) => candidate.id === answer);
      if (option?.excludes?.length) apply(question, option, option.rule ?? option.label);
      continue;
    }
    if (answer?.gate === 'unsure') unsure.push(question.id);
    if (answer?.gate !== 'yes') continue;
    for (const option of question.options) {
      if (answer.selected.includes(option.id)) apply(question, option, option.label);
    }
  }

  const children = childrenByParent(catalogCards);
  const excluded = new Set(direct);
  // Eine ausgeschlossene Familie schliesst ihre Untergruppen mit ein.
  for (const id of direct) {
    for (const child of children.get(id) ?? []) excluded.add(child.id);
  }
  // Sind alle Untergruppen ausgeschlossen, entfällt auch die Familie (nurec v0.2, Kap. 2.2).
  for (const [parentId, kids] of children) {
    if (kids.length > 0 && kids.every((kid) => excluded.has(kid.id))) excluded.add(parentId);
  }

  const badges = {};
  for (const [cardId, set] of badgeMap) {
    if (!excluded.has(cardId)) badges[cardId] = [...set];
  }

  return {
    excludedIds: [...excluded].sort(),
    exclusionLabels,
    badges,
    hiddenExamples: [...hiddenExamples].sort(),
    rules,
    unsure,
  };
}

// Passt die Familienkarten an die Regeln an.
// Enthält eine Familie noch erlaubte Untergruppen, zeigt sie nur passende Beispiele
// (nurec v0.2, Kap. 2.2) und einen Hinweis wie „Ohne Schweinefleisch“.
export function annotateFamilies(catalogCards, rules) {
  const excluded = new Set(rules.excludedIds);
  const hidden = new Set(rules.hiddenExamples);
  const children = childrenByParent(catalogCards);

  return catalogCards.map((card) => {
    if (card.level !== 1 || excluded.has(card.id)) return card;

    const kids = children.get(card.id) ?? [];
    const removed = kids.filter((kid) => excluded.has(kid.id));
    const allowed = kids.filter((kid) => !excluded.has(kid.id));

    let examples = card.examples;
    if (removed.length > 0 && allowed.length > 0) {
      examples = allowed.length === 1 ? allowed[0].examples : allowed.map((kid) => kid.examples[0]);
    }
    examples = examples.filter((example) => !hidden.has(example.toLowerCase())).slice(0, 3);

    const removedLabels = removed.map((kid) => `Ohne ${rules.exclusionLabels?.[kid.id] ?? kid.title}`);
    const notes = [...new Set([...removedLabels, ...(rules.badges[card.id] ?? [])])];
    const unchanged = notes.length === 0 && examples.join('|') === card.examples.join('|');
    return unchanged ? card : { ...card, examples, notes };
  });
}

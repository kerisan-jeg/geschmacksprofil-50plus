import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buttonByText, click, render, setupDom, type } from '../test/dom.js';

const dom = setupDom();
after(() => dom.window.close());
// jsdom kennt kein Scrollen; der Fragebogen scrollt die Fehlermeldung ins Bild.
dom.window.Element.prototype.scrollIntoView ??= () => {};
const { createElement: h, useState } = await import('react');
const { default: SummaryScreen } = await import('./SummaryScreen.jsx');
const { default: QuestionnaireScreen } = await import('./QuestionnaireScreen.jsx');
const { COMMON, QUESTIONS, SUMMARY } = await import('../labels.js');
const { indexCatalog } = await import('../logic/catalog.js');
const { createRedundancyCheck, emptyAnswers } = await import('../logic/stage0.js');
const { mergeFoods } = await import('../logic/foodSearch.js');

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const definition = read('../data/stage0.json');
const allergens = read('../data/allergens.json');
const catalog = read('../data/catalog.json');
const index = indexCatalog(catalog.cards);
const foods = mergeFoods(catalog.foods, read('../data/foods.json').foods);

const STEPS = [
  { id: 'questions', state: 'current' },
  { id: 'round', state: 'open', answered: 0, total: 0 },
  { id: 'profile', state: 'open' },
];
const section = (id, changes = {}) => ({ id, items: [], notes: [], ...changes });

function summary(sections, extra = {}) {
  const calls = { edit: [], confirm: 0 };
  const element = h(SummaryScreen, {
    sections,
    noCards: false,
    firstName: 'Anna',
    steps: STEPS,
    onConfirm: () => (calls.confirm += 1),
    onEdit: (id) => calls.edit.push(id),
    onOpenProfile() {},
    ...extra,
  });
  return { element, calls };
}

test('Zusammenfassung: jede Regel sichtbar, „Ändern“ je Frage, „Stimmt so“ bestätigt', async () => {
  const { element, calls } = summary([
    section('diet', { items: [{ key: 'diet:vegan', label: 'Vegan: nichts vom Tier' }], dietaryRules: ['Halal'] }),
    section('intolerances', { items: [{ key: 'allergen:hazelnut', label: 'Haselnüsse' }], notes: ['Koriander'] }),
    section('never', { notes: ['Rosenkohl'] }),
  ]);
  const { container, unmount } = await render(element);
  const text = container.textContent;
  assert.ok(text.includes(SUMMARY.lead));
  for (const expected of ['Vegan: nichts vom Tier', 'Haselnüsse', 'Koriander', 'Rosenkohl', 'Halal']) assert.ok(text.includes(expected), expected);
  assert.ok(!/Marken|Herkunft|nicht sicher/.test(text), 'keine Marken, Herkunft oder Unsicherheit mehr (28.10.2026)');
  const editButtons = [...container.querySelectorAll('button')].filter((button) => button.textContent.trim() === SUMMARY.edit);
  assert.equal(editButtons.length, 3);
  for (const button of editButtons) await click(button);
  assert.deepEqual(calls.edit, ['diet', 'intolerances', 'never']);
  await click(buttonByText(container, SUMMARY.confirm));
  assert.equal(calls.confirm, 1);
  await unmount();
});

test('Zusammenfassung ohne Angaben: verständlich leer; Hinweis, wenn keine Karte übrig bleibt', async () => {
  const { element } = summary([section('diet'), section('intolerances'), section('never')], { noCards: true });
  const { container, unmount } = await render(element);
  const text = container.textContent;
  assert.ok(text.includes(SUMMARY.leadNone));
  for (const none of Object.values(SUMMARY.none)) assert.ok(text.includes(none), none);
  assert.ok(text.includes(SUMMARY.noCards));
  assert.ok(!text.includes(SUMMARY.open));
  await unmount();
});

test('„Ändern“ zeigt nur diese Frage; zurück zur Übersicht erst mit gültiger Antwort', async () => {
  const blank = emptyAnswers(definition.questions);
  const answers = { ...blank, diet: 'none', intolerances: { ...blank.intolerances, gate: 'yes' } };
  const calls = [];
  const props = (current) => ({
    questions: definition.questions,
    step: 1,
    answers: current,
    firstName: 'Anna',
    allergens,
    catalogIndex: index,
    foods: [],
    redundancy: createRedundancyCheck(definition, current, { allergens, catalogIndex: index, upTo: 1 }),
    onChange() {},
    onStep: (to) => calls.push(to),
    onOpenProfile() {},
    editing: true,
  });
  const { container, rerender, unmount } = await render(h(QuestionnaireScreen, props(answers)));
  assert.ok(container.textContent.includes(QUESTIONS.editKicker));
  // „Ja“ ohne Auswahl ist keine Antwort: weder der Hauptknopf noch „Zurück“ verlassen die Frage
  await click(buttonByText(container, QUESTIONS.backToSummary));
  await click(buttonByText(container, COMMON.back));
  assert.deepEqual(calls, []);
  assert.ok(container.querySelector('[role="alert"]'));
  // Mit Auswahl führen beide zurück zur Übersicht (Schritt nach der letzten Frage)
  await rerender(h(QuestionnaireScreen, props({ ...answers, intolerances: { ...answers.intolerances, selected: ['hazelnut'] } })));
  await click(buttonByText(container, QUESTIONS.backToSummary));
  await click(buttonByText(container, COMMON.back));
  assert.deepEqual(calls, [definition.questions.length, definition.questions.length]);
  await unmount();
});

test('„Ja“ in Frage 2 und 3 öffnet Auswahl und vollständige Suche; Zurück erhält die Angaben', async () => {
  function Questionnaire() {
    const [answers, setAnswers] = useState(() => ({ ...emptyAnswers(definition.questions), diet: 'none' }));
    const [step, setStep] = useState(1);
    return h(QuestionnaireScreen, {
      questions: definition.questions,
      step,
      answers,
      firstName: 'Anna',
      allergens,
      catalogIndex: index,
      foods,
      redundancy: createRedundancyCheck(definition, answers, { allergens, catalogIndex: index, upTo: step }),
      onChange: (id, answer) => setAnswers((previous) => ({ ...previous, [id]: answer })),
      onStep: setStep,
      onOpenProfile() {},
    });
  }
  const { container, unmount } = await render(h(Questionnaire));
  await click(container.querySelector('input[name="intolerances"][value="yes"]'));
  assert.ok(container.querySelector('.allergen-picker'));
  const search = container.querySelector('input[type="search"]');
  await type(search, 'Laktose');
  await click(container.querySelector('.search-hit'));
  assert.ok(container.querySelector('.chips-block').textContent.includes('Laktose'));
  await click(buttonByText(container, QUESTIONS.next));
  await click(container.querySelector('input[name="never"][value="yes"]'));
  assert.ok(container.querySelector('.never-picker'));
  await type(container.querySelector('input[type="search"]'), 'Koriander');
  await click(container.querySelector('.search-hit'));
  assert.ok(container.querySelector('.chips-block').textContent.includes('Koriander'));
  await click(buttonByText(container, COMMON.back));
  assert.ok(container.querySelector('.chips-block').textContent.includes('Laktose'));
  await click(buttonByText(container, QUESTIONS.next));
  assert.ok(container.querySelector('.chips-block').textContent.includes('Koriander'));
  await unmount();
});

test('Frage 1: Abgedecktes ist gesperrt, Einzelausschlüsse bleiben wählbar, keine Speisevorschriften', async () => {
  const { DIET } = await import('../labels.js');
  let latest = null;
  function Questionnaire() {
    const [answers, setAnswers] = useState(() => emptyAnswers(definition.questions));
    latest = answers.diet;
    return h(QuestionnaireScreen, {
      definition,
      questions: definition.questions,
      step: 0,
      answers,
      firstName: 'Anna',
      allergens,
      catalogIndex: index,
      foods,
      redundancy: createRedundancyCheck(definition, answers, { allergens, catalogIndex: index, upTo: 0 }),
      onChange: (id, answer) => setAnswers((previous) => ({ ...previous, [id]: answer })),
      onStep() {},
      onOpenProfile() {},
    });
  }
  const { container, unmount } = await render(h(Questionnaire));
  const input = (name, value) => container.querySelector(`input[name="${name}"][value="${value}"]`);
  await click(input('diet-form', 'vegetarian'));
  const fish = input('diet-exclusions', 'animalOrigin:fish');
  assert.equal(fish.disabled, true);
  assert.equal(fish.checked, true);
  assert.ok(fish.closest('label').textContent.includes(DIET.coveredBy('Kein Fleisch und kein Fisch')));
  assert.equal(input('diet-exclusions', 'animalOrigin:gelatin'), null, 'Gelatine nur als Vorschlag');
  await click(input('diet-form', 'none'));
  assert.equal(input('diet-exclusions', 'animalOrigin:fish').disabled, false);
  assert.equal(container.querySelector('details.diet-rules'), null, 'Speisevorschriften entfernt');
  assert.doesNotMatch(container.textContent, /Speisevorschrift|Halal|Koscher/i);
  await click(input('diet-exclusions', 'animalOrigin:pork'));
  assert.deepEqual(latest, { form: 'none', exclusions: ['animalOrigin:pork'], rules: [] });
  assert.ok(input('diet-exclusions', 'animalOrigin:pork').checked, 'einzelne Lebensmittel bleiben ausschliessbar');
  assert.doesNotMatch(container.textContent, /geeignet|sicher für/i);
  await unmount();
});

test('Zusammenfassung: Einleitung zu Runde 1 vor „Stimmt so“ (nicht auf der Karte)', async () => {
  const { ROUND } = await import('../labels.js');
  const { container, unmount } = await render(summary([section('diet'), section('intolerances'), section('never')]).element);
  assert.ok(container.textContent.includes(SUMMARY.nextTitle));
  assert.ok(container.textContent.includes(ROUND.round1Intro));
  await unmount();
});

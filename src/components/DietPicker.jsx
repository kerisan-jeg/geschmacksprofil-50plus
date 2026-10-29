import ChoiceList from './ChoiceList.jsx';
import { coveredByForm, dietAnswer, includedBy } from '../logic/stage0.js';
import { DIET } from '../labels.js';

// Frage 1 in zwei Teilen:
//   A Ernährungsform (Pflicht, Einfachauswahl)
//   B Einzelausschlüsse (freiwillig, Mehrfachauswahl). Was die Form schon ausschliesst, ist angehakt und gesperrt.
// Frühere Speisevorschriften und bestätigte Einzelausschlüsse bleiben in gespeicherten Antworten erhalten.
// definition: ganze stage0.json (für die Tabelle diets), question: Frage 1.
export default function DietPicker({ definition, question, answer, onChange }) {
  const value = dietAnswer(answer);
  const formLabel = question.options.find((option) => option.id === value.form)?.label;
  const parentOf = (key) => includedBy(question, value.exclusions, key);
  const covered = (key) => coveredByForm(definition, value.form, key) || Boolean(parentOf(key));
  const coveredText = (key) => (coveredByForm(definition, value.form, key) ? formLabel : parentOf(key)?.label);

  function update(changes) {
    onChange({ ...value, ...changes });
  }

  function toggleExclusion(key) {
    if (covered(key)) return;
    const exclusions = value.exclusions.includes(key) ? value.exclusions.filter((other) => other !== key) : [...value.exclusions, key];
    update({ exclusions });
  }

  // Abgedeckte Punkte bleiben in der Antwort, falls jemand sie vorher gewählt hat (gelten wieder nach einem Wechsel).
  const option = (entry) => ({
    id: entry.key,
    label: entry.label,
    detail: covered(entry.key) ? DIET.coveredBy(coveredText(entry.key)) : entry.detail,
    disabled: covered(entry.key),
  });
  const checked = (keys) => keys.filter((key) => covered(key) || value.exclusions.includes(key));
  const partB = question.exclusions.filter((entry) => !entry.suggestOnly || value.exclusions.includes(entry.key));

  return (
    <div className="diet-picker">
      <section className="stack-tight" aria-labelledby="diet-form">
        <h2 id="diet-form" className="title-section">
          {question.formTitle}
        </h2>
        <ChoiceList name="diet-form" options={question.options} value={value.form} onChange={(form) => update({ form })} labelledBy="diet-form" />
      </section>

      <section className="stack-tight" aria-labelledby="diet-exclusions">
        <h2 id="diet-exclusions" className="title-section">
          {question.exclusionsTitle}
        </h2>
        <p className="note">{question.exclusionsHint}</p>
        <ChoiceList
          name="diet-exclusions"
          multiple
          options={partB.map(option)}
          value={checked(partB.map((entry) => entry.key))}
          onChange={toggleExclusion}
          labelledBy="diet-exclusions"
        />
      </section>

    </div>
  );
}

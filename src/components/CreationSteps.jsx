import { Check } from 'lucide-react';
import { STEPS } from '../labels.js';

// Abschnitte der Profilerstellung (Fragen → Runde 1 → Profil), berechnet in app/model.js (creationSteps).
// Erledigte Abschnitte tragen ein Häkchen, der aktuelle ist hervorgehoben, die Runde zeigt ihren
// Kartenfortschritt mit tabellarischen Ziffern. steps: [{ id, state, answered?, total? }]
export default function CreationSteps({ steps }) {
  return (
    <ol className="steps" style={{ '--count': steps.length }} aria-label={STEPS.label}>
      {steps.map((step) => (
        <li key={step.id} className={`step is-${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}>
          <span className="step-bar" aria-hidden="true" />
          <span className="step-label">
            {step.state === 'done' && <Check aria-hidden="true" />}
            <span className="step-text">
              {step.id === 'round' ? (step.kind === 'dishes' ? STEPS.dishes : STEPS.round(step.number)) : STEPS[step.id]}
              {step.state === 'current' && step.total > 0 && <span className="step-detail num">{STEPS.detail(step.answered, step.total)}</span>}
            </span>
          </span>
          <span className="sr-only"> {STEPS.state[step.state]}</span>
        </li>
      ))}
    </ol>
  );
}

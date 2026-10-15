import { CircleHelp, Info, Pencil, Salad, ShieldAlert, ShieldCheck, Utensils } from 'lucide-react';
import CreationSteps from '../components/CreationSteps.jsx';
import Avatar from '../components/Avatar.jsx';
import TopBar from '../components/TopBar.jsx';
import { hasSummaryRules } from '../logic/profile.js';
import { BRANDS, ONBOARDING, PROFILE, SUMMARY } from '../labels.js';

// Zusätze zu einer Regel (nurec v0.2, Kap. 2.2): ärztlich vorgegeben, kleine Mengen gehen
const FLAG_TEXT = { medical: PROFILE.medical, limited: PROFILE.scopeLimited };

const SECTION_ICONS = { diet: Salad, intolerances: ShieldAlert, never: Utensils };

// Abschluss von Stufe 0 (nurec v0.2, Kap. 2.2): Vor der ersten Karte sieht die Person alle festen Regeln
// und bestätigt sie („Stimmt so“) oder korrigiert sie („Ändern“ führt direkt zur passenden Frage).
// Bewusst kurz: ein Abschnitt je Frage, keine Vorschau der Karten, damit es schnell zur ersten Karte geht.
// sections: aus summarySections() in logic/profile.js
export default function SummaryScreen({ sections, noCards, firstName, steps, onConfirm, onEdit, onOpenProfile }) {
  const hasRules = hasSummaryRules(sections);

  return (
    <main className="screen screen-summary">
      <TopBar start={<CreationSteps steps={steps} />} end={<Avatar name={firstName} onClick={onOpenProfile} />} />

      <div className="stack">
        <p className="kicker">
          <ShieldCheck aria-hidden="true" />
          {firstName ? SUMMARY.thanks(firstName) : SUMMARY.kicker}
        </p>
        <h1>{SUMMARY.title}</h1>
        <p className="lead">{hasRules ? SUMMARY.lead : SUMMARY.leadNone}</p>
      </div>

      <div className="panel exclusion-panel">
        {sections.map((section) => {
          const Icon = SECTION_ICONS[section.id];
          const title = SUMMARY.sections[section.id];
          const empty = section.items.length === 0 && section.notes.length === 0;
          const hasBrands = section.brands.length > 0 || section.origins.length > 0;
          return (
            <section key={section.id} className="exclusion-section" aria-labelledby={`summary-${section.id}`}>
              <div className="exclusion-head">
                <h2 id={`summary-${section.id}`} className="exclusion-title">
                  <Icon aria-hidden="true" />
                  {title}
                </h2>
                <button type="button" className="button-ghost is-strong" onClick={() => onEdit(section.id)} aria-label={SUMMARY.editFor(title)}>
                  <Pencil aria-hidden="true" />
                  {SUMMARY.edit}
                </button>
              </div>

              {empty && !hasBrands && <p className="note">{SUMMARY.none[section.id]}</p>}
              {!empty && (
                <ul className="exclusion-list">
                  {section.items.map((item) => (
                    <li key={item.key} className="exclusion-row">
                      <span className="exclusion-text">
                        <span className="exclusion-label">{item.label}</span>
                        {item.flags?.some((flag) => flag !== 'check') && (
                          <span className="exclusion-flags">
                            {item.flags
                              .filter((flag) => flag !== 'check')
                              .map((flag) => (
                                <span key={flag} className="flag">
                                  {FLAG_TEXT[flag]}
                                </span>
                              ))}
                          </span>
                        )}
                        {item.flags?.includes('limited') && <span className="exclusion-source">{ONBOARDING.scopeNote}</span>}
                      </span>
                    </li>
                  ))}
                  {section.notes.map((note) => (
                    <li key={`note:${note}`} className="exclusion-row">
                      <span className="exclusion-text">
                        <span className="exclusion-label">{note}</span>
                        <span className="exclusion-source">{ONBOARDING.noteChip}</span>
                        <span className="exclusion-flags">
                          <span className="flag is-check">{PROFILE.statusCheck}</span>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {section.notes.length > 0 && <p className="note">{ONBOARDING.entryEffect}</p>}

              {hasBrands && (
                <>
                  <ul className="tag-list">
                    {section.brands.length > 0 && <li>{BRANDS.brands(section.brands)}</li>}
                    {section.origins.length > 0 && <li>{BRANDS.origins(section.origins)}</li>}
                  </ul>
                  <p className="note">{ONBOARDING.brandsNotApplied}</p>
                </>
              )}

              {section.open && (
                <p className="notice">
                  <CircleHelp aria-hidden="true" />
                  {SUMMARY.open}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {noCards && (
        <p className="notice">
          <Info aria-hidden="true" />
          {SUMMARY.noCards}
        </p>
      )}

      <div className="action-bar">
        <button type="button" className="button-primary" onClick={onConfirm}>
          {SUMMARY.confirm}
        </button>
      </div>
    </main>
  );
}

import { useState } from 'react';
import { Ban, CircleHelp, Layers, NotebookPen, RotateCcw, ShieldAlert, Utensils, Salad } from 'lucide-react';
import Artwork from '../components/Artwork.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CreationSteps from '../components/CreationSteps.jsx';
import EmptyState from '../components/EmptyState.jsx';
import RatingChip from '../components/RatingChip.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { allPhotos } from '../lib/images.js';
import { buildProfile } from '../logic/engine.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { groupExclusions } from '../logic/profile.js';
import { BRANDS, ONBOARDING, PROFILE } from '../labels.js';

const TASTE_GROUPS = [PREFER, LIKE, DISLIKE, UNFAMILIAR];
const SECTION_ICONS = { allergies: ShieldAlert, diet: Salad, intolerances: Ban, never: Utensils, notes: NotebookPen };

function sourceText(sources) {
  return PROFILE.sourceLine(sources.map((source) => PROFILE.sources[source] ?? source));
}

function ExclusionSection({ id, title, children, empty }) {
  const Icon = SECTION_ICONS[id];
  return (
    <section className="exclusion-section" aria-labelledby={`ex-${id}`}>
      <h3 id={`ex-${id}`} className="exclusion-title">
        <Icon aria-hidden="true" />
        {title}
      </h3>
      {empty ? <p className="note">{PROFILE.sectionEmpty}</p> : children}
    </section>
  );
}

function ExclusionList({ items }) {
  return (
    <ul className="exclusion-list">
      {items.map((item) => (
        <li key={item.key} className="exclusion-row">
          <span className="exclusion-label">{item.label}</span>
          <span className="exclusion-source">{sourceText(item.sources)}</span>
        </li>
      ))}
    </ul>
  );
}

// „Mein Profil“: Geschmack (gruppiert nach der Antwort pro Karte) und getrennt davon die Ausschlüsse
// mit ihrer Herkunft. Noch ohne Bearbeitung und ohne Berechnung (Score-Modell: Eigenleistung Team).
export default function ProfileScreen({ round, onboarding, index, allergens, dietOptions, steps, onCreate, onRestart }) {
  const [confirmRestart, setConfirmRestart] = useState(false);

  if (!onboarding || !round) {
    return (
      <main className="screen screen-profile">
        <h1>{PROFILE.title}</h1>
        <EmptyState icon={Layers} title={PROFILE.emptyTitle} text={PROFILE.emptyText}>
          <button type="button" className="button-primary" onClick={onCreate}>
            {PROFILE.emptyAction}
          </button>
        </EmptyState>
      </main>
    );
  }

  const profile = buildProfile(round);
  const groups = {
    [PREFER]: profile.taste[PREFER],
    [LIKE]: profile.taste[LIKE],
    [DISLIKE]: profile.taste[DISLIKE],
    [UNFAMILIAR]: profile.unfamiliar,
  };
  const answered = round.sequence.length;
  const hasTaste = TASTE_GROUPS.some((answer) => groups[answer].length > 0);
  const sections = groupExclusions(round.entries, { allergens, index });
  const diet = dietOptions.find((option) => option.id === onboarding.diet);
  const credits = allPhotos().map((photo) => ({ ...photo, cardTitle: index.get(photo.cardId)?.title ?? photo.cardId }));

  return (
    <main className="screen screen-profile">
      <div className="stack">
        <h1>{PROFILE.title}</h1>
        <p className="note num">{PROFILE.answered(answered)}</p>
      </div>
      <CreationSteps steps={steps} />

      <section className="stack" aria-labelledby="taste-title">
        <div className="stack-tight">
          <h2 id="taste-title" className="title-section">
            {PROFILE.tasteTitle}
          </h2>
          <p className="note">{PROFILE.tasteLead}</p>
        </div>
        {!hasTaste && (
          <EmptyState icon={CircleHelp} title={PROFILE.tasteEmpty}>
            <button type="button" className="button-secondary" onClick={onCreate}>
              {PROFILE.continueAction}
            </button>
          </EmptyState>
        )}
        {TASTE_GROUPS.filter((answer) => groups[answer].length > 0).map((answer) => {
          const { Icon, tone } = ANSWER_META[answer];
          return (
            <section key={answer} className={`panel taste-group tone-${tone}`} aria-labelledby={`group-${answer}`}>
              <h3 id={`group-${answer}`} className="taste-group-title">
                <span className="group-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>{PROFILE.groups[answer]}</span>
                <span className="group-count num">{groups[answer].length}</span>
              </h3>
              <ul className="taste-list">
                {groups[answer].map((id) => {
                  const card = index.get(id);
                  return (
                    <li key={id} className="taste-row">
                      <Artwork card={card} size="thumb" className="thumb" />
                      <span className="taste-text">
                        <span className="taste-title">{card.title}</span>
                        <RatingChip answer={answer} />
                      </span>
                    </li>
                  );
                })}
              </ul>
              {answer === DISLIKE && <p className="note">{PROFILE.dislikeNote}</p>}
            </section>
          );
        })}
      </section>

      <section className="stack" aria-labelledby="exclusions-title">
        <div className="stack-tight">
          <h2 id="exclusions-title" className="title-section">
            {PROFILE.exclusionsTitle}
          </h2>
          <p className="note">{PROFILE.exclusionsLead}</p>
        </div>
        <div className="panel exclusion-panel">
          <ExclusionSection id="allergies" title={PROFILE.sections.allergies} empty={sections.allergies.length === 0 && !onboarding.uncertain}>
            <ExclusionList items={sections.allergies} />
            {onboarding.uncertain && <p className="note">{PROFILE.unsure}</p>}
          </ExclusionSection>
          <ExclusionSection id="diet" title={PROFILE.sections.diet}>
            <ul className="exclusion-list">
              <li className="exclusion-row">
                <span className="exclusion-label">{diet && diet.id !== 'none' ? diet.label : PROFILE.noDiet}</span>
                <span className="exclusion-source">{sourceText(['onboarding'])}</span>
              </li>
            </ul>
          </ExclusionSection>
          <ExclusionSection id="intolerances" title={PROFILE.sections.intolerances} empty={sections.intolerances.length === 0}>
            <ExclusionList items={sections.intolerances} />
          </ExclusionSection>
          <ExclusionSection id="never" title={PROFILE.sections.never} empty={sections.never.length === 0}>
            <ExclusionList items={sections.never} />
          </ExclusionSection>
          <ExclusionSection
            id="notes"
            title={PROFILE.sections.notes}
            empty={sections.notes.length === 0 && onboarding.avoidBrands.length === 0 && onboarding.avoidOrigins.length === 0}
          >
            <ExclusionList items={sections.notes} />
            {sections.notes.length > 0 && <p className="note">{ONBOARDING.entryEffect}</p>}
            {(onboarding.avoidBrands.length > 0 || onboarding.avoidOrigins.length > 0) && (
              <>
                <ul className="tag-list">
                  {onboarding.avoidBrands.length > 0 && <li>{BRANDS.brands(onboarding.avoidBrands)}</li>}
                  {onboarding.avoidOrigins.length > 0 && <li>{BRANDS.origins(onboarding.avoidOrigins)}</li>}
                </ul>
                <p className="note">{ONBOARDING.brandsNotApplied}</p>
              </>
            )}
          </ExclusionSection>
        </div>
      </section>

      <section className="profile-footer">
        <button type="button" className="button-secondary" onClick={() => setConfirmRestart(true)}>
          <RotateCcw aria-hidden="true" />
          {PROFILE.restart}
        </button>
        {credits.length > 0 && (
          <details className="credits">
            <summary>{PROFILE.credits}</summary>
            <ul>
              {credits.map((photo) => (
                <li key={photo.cardId}>{PROFILE.creditLine(photo)}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {confirmRestart && (
        <ConfirmDialog
          title={PROFILE.restartTitle}
          text={PROFILE.restartText}
          confirmLabel={PROFILE.restartConfirm}
          onCancel={() => setConfirmRestart(false)}
          onConfirm={() => {
            setConfirmRestart(false);
            onRestart();
          }}
        />
      )}
    </main>
  );
}

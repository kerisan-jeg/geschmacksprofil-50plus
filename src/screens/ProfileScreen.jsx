import { useMemo, useState } from 'react';
import { Ban, ChevronRight, CircleHelp, Layers, LogOut, NotebookPen, Pencil, Plus, RotateCcw, Salad, ShieldAlert, Smartphone, Utensils, X } from 'lucide-react';
import AllergenPicker from '../components/AllergenPicker.jsx';
import Artwork from '../components/Artwork.jsx';
import Avatar from '../components/Avatar.jsx';
import ChoiceList from '../components/ChoiceList.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CreationSteps from '../components/CreationSteps.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FoodSearch from '../components/FoodSearch.jsx';
import RatingChip from '../components/RatingChip.jsx';
import RatingSheet from '../components/RatingSheet.jsx';
import Sheet from '../components/Sheet.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { allPhotos } from '../lib/images.js';
import { allergenLabel } from '../logic/allergens.js';
import { computeProfile } from '../logic/engine.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { buildExclusions } from '../logic/filter.js';
import { buildFoodIndex } from '../logic/foodSearch.js';
import { groupExclusions, sectionOf } from '../logic/profile.js';
import { parseKey, redundancyFor } from '../logic/stage0.js';
import { BRANDS, COMMON, ONBOARDING, PROFILE } from '../labels.js';

const TASTE_GROUPS = [PREFER, LIKE, DISLIKE, UNFAMILIAR];
const SECTION_ICONS = { allergies: ShieldAlert, diet: Salad, intolerances: Ban, never: Utensils, notes: NotebookPen };
// Entfernen nur mit Bestätigung: Allergien und Unverträglichkeiten (Gesundheit)
const CONFIRM_REMOVAL = { allergies: PROFILE.confirmRemoveAllergy, intolerances: PROFILE.confirmRemoveIntolerance };

function sourceText(sources) {
  return PROFILE.sourceLine(sources.map((source) => PROFILE.sources[source] ?? source));
}

function SectionHead({ id, title, action }) {
  const Icon = SECTION_ICONS[id];
  return (
    <div className="exclusion-head">
      <h3 id={`ex-${id}`} className="exclusion-title">
        <Icon aria-hidden="true" />
        {title}
      </h3>
      {action}
    </div>
  );
}

function ExclusionList({ items, onRemove }) {
  return (
    <ul className="exclusion-list">
      {items.map((item) => (
        <li key={item.key} className="exclusion-row">
          <span className="exclusion-text">
            <span className="exclusion-label">{item.label}</span>
            <span className="exclusion-source">{sourceText(item.sources)}</span>
          </span>
          {onRemove && (
            <button type="button" className="icon-button" onClick={() => onRemove(item)} aria-label={PROFILE.remove(item.label)}>
              <X aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

// Ein Treffer der Suche als Ausschluss-Eintrag (gleiches Format wie im Onboarding, siehe filter.js).
function exclusionsForHit(hit, { allergens, index }) {
  if (hit.kind === 'allergen') return hit.ids.map((id) => ({ type: 'allergen', value: id, label: allergenLabel(allergens, id) }));
  const { type, value } = parseKey(hit.key);
  if (type === 'card') return [{ type, value, label: index.get(value)?.title ?? hit.label }];
  return [{ type, value, label: hit.label }];
}

// „Mein Profil“: Geschmack (gruppiert nach der letzten direkten Antwort pro Karte) und getrennt davon
// die Ausschlüsse mit ihrer Herkunft. Jede Änderung wird ein Ereignis im Event-Log (source "profile").
// Keine Berechnung, keine Prozentwerte (Score-Modell: Eigenleistung Team).
export default function ProfileScreen({ round, onboarding, account, index, allergens, foods, dietOptions, steps, canSignOut, onCreate, onRestart, onSignOut, onChange }) {
  const [sheet, setSheet] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [draft, setDraft] = useState(null);

  const searchIndexes = useMemo(
    () => ({
      intolerances: buildFoodIndex({ allergens, catalogIndex: index, foods }),
      never: buildFoodIndex({ catalogIndex: index, foods, tagLabels: dietOptions.tagLabels }),
    }),
    [allergens, index, foods, dietOptions.tagLabels]
  );

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

  const profile = computeProfile(round);
  const groups = profile.groups;
  const hasTaste = TASTE_GROUPS.some((answer) => groups[answer].length > 0);
  const sections = groupExclusions(round.entries, { allergens, index });
  const diet = dietOptions.options.find((option) => option.id === round.diet);
  const currentAllergens = round.entries.filter((entry) => sectionOf(entry) === 'allergies').map((entry) => entry.value);
  const credits = allPhotos().map((photo) => ({ ...photo, cardTitle: photo.usedBy.map((id) => index.get(id)?.title ?? id).join(', ') }));
  const redundancy = redundancyFor(round.exclusions, index);
  // Für die Allergie-Kacheln: nur was Ernährungsweise und andere Abschnitte schon ausschliessen
  const allergyRedundancy = redundancyFor(
    buildExclusions(round.entries.filter((entry) => sectionOf(entry) !== 'allergies'), { diet: round.diet, diets: dietOptions.diets, index }),
    index
  );

  function close() {
    setSheet(null);
    setDraft(null);
  }

  function requestRemoval(section, item) {
    const removal = item.exclusions;
    if (CONFIRM_REMOVAL[section]) setConfirm({ title: PROFILE.confirmRemoveTitle(item.label), text: CONFIRM_REMOVAL[section], run: () => onChange.removeExclusions(section, removal) });
    else onChange.removeExclusions(section, removal);
  }

  function applyAllergies() {
    const next = draft?.selected ?? currentAllergens;
    const added = next.filter((id) => !currentAllergens.includes(id));
    const removed = currentAllergens.filter((id) => !next.includes(id));
    const add = () => added.length && onChange.addExclusions('allergies', added.map((id) => ({ type: 'allergen', value: id, label: allergenLabel(allergens, id) })));
    close();
    if (removed.length === 0) {
      add();
      return;
    }
    setConfirm({
      title: PROFILE.allergiesRemovedTitle(removed.length),
      text: PROFILE.allergiesRemovedText(removed.map((id) => allergenLabel(allergens, id))),
      run: () => {
        onChange.removeExclusions('allergies', removed.map((id) => ({ type: 'allergen', value: id })));
        add();
      },
    });
  }

  function pickFor(section) {
    return (hit) => {
      onChange.addExclusions(section, exclusionsForHit(hit, { allergens, index }));
      close();
    };
  }

  function addNoteFor(origin) {
    return (text) => {
      onChange.addExclusions('notes', [{ type: 'food', value: text, label: text, freeText: true, origin }]);
      close();
    };
  }

  const ratingCard = sheet?.type === 'rating' ? index.get(sheet.cardId) : null;

  return (
    <main className="screen screen-profile">
      <div className="profile-head">
        <h1>{PROFILE.title}</h1>
        <div className="profile-card">
          <Avatar name={account?.firstName} size="large" />
          <div className="profile-card-text">
            <p className="profile-name">{PROFILE.greeting(account?.firstName)}</p>
            {account?.phoneMasked && (
              <p className="note note-with-icon num">
                <Smartphone aria-hidden="true" />
                {account.phoneMasked}
              </p>
            )}
            <p className="note num">{PROFILE.answered(profile.answered)}</p>
          </div>
        </div>
        <CreationSteps steps={steps} />
      </div>

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
                    <li key={id}>
                      <button type="button" className="taste-row" onClick={() => setSheet({ type: 'rating', cardId: id })} aria-label={PROFILE.editRatingFor(card.title)}>
                        <Artwork card={card} size="thumb" className="thumb" />
                        <span className="taste-text">
                          <span className="taste-title">{card.title}</span>
                          <RatingChip answer={answer} />
                        </span>
                        <ChevronRight className="row-chevron" aria-hidden="true" />
                      </button>
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
          <section className="exclusion-section" aria-labelledby="ex-allergies">
            <SectionHead
              id="allergies"
              title={PROFILE.sections.allergies}
              action={
                <button type="button" className="button-ghost is-strong" onClick={() => setSheet({ type: 'allergies' })}>
                  <Pencil aria-hidden="true" />
                  {PROFILE.change}
                </button>
              }
            />
            {sections.allergies.length === 0 && <p className="note">{PROFILE.sectionEmpty}</p>}
            <ExclusionList items={sections.allergies} onRemove={(item) => requestRemoval('allergies', item)} />
            {onboarding.uncertain && <p className="note">{PROFILE.unsure}</p>}
          </section>

          <section className="exclusion-section" aria-labelledby="ex-diet">
            <SectionHead id="diet" title={PROFILE.sections.diet} />
            <button type="button" className="exclusion-row exclusion-row-button" onClick={() => setSheet({ type: 'diet' })} aria-label={PROFILE.changeDietFor(diet && diet.id !== 'none' ? diet.label : PROFILE.noDiet)}>
              <span className="exclusion-text">
                <span className="exclusion-label">{diet && diet.id !== 'none' ? diet.label : PROFILE.noDiet}</span>
                <span className="exclusion-source">{sourceText([round.diet === onboarding.diet ? 'onboarding' : 'profile'])}</span>
              </span>
              <ChevronRight className="row-chevron" aria-hidden="true" />
            </button>
          </section>

          {[
            ['intolerances', PROFILE.sections.intolerances],
            ['never', PROFILE.sections.never],
          ].map(([id, title]) => (
            <section key={id} className="exclusion-section" aria-labelledby={`ex-${id}`}>
              <SectionHead id={id} title={title} />
              {sections[id].length === 0 && <p className="note">{PROFILE.sectionEmpty}</p>}
              <ExclusionList items={sections[id]} onRemove={(item) => requestRemoval(id, item)} />
              <button type="button" className="button-ghost is-strong add-button" onClick={() => setSheet({ type: 'search', section: id })}>
                <Plus aria-hidden="true" />
                {PROFILE.add}
              </button>
            </section>
          ))}

          <section className="exclusion-section" aria-labelledby="ex-notes">
            <SectionHead id="notes" title={PROFILE.sections.notes} />
            {sections.notes.length === 0 && onboarding.avoidBrands.length === 0 && onboarding.avoidOrigins.length === 0 && (
              <p className="note">{PROFILE.sectionEmpty}</p>
            )}
            <ExclusionList items={sections.notes} onRemove={(item) => requestRemoval('notes', item)} />
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
          </section>
        </div>
      </section>

      <section className="profile-footer">
        {canSignOut ? (
          <button
            type="button"
            className="button-secondary"
            onClick={() => setConfirm({ title: PROFILE.signOutTitle, text: PROFILE.signOutText, confirmLabel: PROFILE.signOutConfirm, run: onSignOut })}
          >
            <LogOut aria-hidden="true" />
            {PROFILE.signOut}
          </button>
        ) : (
          <button
            type="button"
            className="button-secondary"
            onClick={() => setConfirm({ title: PROFILE.restartTitle, text: PROFILE.restartText, confirmLabel: PROFILE.restartConfirm, run: onRestart })}
          >
            <RotateCcw aria-hidden="true" />
            {PROFILE.restart}
          </button>
        )}
        {credits.length > 0 && (
          <details className="credits">
            <summary>{PROFILE.credits}</summary>
            <ul>
              {credits.map((photo) => (
                <li key={photo.key}>{PROFILE.creditLine(photo)}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {ratingCard && (
        <RatingSheet
          card={ratingCard}
          rating={round.ratings[ratingCard.id]}
          onClose={close}
          onChange={(rating) => {
            if (rating !== round.ratings[ratingCard.id]) onChange.rating(ratingCard.id, rating, round.ratings[ratingCard.id]);
            close();
          }}
          onRemove={() => {
            onChange.rating(ratingCard.id, null, round.ratings[ratingCard.id]);
            close();
          }}
        />
      )}

      {sheet?.type === 'allergies' && (
        <Sheet title={PROFILE.editAllergies} intro={PROFILE.allergiesHint} onClose={close}>
          <div className="sheet-body">
            <AllergenPicker
              data={allergens}
              catalogIndex={index}
              answer={draft ?? { selected: currentAllergens }}
              redundancy={allergyRedundancy}
              allowFoods={false}
              allowUnsure={false}
              onChange={(next) => setDraft({ selected: next.selected })}
            />
          </div>
          <div className="sheet-actions">
            <button type="button" className="button-secondary" onClick={close}>
              {COMMON.cancel}
            </button>
            <button type="button" className="button-primary" onClick={applyAllergies}>
              {PROFILE.done}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.type === 'diet' && (
        <Sheet title={PROFILE.sections.diet} onClose={close}>
          <div className="sheet-body">
            <ChoiceList
              name="profile-diet"
              options={dietOptions.options}
              value={draft?.diet ?? round.diet ?? 'none'}
              onChange={(value) => setDraft({ diet: value })}
            />
          </div>
          <div className="sheet-actions">
            <button type="button" className="button-secondary" onClick={close}>
              {COMMON.cancel}
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                const next = draft?.diet;
                if (next && next !== (round.diet ?? 'none')) onChange.diet(next, round.diet ?? null);
                close();
              }}
            >
              {PROFILE.done}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.type === 'search' && (
        <Sheet title={sheet.section === 'intolerances' ? PROFILE.searchIntolerances : PROFILE.searchNever} onClose={close}>
          <div className="sheet-body">
            <FoodSearch
              label={PROFILE.searchLabel}
              placeholder={PROFILE.searchPlaceholder}
              items={searchIndexes[sheet.section]}
              isOffered={(hit) => !redundancy.hit(hit)}
              onPick={pickFor(sheet.section)}
              onAddNote={addNoteFor(sheet.section)}
              autoFocus
            />
          </div>
        </Sheet>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          text={confirm.text}
          confirmLabel={confirm.confirmLabel ?? PROFILE.confirmRemove}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const { run } = confirm;
            setConfirm(null);
            run();
          }}
        />
      )}
    </main>
  );
}

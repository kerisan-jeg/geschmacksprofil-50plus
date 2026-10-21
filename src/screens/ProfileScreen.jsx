import { useMemo, useState } from 'react';
import foodList from '../data/foods.json';
import { CUISINE_MIN_RATED } from '../config.js';
import cuisineData from '../data/cuisines.json';
import { Ban, ChevronRight, CircleHelp, Layers, LogOut, NotebookPen, Pencil, Plus, RotateCcw, Salad, ShieldAlert, Smartphone, Soup, Sparkles, Utensils, X } from 'lucide-react';
import AllergenPicker from '../components/AllergenPicker.jsx';
import Artwork from '../components/Artwork.jsx';
import Avatar from '../components/Avatar.jsx';
import ChoiceList from '../components/ChoiceList.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CreationSteps from '../components/CreationSteps.jsx';
import DerivedTaste from '../components/DerivedTaste.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FoodSearch from '../components/FoodSearch.jsx';
import ProfileStatus from '../components/ProfileStatus.jsx';
import RatingChip from '../components/RatingChip.jsx';
import RatingSheet from '../components/RatingSheet.jsx';
import Sheet from '../components/Sheet.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { allPhotos } from '../lib/images.js';
import { allergenLabel } from '../logic/allergens.js';
import { computeProfile, derivedEntries, presentCard } from '../logic/engine.js';
import { buildDashboard, profileProgress } from '../logic/dashboard.js';
import { practicalAnswered, summarizePractical } from '../logic/practical.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { buildExclusions, displayCardTitle } from '../logic/filter.js';
import { buildFoodIndex } from '../logic/foodSearch.js';
import { groupExclusions, sectionOf } from '../logic/profile.js';
import { canonicalKey, coveredByForm, includedEntries, keyLabel, parseKey, redundancyFor } from '../logic/stage0.js';
import { ANSWER_LABELS, BRANDS, COMMON, DIET, ONBOARDING, PRACTICAL, PROFILE } from '../labels.js';

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

// Zusätze zu einer Regel (nurec v0.2, Kap. 2.2: Quelle, Geltungsbereich, Prüfstatus)
const FLAG_TEXT = { check: PROFILE.statusCheck, medical: PROFILE.medical, limited: PROFILE.scopeLimited };

function ExclusionList({ items, onRemove }) {
  return (
    <ul className="exclusion-list">
      {items.map((item) => (
        <li key={item.key} className="exclusion-row">
          <span className="exclusion-text">
            <span className="exclusion-label">{item.label}</span>
            <span className="exclusion-source">{sourceText(item.sources)}</span>
            {(item.flags ?? []).length > 0 && (
              <span className="exclusion-flags">
                {item.flags.map((flag) => (
                  <span key={flag} className={`flag${flag === 'check' ? ' is-check' : ''}`}>
                    {FLAG_TEXT[flag]}
                  </span>
                ))}
              </span>
            )}
            {(item.flags ?? []).includes('check') && <span className="exclusion-source">{PROFILE.statusCheckHint}</span>}
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

// Eine Liste bewerteter Karten (Bild, Titel, Bewertung, optional eine Zeile darunter). Tippen öffnet die Bewertung.
function TasteGroup({ id, title, icon: Icon, tone, entries, index, titleOf, note, onSelect }) {
  if (entries.length === 0) return null;
  return (
    <section className={`panel taste-group${tone ? ` tone-${tone}` : ''}`} aria-labelledby={`group-${id}`}>
      <h3 id={`group-${id}`} className="taste-group-title">
        {Icon && (
          <span className="group-icon">
            <Icon aria-hidden="true" />
          </span>
        )}
        <span>{title}</span>
        <span className="group-count num">{entries.length}</span>
      </h3>
      <ul className="taste-list">
        {entries.map((entry) => {
          const card = index.get(entry.id);
          return (
            <li key={entry.id}>
              <button type="button" className="taste-row" onClick={() => onSelect(entry.id)} aria-label={PROFILE.editRatingFor(titleOf(entry.id))}>
                <Artwork card={card} size="thumb" className="thumb" />
                <span className="taste-text">
                  <span className="taste-title">{titleOf(entry.id)}</span>
                  <RatingChip answer={entry.rating} card={card} />
                  {entry.sub && <span className="taste-reason">{entry.sub}</span>}
                </span>
                <ChevronRight className="row-chevron" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {note && <p className="note">{note}</p>}
    </section>
  );
}

// Ein Treffer der Suche als Ausschluss-Eintrag (gleiches Format wie im Onboarding, siehe filter.js).
export function exclusionsForHit(hit, { allergens, index, restrictions }) {
  if (hit.kind === 'allergen') return hit.ids.map((id) => ({ type: 'allergen', value: id, label: allergenLabel(allergens, id) }));
  // „Schweinefleisch“ aus der Suche: dieselbe Ausschluss-ID wie Frage 1, Teil B, inklusive Gelatine
  const key = canonicalKey(index, hit.key);
  const { type, value } = parseKey(key);
  if (key !== hit.key) {
    const entry = { type, value, label: keyLabel(null, index, key), selectedAs: hit.key };
    return [entry, ...includedEntries(restrictions, entry)];
  }
  if (type === 'card') return [{ type, value, label: index.get(value)?.title ?? hit.label }];
  return [{ type, value, label: hit.label }];
}

// „Mein Profil“ als Ergebnis-Dashboard nach nurec v0.2, Anhang B:
//   Profilstand („Profil aufgebaut“, Erfassungsgrad) mit nächstem sinnvollem Schritt,
//   Favoriten (nur konkrete Lebensmittel mit eigener Bewertung, B3.1), Gruppen, „Isst du eher ungern“ mit Ausnahmen,
//   getrennt davon die Vermutungen der App (mögliche Favoriten, B3.2), Offenes („Kenne ich nicht“ getrennt von
//   „noch nicht gefragt“), Feinheiten (roh/gegart), Gerichte (Stufe 4), Ausschlüsse mit Herkunft und Status,
//   Alltagsprofil (Kap. 2.3). Jede Änderung wird ein Ereignis im Event-Log (source "profile").
// round: Zustand der Profilerstellung (auch während einer Gerichte-Runde).
export default function ProfileScreen({
  round,
  onboarding,
  account,
  index,
  allergens,
  foods,
  dietOptions,
  steps,
  next = null,
  practical = null,
  practicalDefinition = null,
  canSignOut,
  onCreate,
  onNext,
  onOpenPractical,
  onRestart,
  onSignOut,
  onChange,
}) {
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
  const derived = derivedEntries(round);
  const progress = profileProgress(round);
  const board = buildDashboard(round, { cuisines: cuisineData.cuisines });
  const hasTaste = board.favorites.length + board.groups.length + board.dislikes.length + board.unfamiliar.length + board.dishes.length > 0;
  const practicalLines = practicalDefinition ? summarizePractical(practicalDefinition, practical, PRACTICAL) : [];
  const titleOf = (id) => index.get(id) ? displayCardTitle(index.get(id), index, round.exclusions) : id;
  const openRating = (cardId) => setSheet({ type: 'rating', cardId });
  const sections = groupExclusions(round.entries, { allergens, index });
  const diet = dietOptions.options.find((option) => option.id === round.diet);
  // Frühere Stände (z. B. „Kein Schweinefleisch“ als Ernährungsweise): Regeltext aus der Tabelle diets
  const dietLabel = diet ? (diet.id === 'none' ? PROFILE.noDiet : diet.label) : (dietOptions.diets[round.diet]?.rule ?? PROFILE.noDiet);
  const dietKeys = sections.diet.map((item) => item.key);
  const currentAllergens = round.entries.filter((entry) => sectionOf(entry) === 'allergies').map((entry) => entry.value);
  const credits = allPhotos(index.cards).map((photo) => ({ ...photo, cardTitle: photo.usedBy.map((id) => index.get(id)?.title ?? id).join(', ') }));
  const aiImages = index.cards.filter((card) => card.image?.source === 'ai-gemini').length;
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
      onChange.addExclusions(section, exclusionsForHit(hit, { allergens, index, restrictions: dietOptions.exclusions }));
      close();
    };
  }

  function addNoteFor(origin) {
    return (text) => {
      onChange.addExclusions('notes', [{ type: 'food', value: text, label: text, freeText: true, origin }]);
      close();
    };
  }

  const ratingCard = sheet?.type === 'rating' ? presentCard(round, index.get(sheet.cardId)) : null;
  const predictionCard = sheet?.type === 'prediction' ? presentCard(round, index.get(sheet.entry.cardId)) : null;

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

      <ProfileStatus progress={progress} next={next} onNext={onNext} />

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
        {hasTaste && (
          <section className="stack-tight" aria-labelledby="favorites-title">
            <h3 id="favorites-title" className="subsection-title">
              {PROFILE.favoritesTitle}
            </h3>
            <p className="note">{board.favorites.length > 0 ? PROFILE.favoritesLead : PROFILE.favoritesEmpty}</p>
          </section>
        )}
        {[PREFER, LIKE].map((rating) => (
          <TasteGroup
            key={rating}
            id={`favorites-${rating}`}
            title={PROFILE.favoriteGroups[rating]}
            icon={ANSWER_META[rating].Icon}
            tone={ANSWER_META[rating].tone}
            entries={board.favorites.filter((entry) => entry.rating === rating)}
            index={index}
            titleOf={titleOf}
            onSelect={openRating}
          />
        ))}
        <TasteGroup id="groups" title={PROFILE.groupsTitle} icon={Layers} entries={board.groups} index={index} titleOf={titleOf} note={PROFILE.groupsLead} onSelect={openRating} />
        <TasteGroup
          id="dislikes"
          title={PROFILE.dislikesTitle}
          icon={ANSWER_META[DISLIKE].Icon}
          tone={ANSWER_META[DISLIKE].tone}
          entries={board.dislikes.map((entry) => ({
            id: entry.id,
            rating: DISLIKE,
            sub: entry.exceptions.length > 0 ? PROFILE.exception(entry.exceptions.map((exception) => titleOf(exception.id)).join(', ')) : null,
          }))}
          index={index}
          titleOf={titleOf}
          note={PROFILE.dislikeNote}
          onSelect={openRating}
        />
      </section>

      <DerivedTaste entries={derived} index={index} titleOf={titleOf} onSelect={(entry) => setSheet({ type: 'prediction', entry })} />

      {(board.unfamiliar.length > 0 || board.unasked.length > 0) && (
        <section className="stack" aria-labelledby="open-title">
          <div className="stack-tight">
            <h2 id="open-title" className="title-section">
              {PROFILE.openTitle}
            </h2>
            <p className="note">{PROFILE.openLead}</p>
          </div>
          <TasteGroup
            id="unfamiliar"
            title={PROFILE.unfamiliarTitle}
            icon={ANSWER_META[UNFAMILIAR].Icon}
            tone={ANSWER_META[UNFAMILIAR].tone}
            entries={board.unfamiliar.map((id) => ({ id, rating: UNFAMILIAR }))}
            index={index}
            titleOf={titleOf}
            onSelect={openRating}
          />
          {board.unasked.length > 0 && (
            <section className="panel" aria-labelledby="unasked-title">
              <h3 id="unasked-title" className="panel-title">
                {PROFILE.unaskedTitle}
              </h3>
              <ul className="tag-list">
                {board.unasked.map((id) => (
                  <li key={id}>{titleOf(id)}</li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}

      {board.details.length > 0 && (
        <section className="panel" aria-labelledby="details-title">
          <h2 id="details-title" className="panel-title">
            {PROFILE.detailsTitle}
          </h2>
          <p className="note">{PROFILE.detailsLead}</p>
          <ul className="detail-lines">
            {board.details.map((entry) => (
              <li key={entry.cookedId}>{PROFILE.detailLine(titleOf(entry.rawId), ANSWER_LABELS[entry.raw], titleOf(entry.cookedId), ANSWER_LABELS[entry.cooked])}</li>
            ))}
          </ul>
        </section>
      )}

      {board.dishes.length > 0 && (
        <section className="stack" aria-labelledby="dishes-title">
          <div className="stack-tight">
            <h2 id="dishes-title" className="title-section">
              {PROFILE.dishesTitle}
            </h2>
            <p className="note">{board.dishes.length > 0 ? PROFILE.dishesLead : PROFILE.dishesEmpty}</p>
          </div>
          <TasteGroup id="dishes" title={PROFILE.dishesTitle} icon={Soup} entries={board.dishes} index={index} titleOf={titleOf} onSelect={openRating} />
          <section className="stack-tight" aria-labelledby="cuisines-title">
            <h3 id="cuisines-title" className="subsection-title">
              {PROFILE.cuisinesTitle}
            </h3>
            {board.cuisines.length > 0 && (
              <ul className="detail-lines">
                {board.cuisines.map((entry) => (
                  <li key={entry.id}>{PROFILE.cuisineLine(entry.label, entry.direction, entry.rated)}</li>
                ))}
              </ul>
            )}
            <p className="note">{PROFILE.cuisinesNote(CUISINE_MIN_RATED)}</p>
          </section>
        </section>
      )}

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
            <button type="button" className="exclusion-row exclusion-row-button" onClick={() => setSheet({ type: 'diet' })} aria-label={PROFILE.changeDietFor(dietLabel)}>
              <span className="exclusion-text">
                <span className="exclusion-label">{dietLabel}</span>
                <span className="exclusion-source">{sourceText([round.diet === onboarding.diet ? 'onboarding' : 'profile'])}</span>
              </span>
              <ChevronRight className="row-chevron" aria-hidden="true" />
            </button>
            <ExclusionList items={sections.diet} onRemove={(item) => requestRemoval('diet', item)} />
            {onboarding.dietaryRules?.length > 0 && (
              <p className="note">
                {DIET.rulesLine(onboarding.dietaryRules.map((id) => dietOptions.rules.find((rule) => rule.id === id)?.label ?? id))}. {DIET.rulesEffect}
              </p>
            )}
            <button type="button" className="button-ghost is-strong add-button" onClick={() => setSheet({ type: 'dietExclusions' })}>
              <Plus aria-hidden="true" />
              {PROFILE.add}
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

      {practicalDefinition && (
        <section className="panel practical-panel" aria-labelledby="practical-title">
          <div className="exclusion-head">
            <h2 id="practical-title" className="exclusion-title">
              <Sparkles aria-hidden="true" />
              {PROFILE.practicalTitle}
            </h2>
            {onOpenPractical && (
              <button type="button" className="button-ghost is-strong" onClick={onOpenPractical}>
                <Pencil aria-hidden="true" />
                {practicalAnswered(practicalDefinition, practical) > 0 ? PROFILE.practicalEdit : PROFILE.practicalAdd}
              </button>
            )}
          </div>
          <p className="note">{PROFILE.practicalLead}</p>
          {practicalLines.length === 0 ? (
            <p className="note">{PROFILE.practicalEmpty}</p>
          ) : (
            <dl className="practical-lines">
              {practicalLines.map((line) => (
                <div key={line.id} className="practical-line">
                  <dt>{line.dimension}</dt>
                  <dd>{line.text}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

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
              {aiImages > 0 && <li>{PROFILE.aiImages(aiImages)}</li>}
              <li>{PROFILE.foodSource(foodList.source.version)}</li>
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

      {predictionCard && (
        <RatingSheet
          card={predictionCard}
          rating={null}
          intro={PROFILE.derived.sheetIntro(sheet.entry.rating)}
          note={PROFILE.derived.sheetNote}
          onClose={close}
          onChange={(rating) => {
            onChange.confirmPrediction(predictionCard.id, rating, sheet.entry.score);
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

      {sheet?.type === 'dietExclusions' && (
        <Sheet title={DIET.addTitle} onClose={close}>
          <div className="sheet-body">
            <ChoiceList
              name="profile-diet-exclusions"
              multiple
              options={dietOptions.exclusions.map((entry) => {
                const covered = coveredByForm(dietOptions.definition, round.diet, entry.key);
                return { id: entry.key, label: entry.label, detail: covered ? DIET.coveredBy(dietLabel) : entry.detail, disabled: covered };
              })}
              value={(draft?.selected ?? dietKeys).concat(dietOptions.exclusions.filter((entry) => coveredByForm(dietOptions.definition, round.diet, entry.key)).map((entry) => entry.key))}
              onChange={(key) => {
                const current = draft?.selected ?? dietKeys;
                setDraft({ selected: current.includes(key) ? current.filter((other) => other !== key) : [...current, key] });
              }}
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
                const next = draft?.selected ?? dietKeys;
                const labelOf = (key) => dietOptions.exclusions.find((entry) => entry.key === key)?.label ?? key;
                // „Kein Schweinefleisch“ bringt Gelatine mit (includedBy), wie in Frage 1
                const toEntries = (key) => [
                  { ...parseKey(key), label: labelOf(key), origin: 'diet' },
                  ...(dietOptions.exclusions.find((entry) => entry.key === key)?.includes ?? []).map((extra) => ({ ...parseKey(extra), label: extra, origin: 'diet', includedBy: key })),
                ];
                onChange.addExclusions('diet', next.filter((key) => !dietKeys.includes(key)).flatMap(toEntries));
                onChange.removeExclusions('diet', sections.diet.filter((item) => !next.includes(item.key)).flatMap((item) => item.exclusions));
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

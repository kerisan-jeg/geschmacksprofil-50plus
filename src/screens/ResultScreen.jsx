import { Check, CircleDashed, Download, RotateCcw } from 'lucide-react';
import Artwork from '../components/Artwork.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { progress, summarize } from '../logic/engine.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR, UNRATED } from '../logic/answers.js';

const GROUPS = [
  { key: PREFER, ...ANSWER_META[PREFER] },
  { key: LIKE, ...ANSWER_META[LIKE] },
  { key: DISLIKE, ...ANSWER_META[DISLIKE], note: 'Kein Verbot: Ausnahmen fragen wir später gezielt nach.' },
  { key: UNFAMILIAR, ...ANSWER_META[UNFAMILIAR], label: 'Kennst du nicht' },
  { key: UNRATED, label: 'Noch offen', Icon: CircleDashed, tone: 'open' },
];

export default function ResultScreen({ round, endedEarly, onRestart, onDownloadLog }) {
  const groups = summarize(round);
  const { answered, total } = progress(round);
  const credits = round.cards.filter((card) => card.image?.credit);

  return (
    <main className="screen screen-result">
      <p className="result-kicker">
        <Check aria-hidden="true" strokeWidth={2.6} />
        {endedEarly ? 'Runde beendet' : 'Runde 1 abgeschlossen'}
      </p>
      <h1>Dein Zwischenstand</h1>
      <p className="lead">
        {endedEarly ? `${answered} von ${total} Karten beantwortet.` : `Alle ${total} Karten beantwortet.`} So hast du geantwortet:
      </p>

      <div className="result-panel">
        {GROUPS.filter(({ key }) => groups[key].length > 0).map(({ key, label, Icon, tone, note }) => (
          <section key={key} className={`result-group tone-${tone}`}>
            <h2>
              <span className="group-icon"><Icon aria-hidden="true" strokeWidth={2.2} /></span>
              {label}
              <span className="group-count">{groups[key].length}</span>
            </h2>
            <ul className="result-items">
              {groups[key].map((card) => (
                <li key={card.id}>
                  <Artwork card={card} className="thumb" />
                  <span>{card.title}</span>
                </li>
              ))}
            </ul>
            {note && <p className="note">{note}</p>}
          </section>
        ))}
      </div>

      <p className="fineprint">
        Alles hier stammt direkt aus deinen Antworten. In den nächsten Runden fragen wir dort genauer nach, wo es sich lohnt.
      </p>

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onRestart}>
          <RotateCcw aria-hidden="true" />
          Nochmals von vorn
        </button>
      </div>

      <footer className="test-lead">
        <p>Für die Testleitung</p>
        <button type="button" className="button-secondary" onClick={onDownloadLog}>
          <Download aria-hidden="true" />
          Protokoll herunterladen
        </button>
        {credits.length > 0 && (
          <details className="credits">
            <summary>Bildnachweise</summary>
            <ul>
              {credits.map((card) => (
                <li key={card.id}>
                  {card.title}: {card.image.credit.author}, {card.image.credit.source}, {card.image.credit.license}
                </li>
              ))}
            </ul>
          </details>
        )}
      </footer>
    </main>
  );
}

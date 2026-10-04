import { ANSWER_LABELS } from '../config.js';
import { progress, summarize } from '../logic/engine.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR, UNRATED } from '../logic/answers.js';

const GROUPS = [
  { key: PREFER, heading: ANSWER_LABELS[PREFER] },
  { key: LIKE, heading: ANSWER_LABELS[LIKE] },
  { key: DISLIKE, heading: ANSWER_LABELS[DISLIKE], note: 'Kein Verbot: Ausnahmen fragen wir später gezielt nach.' },
  { key: UNFAMILIAR, heading: 'Kennst du nicht' },
  { key: UNRATED, heading: 'Noch offen' },
];

export default function ResultScreen({ round, endedEarly, onRestart, onDownloadLog }) {
  const groups = summarize(round);
  const { answered, total } = progress(round);
  const credits = round.cards.filter((card) => card.image?.credit);

  return (
    <main className="screen screen-result">
      <h1>Dein Zwischenstand</h1>
      <p className="lead">
        {endedEarly
          ? `Runde beendet: ${answered} von ${total} Karten beantwortet.`
          : `Runde 1 geschafft: alle ${total} Karten beantwortet.`}
      </p>

      {GROUPS.filter(({ key }) => groups[key].length > 0).map(({ key, heading, note }) => (
        <section key={key} className={`result-group result-${key.toLowerCase()}`}>
          <h2>{heading}</h2>
          <ul>
            {groups[key].map((card) => <li key={card.id}>{card.title}</li>)}
          </ul>
          {note && <p className="note">{note}</p>}
        </section>
      ))}

      <p className="fineprint">
        Alles hier stammt direkt aus deinen Antworten. In den nächsten Runden fragen wir dort genauer nach, wo es sich lohnt.
      </p>

      <div className="screen-actions">
        <button type="button" className="primary" onClick={onRestart}>Nochmals von vorn</button>
        <button type="button" className="text-button" onClick={onDownloadLog}>Protokoll herunterladen</button>
      </div>

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
    </main>
  );
}

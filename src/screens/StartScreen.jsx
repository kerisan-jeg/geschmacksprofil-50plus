import { ANSWER_LABELS } from '../config.js';

export default function StartScreen({ total, onStart }) {
  return (
    <main className="screen screen-start">
      <div className="start-art" aria-hidden="true">
        <div className="mini-card mini-card-back" />
        <div className="mini-card mini-card-middle" />
        <div className="mini-card mini-card-front">
          <div className="mini-photo">
            <span className="stamp stamp-like">{ANSWER_LABELS.LIKE}</span>
          </div>
          <span className="mini-title">Obst</span>
        </div>
      </div>

      <h1>Was isst du gern?</h1>
      <p className="lead">
        Wir zeigen dir Karten mit Lebensmitteln. Bei jeder Karte sagst du, wie gern du sie isst.
        So entsteht Schritt für Schritt dein Geschmacksprofil.
      </p>
      <ul className="facts">
        <li>Die erste Runde hat {total} Karten.</li>
        <li>Du kannst wischen oder tippen, wie es dir lieber ist.</li>
        <li>Du kannst jederzeit aufhören.</li>
      </ul>

      <div className="screen-actions">
        <button type="button" className="primary" onClick={onStart}>Starten</button>
        <p className="fineprint">
          Prototyp aus einem Studierendenprojekt der ZHAW für nurec. Deine Antworten bleiben auf diesem Gerät.
        </p>
      </div>
    </main>
  );
}

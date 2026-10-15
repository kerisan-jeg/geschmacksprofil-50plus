// Fortschritt der Runde: ein Segment pro Karte. Erledigte Segmente sind gefüllt, das aktuelle
// ist hervorgehoben. Anzahl und Prozentwert kommen aus progress() und damit aus dem Rundenlimit
// (ROUND_CARD_LIMIT), nie fest im Code. Bewusst kein Profil-Prozentwert: Vollständigkeit ist nicht Genauigkeit
// (docs/messkonzept.md); ausgewertet wird sie nur intern.
export default function SegmentedProgress({ answered, total, percent, label, valueText, counter }) {
  return (
    <div className="progress">
      {counter && (
        <p className="progress-text" aria-hidden="true">
          <span>
            <strong>{counter.strong}</strong>
            {counter.rest}
          </span>
        </p>
      )}
      <div
        className="segments"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={valueText}
      >
        {Array.from({ length: total }, (_, index) => {
          let state = '';
          if (index < answered) state = ' is-done';
          else if (index === answered) state = ' is-current';
          return <span key={index} className={`segment${state}`} />;
        })}
      </div>
    </div>
  );
}

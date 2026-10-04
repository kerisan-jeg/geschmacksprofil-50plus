// Fortschritt innerhalb der Runde, ein Segment pro Karte.
// Kein Profil-Prozentwert: dessen Berechnung ist noch Teil des Konzepts.
export default function SegmentedProgress({ answered, total }) {
  return (
    <div className="segments" role="progressbar" aria-label="Fortschritt der Runde" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
      {Array.from({ length: total }, (_, index) => {
        let state = '';
        if (index < answered) state = ' is-done';
        else if (index === answered) state = ' is-current';
        return <span key={index} className={`segment${state}`} />;
      })}
    </div>
  );
}

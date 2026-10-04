// Fortschritt innerhalb der Runde. Kein Profil-Prozentwert: dessen Berechnung ist noch Teil des Konzepts.
export default function ProgressBar({ current, total }) {
  const answered = Math.max(0, Math.min(current - 1, total));
  return (
    <div className="progress">
      <p className="progress-label">Karte {Math.min(current, total)} von {total}</p>
      <div className="progress-track" role="progressbar" aria-label="Fortschritt der Runde" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
        <div className="progress-fill" style={{ width: `${(answered / total) * 100}%` }} />
      </div>
    </div>
  );
}

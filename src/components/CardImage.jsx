import { useState } from 'react';

// Zeigt das Foto der Karte. Fehlt die Datei noch, erscheint ein ruhiger Platzhalter.
export default function CardImage({ card }) {
  const [failed, setFailed] = useState(false);
  const file = card.image?.file;

  if (!file || failed) {
    return (
      <div className="card-photo card-photo-fallback" aria-hidden="true">
        <span className="fallback-plate">{card.title.charAt(0)}</span>
        <span className="fallback-note">Foto folgt</span>
      </div>
    );
  }

  // Das Foto ergänzt Titel und Beispiele, die als Text auf der Karte stehen: alt bleibt leer.
  return (
    <div className="card-photo">
      <img src={`${import.meta.env.BASE_URL}images/${file}`} alt="" draggable={false} onError={() => setFailed(true)} />
    </div>
  );
}

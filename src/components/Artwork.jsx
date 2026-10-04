// Bild einer Karte: Foto, falls im Katalog hinterlegt, sonst die Illustration.
// Das Bild ergänzt Titel und Beispiele, die als Text auf der Karte stehen: alt bleibt leer.
export default function Artwork({ card, className = '' }) {
  const base = import.meta.env.BASE_URL;
  const photo = card.image?.file;

  return (
    <div className={`artwork ${className}`} style={{ '--tint': card.tint ?? '#e9eee6' }}>
      {photo ? (
        <img className="artwork-photo" src={`${base}images/${photo}`} alt="" draggable={false} />
      ) : (
        card.illustration && (
          <img className="artwork-illustration" src={`${base}illustrations/${card.illustration}`} alt="" draggable={false} />
        )
      )}
    </div>
  );
}

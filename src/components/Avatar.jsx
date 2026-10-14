import { UserRound } from 'lucide-react';
import { AVATAR } from '../labels.js';

// Profil-Knopf oben rechts: Kreis mit der Initiale des Vornamens (ohne Vorname: Personensymbol).
// Ohne onClick nur als Anzeige (z. B. im Kopf von „Mein Profil“).
export default function Avatar({ name, onClick, size }) {
  const initial = name?.trim().charAt(0).toUpperCase();
  const content = initial || <UserRound aria-hidden="true" />;
  const className = `avatar${size === 'large' ? ' avatar-large' : ''}`;
  if (!onClick) {
    return (
      <span className={className} aria-hidden="true">
        {content}
      </span>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} aria-label={AVATAR.open(name)}>
      {content}
    </button>
  );
}

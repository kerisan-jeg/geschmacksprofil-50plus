import { ChevronLeft } from 'lucide-react';
import { COMMON } from '../labels.js';

// Kopfzeile in Abläufen: links zurück oder beenden, rechts z. B. Rückgängig oder Überspringen.
export default function TopBar({ start, end }) {
  return (
    <header className="top-bar">
      <div className="top-bar-start">{start}</div>
      {end && <div className="top-bar-end">{end}</div>}
    </header>
  );
}

export function BackButton({ onClick, label = COMMON.back }) {
  return (
    <button type="button" className="button-ghost" onClick={onClick}>
      <ChevronLeft aria-hidden="true" />
      {label}
    </button>
  );
}

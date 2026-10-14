import { Leaf, X } from 'lucide-react';
import { SMS } from '../labels.js';

// SIMULATION: zeigt den Code des MockAuthService wie eine SMS-Mitteilung oben am Bildschirm.
// Es wird keine SMS verschickt. Die Mitteilung steht über dem Bildschirm, nicht darauf: Sie verdeckt
// weder Titel noch Eingabefeld. Sie bleibt, bis jemand sie mit dem X schliesst oder der Code stimmt,
// damit sich beim Eintippen nichts verschiebt.
export default function SmsBanner({ code, onDismiss }) {
  return (
    <div className="sms-banner" role="status" aria-live="polite" aria-label={SMS.region}>
      <div className="sms-card">
        <span className="sms-icon" aria-hidden="true">
          <Leaf />
        </span>
        <div className="sms-content">
          <p className="sms-meta">
            <span>{SMS.app}</span>
            <span>{SMS.time}</span>
          </p>
          <p className="sms-sender">{SMS.sender}</p>
          <p className="sms-text">{SMS.text(code)}</p>
        </div>
        <button type="button" className="sms-close" onClick={onDismiss} aria-label={SMS.dismiss}>
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

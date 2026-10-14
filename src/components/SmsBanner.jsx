import { useEffect } from 'react';
import { Leaf, X } from 'lucide-react';
import { SMS_BANNER_MS } from '../config.js';
import { SMS } from '../labels.js';

// SIMULATION: zeigt den Code des MockAuthService wie eine echte SMS-Mitteilung oben am Bildschirm.
// Es wird keine SMS verschickt. Die Mitteilung blendet sich nach SMS_BANNER_MS aus oder mit dem X.
export default function SmsBanner({ code, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, SMS_BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [code, onDismiss]);

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

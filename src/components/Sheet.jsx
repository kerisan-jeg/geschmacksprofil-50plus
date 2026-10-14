import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { COMMON } from '../labels.js';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Bottom Sheet für Detailauswahl und Bestätigungen.
// Beim Öffnen: Fokus auf den Titel, Hintergrund scrollt nicht, Tab bleibt im Sheet, Escape schliesst.
// Beim Schliessen kehrt der Fokus zum auslösenden Element zurück.
export default function Sheet({ title, intro, onClose, children, role = 'dialog' }) {
  const headingId = useId();
  const sheetRef = useRef(null);
  const headingRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    headingRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKey(event) {
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const items = [...sheetRef.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handleKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        ref={sheetRef}
        role={role}
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id={headingId} ref={headingRef} tabIndex={-1}>
            {title}
          </h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={COMMON.close}>
            <X aria-hidden="true" />
          </button>
        </div>
        {intro && <p className="note">{intro}</p>}
        {children}
      </div>
    </div>
  );
}

import Sheet from './Sheet.jsx';
import { COMMON } from '../labels.js';

// Bestätigung vor einer Aktion mit Folgen (z. B. Allergie entfernen, von vorn beginnen).
// Abbrechen steht links und ist gleich gross: Niemand bestätigt aus Versehen.
export default function ConfirmDialog({ title, text, confirmLabel, cancelLabel = COMMON.cancel, onConfirm, onCancel }) {
  return (
    <Sheet title={title} onClose={onCancel} role="alertdialog">
      {text && <p className="dialog-text">{text}</p>}
      <div className="sheet-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="button-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

import { useState } from 'react';
import { Leaf, Smartphone } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { APP, PROFILE, WELCOME_BACK } from '../labels.js';

// Wiederkehrende Person auf demselben Gerät: Begrüssung mit Vornamen, dann weiter, wo sie war.
// Wer nicht gemeint ist (geteiltes Gerät), meldet ab und beginnt neu.
export default function WelcomeBackScreen({ account, onContinue, onSignOut }) {
  const [confirm, setConfirm] = useState(false);
  const name = account?.firstName ?? '';

  return (
    <main className="screen screen-welcome">
      <p className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Leaf />
        </span>
        {APP.name}
      </p>

      <div className="welcome-hero">
        <Avatar name={name} size="large" />
        <div className="stack">
          <h1>{WELCOME_BACK.title(name)}</h1>
          <p className="lead">{WELCOME_BACK.lead}</p>
          {account?.phoneMasked && (
            <p className="note note-with-icon num">
              <Smartphone aria-hidden="true" />
              {WELCOME_BACK.phone(account.phoneMasked)}
            </p>
          )}
        </div>
      </div>

      <div className="action-bar">
        <button type="button" className="button-primary" onClick={onContinue}>
          {WELCOME_BACK.continue}
        </button>
        <button type="button" className="button-link" onClick={() => setConfirm(true)}>
          {WELCOME_BACK.notMe(name)}
        </button>
      </div>

      {confirm && (
        <ConfirmDialog
          title={PROFILE.signOutTitle}
          text={PROFILE.signOutText}
          confirmLabel={PROFILE.signOutConfirm}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            onSignOut();
          }}
        />
      )}
    </main>
  );
}

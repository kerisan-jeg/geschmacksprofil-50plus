import { ChevronDown } from 'lucide-react';

// Native details/summary: standardmässig geschlossen, per Tastatur und Touch bedienbar.
export default function ProfileDisclosure({ id, title, count, icon: Icon, tone, className = '', description, fraction, children }) {
  return (
    <details className={`panel profile-disclosure${tone ? ` tone-${tone}` : ''} ${className}`} aria-labelledby={id}>
      <summary className="profile-disclosure-summary">
        {Icon && <span className="group-icon"><Icon aria-hidden="true" /></span>}
        <span className="disclosure-text">
          <span id={id} className="disclosure-title">{title}</span>
          {description && <span className="note">{description}</span>}
        </span>
        {count != null && <span className="group-count num">{count}</span>}
        <ChevronDown className="disclosure-chevron" aria-hidden="true" />
        {fraction != null && (
          <span className="answer-bar" aria-hidden="true">
            <span className="answer-bar-fill" style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }} />
          </span>
        )}
      </summary>
      <div className="profile-disclosure-content">{children}</div>
    </details>
  );
}

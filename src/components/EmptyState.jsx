// Leerzustand (und Fehlerzustand): Symbol, kurzer Titel, ein Satz, optional eine Aktion.
export default function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <section className="empty-state">
      {Icon && (
        <span className="empty-state-icon">
          <Icon aria-hidden="true" />
        </span>
      )}
      <h2>{title}</h2>
      {text && <p className="note">{text}</p>}
      {children}
    </section>
  );
}

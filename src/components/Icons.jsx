// Einfache Symbole. Die Farbe kommt immer aus dem umgebenden Text (currentColor).

function Svg({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function IconArrowLeft() {
  return <Svg><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></Svg>;
}

export function IconArrowRight() {
  return <Svg><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Svg>;
}

export function IconArrowUp() {
  return <Svg><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></Svg>;
}

export function IconQuestion() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.4-2.6 4" />
      <path d="M12 17.6h.01" />
    </Svg>
  );
}

export function IconUndo() {
  return <Svg><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Svg>;
}

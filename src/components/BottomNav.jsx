import { useLayoutEffect, useRef } from 'react';
import { Layers, UserRound } from 'lucide-react';
import { TABS } from '../app/model.js';
import { NAV } from '../labels.js';

// Untere Navigation mit den zwei Bereichen der App. Der aktive Bereich ist an Farbe, Fläche
// hinter dem Symbol und fetterer Schrift erkennbar, für Screenreader über aria-current.
const ITEMS = [
  { tab: TABS.CREATE, label: NAV.create, Icon: Layers },
  { tab: TABS.PROFILE, label: NAV.profile, Icon: UserRound },
];

// Die tatsächliche Höhe (inkl. sicherer Zone und grösserer Schrift, z. B. 130 %) wird gemessen und
// als --nav-height gesetzt. Seiten und der feste Aktionsbereich halten so immer genug Abstand.
function useNavHeight(ref) {
  useLayoutEffect(() => {
    const node = ref.current;
    const root = document.documentElement;
    if (!node) return undefined;
    const update = () => root.style.setProperty('--nav-height', `${node.offsetHeight}px`);
    update();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(node);
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--nav-height');
    };
  }, [ref]);
}

export default function BottomNav({ active, onSelect }) {
  const ref = useRef(null);
  useNavHeight(ref);

  return (
    <nav className="tabbar" aria-label={NAV.label} ref={ref}>
      <div className="tabbar-inner">
        {ITEMS.map(({ tab, label, Icon }) => (
          <button
            key={tab}
            type="button"
            className="tab"
            aria-current={active === tab ? 'page' : undefined}
            data-tab={tab}
            onClick={() => onSelect(tab)}
          >
            <span className="tab-icon">
              <Icon aria-hidden="true" />
            </span>
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

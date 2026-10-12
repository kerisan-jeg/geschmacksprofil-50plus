"""Misst die Mobile-Kriterien (Addendum A11) auf allen Bildschirmen des Prototyps.

Geprüft bei 360 x 640 und 430 x 932:
  - kein horizontaler Scroll
  - Touch-Ziele >= 44 x 44 CSS-px
  - Textkontrast >= 4.5:1 (axe-core, Regel color-contrast)
  - Fliesstext >= 18 px
  - kein abgeschnittener Text (mit zoom 1.3 = 130 % Schrift)
  - prefers-reduced-motion: Karte ohne Übergang

Voraussetzungen: npm install, pip install playwright, python -m playwright install chromium
Aufruf (in einem zweiten Terminal läuft `npm run build && npm run preview`):
  python3 scripts/check-mobile.py          # 100 % Schrift
  python3 scripts/check-mobile.py 1.3      # 130 % Schrift
"""
import json, sys
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:4173/'  # Adresse von npm run preview
from pathlib import Path
AXE = (Path(__file__).resolve().parent.parent / 'node_modules' / 'axe-core' / 'axe.min.js').read_text()
ZOOM = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0

CHECK = r"""
(zoomed) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('.sr-only') && !el.closest('[aria-hidden="true"]'); };
  const out = { hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, small: [], fonts: [], clipped: [] };
  // Touch-Ziele
  const targets = document.querySelectorAll('button, a[href], input:not([type=radio]):not([type=checkbox]), label.choice, summary, .tile');
  for (const el of targets) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) out.small.push(`${el.tagName.toLowerCase()}.${el.className.split(' ')[0]} "${(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  // Schriftgrösse aller sichtbaren Textknoten
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode; if (!node.textContent.trim()) continue;
    const el = node.parentElement; if (!el || !vis(el) || seen.has(el)) continue; seen.add(el);
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 17.95) out.fonts.push(`${el.tagName.toLowerCase()}.${el.className} "${node.textContent.trim().slice(0,25)}" ${size.toFixed(1)}px`);
    // abgeschnittener Text: Text ragt aus einem Vorfahren mit overflow hidden/clip heraus
    const range = document.createRange(); range.selectNodeContents(node);
    const tr = range.getBoundingClientRect();
    let a = el;
    while (a && a !== document.body) {
      const cs = getComputedStyle(a);
      if (/(hidden|clip)/.test(cs.overflowX + cs.overflowY) && !a.classList.contains('sr-only')) {
        const ar = a.getBoundingClientRect();
        if (tr.bottom > ar.bottom + 1 || tr.top < ar.top - 1 || tr.right > ar.right + 1 || tr.left < ar.left - 1)
          out.clipped.push(`"${node.textContent.trim().slice(0,25)}" in ${a.className}`);
        break;
      }
      a = a.parentElement;
    }
    // Text breiter als sein Element (überläuft ohne Umbruch)
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') out.clipped.push(`scrollWidth "${node.textContent.trim().slice(0,25)}"`);
  }
  return out;
}
"""


def contrast(pg):
    pg.add_script_tag(content=AXE) if not pg.evaluate('!!window.axe') else None
    res = pg.evaluate("""async () => { const r = await axe.run(document, { runOnly: ['color-contrast'] });
      return r.violations.flatMap(v => v.nodes.map(n => n.target.join(' ') + ' :: ' + (n.any[0]?.message || '').slice(0, 110))); }""")
    return res


def check(pg, name, results):
    pg.wait_for_timeout(450)
    if ZOOM != 1.0:
        pg.add_style_tag(content=f'html {{ font-size: calc(118.75% * {ZOOM}) !important; }}')
        pg.wait_for_timeout(250)
        # Runde: Bildhöhe neu berechnen lassen
        pg.evaluate("window.dispatchEvent(new Event('resize'))")
        pg.wait_for_timeout(150)
    r = pg.evaluate(CHECK, ZOOM != 1.0)
    r['contrast'] = contrast(pg)
    results[name] = r


def run(p, W, H):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=True, reduced_motion='reduce')
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    results = {}
    pg.goto(BASE + '?limit=4')
    check(pg, 'start', results)
    pg.get_by_role('button', name='Los geht’s').click(); check(pg, 'login', results)
    pg.get_by_text('Für die Testleitung').click()
    pg.get_by_text('Ich bin einverstanden').click(); pg.get_by_role('button', name='Anmelden').click()
    check(pg, 'frage1', results)
    pg.get_by_text('Nein, ich esse alles').click(); pg.get_by_role('button', name='Weiter', exact=True).click()
    pg.get_by_text('Ja', exact=True).click()
    pg.get_by_role('button', name='Weitere anzeigen (7)').click()
    pg.get_by_role('button', name='Erdnüsse Keine Nuss').click()
    pg.get_by_label('Suchen').fill('mandel')
    pg.get_by_text('Ich bin mir nicht sicher').click()
    check(pg, 'frage2', results)
    pg.get_by_label('Suchen').fill('')
    pg.get_by_role('button', name='Nüsse Auswählen').click(); check(pg, 'frage2_sheet', results)
    pg.get_by_role('button', name='Abbrechen').click()
    pg.get_by_role('button', name='Weiter', exact=True).click()
    pg.get_by_text('Ja', exact=True).click()
    pg.get_by_role('button', name='Schweinefleisch').click()
    pg.get_by_label('Anderes Lebensmittel suchen').fill('Koriander')
    check(pg, 'frage3', results)
    pg.get_by_role('button', name='„Koriander“ als Notiz hinzufügen').click()
    pg.get_by_role('button', name='Zur Übersicht').click(); check(pg, 'zusammenfassung', results)
    pg.get_by_role('button', name='Stimmt so, weiter').click(); check(pg, 'tutorial', results)
    pg.get_by_role('button', name='Erste Karte zeigen').click(); check(pg, 'runde', results)
    # Reduced motion: Karte verlässt den Stapel ohne Animation
    trans = pg.evaluate("getComputedStyle(document.querySelector('.swipe-card')).transitionDuration + ' / ' + getComputedStyle(document.querySelector('.swipe-card-inner')).animationName")
    pg.get_by_role('button', name='Mag ich', exact=True).click()
    pg.wait_for_timeout(60)
    after = pg.locator('.round-count').inner_text()
    pg.get_by_role('button', name='Vertrage ich nicht').click(); pg.wait_for_timeout(300)
    if pg.locator('.sheet').count():
        check(pg, 'runde_sheet', results)
        pg.locator('.sheet .choice').nth(1).click(); pg.get_by_role('button', name='Übernehmen').click()
    check(pg, 'runde_bestaetigung', results)
    pg.get_by_role('button', name='Mag ich nicht').click(); pg.wait_for_timeout(150)
    pg.get_by_role('button', name='Mag ich sehr').click(); pg.wait_for_timeout(300)
    check(pg, 'zwischenstand', results)
    pg.goto(BASE + '?admin=1'); check(pg, 'admin', results)
    b.close()
    return results, errors, trans, after


if __name__ == "__main__":
  with sync_playwright() as p:
      for W, H in [(360, 640), (430, 932)]:
          results, errors, trans, after = run(p, W, H)
          print(f'=== {W}x{H}  Schrift {int(ZOOM*100)} %  | reduced motion: transition {trans}, nach 60 ms: {after}')
          for name, r in results.items():
              bad = {k: v for k, v in r.items() if v}
              print(f'  {name:20s}', 'OK' if not bad else json.dumps(bad, ensure_ascii=False)[:900])
          print('  errors:', errors)

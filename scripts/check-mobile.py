"""Misst die Mobile-Kriterien (Addendum A11) auf allen Bildschirmen des Prototyps.

Geprüft bei 360 x 640 und 430 x 932 auf allen Bildschirmen inkl. Registrierung (SMS simuliert),
Zusammenfassung mit „Ändern“, Bewertung, Allergien, Suche und Bestätigung in „Mein Profil“ und
„Willkommen zurück“:
  - kein horizontaler Scroll
  - Touch-Ziele >= 44 x 44 CSS-px
  - Textkontrast >= 4.5:1 (axe-core, Regel color-contrast)
  - Fliesstext >= 18 px (jeder sichtbare Text)
  - kein abgeschnittener Text (mit 130 % Schrift aufrufen)
  - prefers-reduced-motion: Karte ohne Übergang

Voraussetzungen: npm install, pip install playwright, python -m playwright install chromium
Aufruf (in einem zweiten Terminal läuft `npm run build && npm run preview`):
  python3 scripts/check-mobile.py          # 100 % Schrift
  python3 scripts/check-mobile.py 1.3      # 130 % Schrift
Optional als zweites Argument ein Ordner für Screenshots, z. B. `python3 scripts/check-mobile.py 1 shots`.
"""
import json
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:4173/'  # Adresse von npm run preview
AXE = (Path(__file__).resolve().parent.parent / 'node_modules' / 'axe-core' / 'axe.min.js').read_text(encoding='utf-8')
ZOOM = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
SHOTS = Path(sys.argv[2]) if len(sys.argv) > 2 else None

CHECK = r"""
() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('.sr-only') && !el.closest('[aria-hidden="true"]') && !el.closest('[inert]'); };
  const out = { hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, small: [], fonts: [], clipped: [] };
  // Touch-Ziele
  const targets = document.querySelectorAll('button, a[href], input:not([type=radio]):not([type=checkbox]), label.choice, summary, .tile');
  for (const el of targets) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) out.small.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  // Schriftgrösse aller sichtbaren Textknoten und abgeschnittener Text
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode; if (!node.textContent.trim()) continue;
    const el = node.parentElement; if (!el || !vis(el) || seen.has(el)) continue; seen.add(el);
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 17.95) out.fonts.push(`${el.tagName.toLowerCase()}.${el.className} "${node.textContent.trim().slice(0,25)}" ${size.toFixed(1)}px`);
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
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') out.clipped.push(`scrollWidth "${node.textContent.trim().slice(0,25)}"`);
  }
  return out;
}
"""


def contrast(pg):
    if not pg.evaluate('!!window.axe'):
        pg.add_script_tag(content=AXE)
    return pg.evaluate("""async () => { const r = await axe.run(document, { runOnly: ['color-contrast'] });
      return r.violations.flatMap(v => v.nodes.map(n => n.target.join(' ') + ' :: ' + (n.any[0]?.message || '').slice(0, 110))); }""")


def check(pg, name, results, W):
    pg.wait_for_timeout(450)
    if ZOOM != 1.0:
        pg.add_style_tag(content=f'html {{ font-size: calc(118.75% * {ZOOM}) !important; }}')
        pg.wait_for_timeout(300)
    r = pg.evaluate(CHECK)
    r['contrast'] = contrast(pg)
    results[name] = r
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
        pg.screenshot(path=str(SHOTS / f'{W}-{int(ZOOM * 100)}-{name}.png'))


def run(p, W, H):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=True, reduced_motion='reduce')
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    results = {}
    pg.goto(BASE + '?limit=4')
    check(pg, 'start', results, W)
    # Registrierung (SMS simuliert: Code aus der Mitteilung oben)
    pg.get_by_role('button', name='Los geht’s').click(); check(pg, 'reg_vorname', results, W)
    pg.get_by_label('Vorname').fill('Test')
    pg.get_by_role('button', name='Weiter', exact=True).click()
    pg.get_by_label('Handynummer').fill('044 123 45 67')
    pg.get_by_role('button', name='Code senden').click(); check(pg, 'reg_nummer_fehler', results, W)
    pg.get_by_label('Handynummer').fill('079 123 45 67')
    pg.get_by_role('button', name='Code senden').click()
    pg.wait_for_selector('.sms-banner')
    check(pg, 'reg_code_mitteilung', results, W)
    code = re.search(r'\d{6}', pg.locator('.sms-text').inner_text()).group(0)
    pg.get_by_label('Code aus der SMS').fill('000000' if code != '000000' else '111111')
    pg.wait_for_timeout(600); check(pg, 'reg_code_falsch', results, W)
    pg.get_by_label('Code aus der SMS').fill(code)
    pg.wait_for_selector('.screen-about'); check(pg, 'ueber_dich', results, W)
    pg.get_by_text('Für die Testleitung').click()
    pg.get_by_text('60 bis 69').click()
    pg.get_by_text('Ich bin einverstanden').click(); pg.get_by_role('button', name='Weiter', exact=True).click()
    check(pg, 'frage1', results, W)
    pg.get_by_text('Nein, ich esse alles').click(); pg.get_by_role('button', name='Weiter', exact=True).click()
    pg.get_by_text('Ja', exact=True).click()
    pg.get_by_role('button', name='Weitere anzeigen').click()
    pg.get_by_role('button', name='Soja').click()
    pg.get_by_label('Suchen').fill('rüebli')
    pg.get_by_text('Ich bin mir nicht sicher').click()
    check(pg, 'frage2', results, W)
    pg.get_by_label('Suchen').fill('')
    pg.get_by_role('button', name='Nüsse inkl. Erdnüsse').click(); check(pg, 'frage2_sheet', results, W)
    pg.get_by_role('button', name='Abbrechen').click()
    pg.get_by_role('button', name='Weiter', exact=True).click()
    pg.get_by_text('Ja', exact=True).click()
    pg.get_by_role('button', name='Schweinefleisch').click()
    pg.get_by_label('Anderes Lebensmittel suchen').fill('Koriander')
    check(pg, 'frage3', results, W)
    pg.locator('.add-entry').click()
    pg.get_by_label('Marken, die du meidest').fill('Marke X'); pg.keyboard.press('Enter')
    # Nach Frage 3 die Zusammenfassung (nurec v0.2, Kap. 2.2); „Ändern“ führt zur Frage und zurück.
    # Danach direkt die erste Karte (Tutorial standardmässig aus).
    pg.get_by_role('button', name='Weiter', exact=True).click(); check(pg, 'zusammenfassung', results, W)
    pg.get_by_role('button', name='Allergien und Unverträglichkeiten ändern').click(); check(pg, 'zusammenfassung_aendern', results, W)
    pg.get_by_role('button', name='Zurück zur Übersicht').click(); pg.wait_for_selector('.screen-summary')
    pg.get_by_role('button', name='Stimmt so').click(); check(pg, 'runde', results, W)
    # Reduced motion: Karte verlässt den Stapel ohne Animation
    trans = pg.evaluate("getComputedStyle(document.querySelector('.swipe-card')).transitionDuration + ' / ' + getComputedStyle(document.querySelector('.swipe-card-inner')).animationDuration")
    pg.get_by_role('button', name='Mag ich', exact=True).click()
    pg.wait_for_timeout(60)
    after = pg.locator('.progress-text').inner_text()
    pg.get_by_role('button', name='Vertrage ich nicht').click(); pg.wait_for_timeout(300)
    if pg.locator('.sheet').count():
        check(pg, 'runde_sheet', results, W)
        pg.locator('.sheet .choice').nth(1).click(); pg.get_by_role('button', name='Übernehmen').click()
    check(pg, 'runde_bestaetigung', results, W)
    pg.get_by_role('button', name='Mag ich nicht').click(); pg.wait_for_timeout(150)
    pg.get_by_role('button', name='Mag ich sehr').click(); pg.wait_for_timeout(300)
    check(pg, 'abschluss', results, W)
    pg.get_by_role('button', name='Mein Profil ansehen').click(); check(pg, 'profil', results, W)
    pg.locator('button.taste-row').first.click(); check(pg, 'profil_bewertung', results, W)
    pg.get_by_role('radio', name='Mag ich', exact=True).click(); pg.wait_for_timeout(200)
    pg.get_by_role('button', name='Ändern', exact=True).first.click(); check(pg, 'profil_allergien', results, W)
    pg.get_by_role('button', name='Abbrechen').click()
    pg.locator('.exclusion-section').nth(2).get_by_role('button', name='Hinzufügen').click()
    pg.get_by_label('Lebensmittel suchen').fill('Sahne'); check(pg, 'profil_suche', results, W)
    pg.locator('.search-hit').first.click(); pg.wait_for_timeout(200)
    pg.locator('.exclusion-section').first.get_by_role('button', name=re.compile('entfernen')).first.click()
    check(pg, 'profil_bestaetigen', results, W)
    pg.get_by_role('button', name='Abbrechen').click()
    pg.mouse.wheel(0, 4000); check(pg, 'profil_unten', results, W)
    pg.reload(); pg.wait_for_selector('.screen-welcome'); check(pg, 'willkommen_zurueck', results, W)
    pg.goto(BASE + '?admin=1'); check(pg, 'admin', results, W)
    b.close()
    return results, errors, trans, after


if __name__ == '__main__':
    with sync_playwright() as p:
        for W, H in [(360, 640), (430, 932)]:
            results, errors, trans, after = run(p, W, H)
            print(f'=== {W}x{H}  Schrift {int(ZOOM * 100)} %  | reduced motion: {trans}, nach 60 ms: {after}')
            for name, r in results.items():
                bad = {k: v for k, v in r.items() if v}
                print(f'  {name:20s}', 'OK' if not bad else json.dumps(bad, ensure_ascii=False)[:900])
            print('  errors:', errors)

"""Browserprüfung von Allergieauswahl, Profil und unveränderter Kartenbedienung.

Voraussetzungen wie check-mobile.py, parallel läuft npm run preview.
Aufruf: python scripts/check-profile.py
Optional GP_BROWSER_CHANNEL=chrome für einen bereits installierten Chrome.
Verwendet ausschliesslich ein isoliertes Browserprofil mit synthetischen Testdaten.
Screenshots landen im temporären Ordner geschmacksprofil-targeted.
"""

import json
import os
import runpy
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
checks = runpy.run_path(str(root / 'scripts' / 'check-mobile.py'))
CHECK, AXE = checks['CHECK'], checks['AXE']
BASE = 'http://127.0.0.1:4173/'
shots = Path(tempfile.gettempdir()) / 'geschmacksprofil-targeted'
shots.mkdir(exist_ok=True)

def saved(events=None, step=None):
    allergy = {'gate': 'yes', 'selected': ['fish'], 'items': [], 'notes': []}
    onboarding = {'diet': 'none', 'exclusions': [{'type': 'allergen', 'value': 'fish', 'source': 'onboarding', 'origin': 'intolerances'}], 'cardLabels': {}, 'freeTextNotes': []}
    state = {'screen': 'complete' if step is None else 'questions', 'tab': 'profile' if step is None else 'create', 'config': {'auth': False, 'roundFlow': 'test'}, 'person': {'consent': True, 'ageGroup': '60-69'}, 'onboarding': onboarding, 'step': step or 0, 'answers': {'diet': {'form': 'none', 'exclusions': [], 'rules': []}, 'intolerances': allergy, 'never': {'gate': 'no', 'selected': [], 'notes': []}}, 'events': events or [], 'roundNumber': 4}
    return {'version': 1, 'sessionId': 'browser-fixture', 'savedAt': '2026-10-24T10:00:00Z', 'state': state}

with sync_playwright() as p:
    b = p.chromium.launch(channel=os.environ.get('GP_BROWSER_CHANNEL') or None)
    failures = []
    for width, height, zoom in [(360, 640, 1), (430, 932, 1), (1280, 900, 1), (360, 640, 1.3)]:
        ctx = b.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
        pg = ctx.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        events = [{'cardId': card, 'response': response, 'round': 4 if card.startswith('D') else 1} for card, response in [('F01', 'LIKE'), ('F03', 'PREFER'), ('F05', 'DISLIKE'), ('F09', 'UNFAMILIAR'), ('D01', 'UNFAMILIAR'), ('D05', 'PREFER')]]
        def seed(data):
            # Zustand setzen, bevor die App startet; laufende React-Effekte dürfen ihn nicht überschreiben.
            seed_url = BASE + '__browser_seed__'
            pg.route(seed_url, lambda route: route.fulfill(body='<!doctype html><html></html>', content_type='text/html'), times=1)
            pg.goto(seed_url)
            pg.evaluate('(data) => { localStorage.clear(); localStorage.setItem("geschmacksprofil:app", JSON.stringify(data)); }', data)
            pg.goto(BASE)
            pg.locator('.screen-welcome').get_by_role('button', name='Weiter', exact=True).click()
            pg.wait_for_timeout(300)
            if zoom != 1:
                pg.add_style_tag(content=f'html {{ font-size: calc(118.75% * {zoom}) !important; }}')
        def audit(name):
            pg.wait_for_timeout(100)
            r = pg.evaluate(CHECK)
            if not pg.evaluate('!!window.axe'):
                pg.add_script_tag(content=AXE)
            r['accessibility'] = pg.evaluate('async () => (await axe.run(document, {runOnly: ["color-contrast", "button-name", "aria-valid-attr-value", "aria-valid-attr", "duplicate-id-aria"]})).violations.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)}))')
            bad = {k: v for k, v in r.items() if v}
            print(json.dumps({'width': width, 'zoom': zoom, 'screen': name, 'issues': bad}, ensure_ascii=False), flush=True)
            if bad:
                failures.append((width, zoom, name, bad))
        # Regression: Dashboard-Stile dürfen die Antwortleiste der Karten nie abschneiden.
        round_data = saved()
        round_data['state'].update(screen='round', tab='create', roundNumber=1)
        round_data['state']['onboarding']['exclusions'] = [
            {'type': 'animalOrigin', 'value': 'pork', 'source': 'onboarding', 'origin': 'diet'}
        ]
        for response in ['DISLIKE', 'PREFER', 'LIKE', 'UNFAMILIAR', 'INTOLERANT']:
            seed(round_data)
            pg.wait_for_selector('.screen-round')
            if response == 'DISLIKE':
                audit('round-controls')
                pg.screenshot(path=str(shots / f'{width}-{zoom}-round.png'))
            pg.locator(f'[data-answer="{response}"]').click(timeout=3000)
            if response == 'INTOLERANT':
                pg.locator('.sheet label.choice').first.click()
                pg.get_by_role('button', name='Übernehmen', exact=True).click()
            pg.wait_for_function(
                '(response) => JSON.parse(localStorage.getItem("geschmacksprofil:app")).state.events.some(event => event.response === response)',
                arg=response,
            )
            pg.locator('.screen-round .top-bar').get_by_role('button', name='Rückgängig', exact=True).click()
            pg.wait_for_function('JSON.parse(localStorage.getItem("geschmacksprofil:app")).state.events.at(-1)?.response === "UNDO"')
        seed(saved(events))
        assert pg.locator('.answer-total strong').inner_text() == '6'
        assert pg.locator('.profile-disclosure[open]').count() == 0
        assert pg.locator('.taste-row:visible').count() == 0
        audit('profile-closed')
        pg.screenshot(path=str(shots / f'{width}-{zoom}-profile.png'), full_page=True)
        summary = pg.locator('[aria-labelledby="group-answers-PREFER"] > summary')
        summary.focus()
        pg.keyboard.press('Enter')
        assert pg.locator('[aria-labelledby="group-answers-PREFER"][open]').count() == 1
        audit('profile-prefer-open')
        pg.locator('[aria-labelledby="group-answers-PREFER"] .taste-row').first.click()
        pg.get_by_role('radio', name='Eher gern', exact=True).click()
        assert pg.locator('[aria-labelledby="group-answers-PREFER"] .group-count').inner_text() == '1'
        assert pg.locator('[aria-labelledby="group-answers-LIKE"] .group-count').inner_text() == '2'
        summary.click()
        pg.locator('[aria-labelledby="group-answers-UNFAMILIAR"] > summary').click()
        assert pg.locator('[aria-labelledby="group-answers-UNFAMILIAR"] .taste-row:visible').count() == 2
        audit('profile-unknown-open')
        pg.locator('[aria-labelledby="group-answers-UNFAMILIAR"] > summary').click()
        pg.locator('[aria-labelledby="insights-title"] > summary').click()
        audit('profile-insights-open')
        pg.locator('.is-derived .taste-row').first.click()
        pg.get_by_role('radio').last.click()
        assert pg.locator('.answer-total strong').inner_text() == '7'
        pg.locator('[aria-labelledby="insights-title"] > summary').click()
        pg.locator('[aria-labelledby="exclusions-title"] > summary').click()
        audit('profile-exclusions-open')
        pg.locator('.exclusion-section').first.get_by_role('button', name='Ändern', exact=True).click()
        assert pg.locator('.allergen-picker .tile').count() == 6
        assert pg.locator('.sheet [aria-label="Fisch entfernen"]').count() == 1
        audit('profile-allergy-editor')
        pg.get_by_role('button', name='Abbrechen', exact=True).click()
        seed(saved([]))
        assert pg.locator('.answer-total strong').inner_text() == '0'
        audit('profile-empty')
        seed(saved(step=1))
        assert pg.locator('.allergen-picker .tile').count() == 6
        assert pg.locator('.allergen-picker .more-button').count() == 0
        audit('question-allergies')
        pg.screenshot(path=str(shots / f'{width}-{zoom}-allergies.png'), full_page=True)
        search = pg.get_by_label('Weitere Allergien oder Lebensmittel suchen')
        search.fill('Fisch')
        assert pg.locator('.search-hit').first.get_attribute('aria-pressed') == 'true'
        search.fill('Sellerie')
        pg.locator('.search-hit').first.click()
        pg.get_by_role('button', name='Weiter', exact=True).click()
        pg.get_by_role('button', name='Zurück', exact=True).click()
        assert pg.locator('[aria-label="Sellerie entfernen"]').count() == 1
        pg.reload()
        pg.get_by_role('button', name='Weiter', exact=True).click()
        assert pg.locator('[aria-label="Sellerie entfernen"]').count() == 1
        search = pg.get_by_label('Weitere Allergien oder Lebensmittel suchen')
        search.fill('Omas Spezialsauce')
        pg.locator('.add-entry').click()
        assert pg.get_by_text('Nicht eindeutig zugeordnet', exact=False).count() >= 1
        audit('question-free-note')
        assert not errors, errors
        ctx.close()
    b.close()
    assert not failures, failures

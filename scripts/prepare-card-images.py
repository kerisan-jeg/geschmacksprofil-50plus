"""Bilder für die Karten vorbereiten (Addendum A15 und A16, 21.10.2026).

Jede Karte zeigt ein Bild aus public/cards/{cardId}.webp: Seitenverhältnis 4:3, höchstens 1200 px breit,
höchstens 150 KB. Der Eintrag image steht im Katalog (src/data/catalog.json):
  { src, alt, source: "ai-gemini" | "stock" | "own", license?, credit?, shows?, foods? }
credit verweist auf den Bildnachweis in src/data/image-credits.json (Unsplash), shows und foods sagen, was zu sehen
ist (damit ein Bild nie Ausgeschlossenes zeigt). Gruppen (Stufe 1) bekommen kein Bild: Sie zeigen nach dem
Teamentscheid vom 20.10.2026 das neutrale Symbol.

Seit A16 stammen alle Kartenbilder aus öffentlichen Quellen (Unsplash, Unsplash License). Jedes Foto hat einen
Nachweis in image-credits.json (Fotograf, Link, APA 7) und nennt nach dem tatsächlichen Bildinhalt, was zu sehen ist
(shows, foods); unsichere Inhalte stehen als todo dort und auf der Prüfseite. Fotos ohne lokales Original
(public/images) lädt der Befehl stock über imageUrl von images.unsplash.com.

Voraussetzung: pip install pillow

  python scripts/prepare-card-images.py stock [id ...]    Unsplash-Fotos ins A15-Format bringen (lokal oder über imageUrl);
                                                          mit Karten-IDs nur diese
  python scripts/prepare-card-images.py groups [id ...]            Gruppenbilder aus je drei Fotos (groupImages in image-credits.json)
  python scripts/prepare-card-images.py check             alle Bilder prüfen (Datei, 4:3, Breite, Grösse, alt-Text)
  python scripts/prepare-card-images.py review            Prüfseite docs/bilder-review.html neu erzeugen (nur lokal)
Nicht mehr benötigt seit A16 (bleibt für den Fall, dass doch KI-Bilder kommen):
  python scripts/prepare-card-images.py prompts           Prompts für alle Karten ohne Bild (aus card-image-prompts.json)
  python scripts/prepare-card-images.py gemini <ordner>   Gemini-Bilder übernehmen; Dateinamen {cardId}.png, .jpg oder .webp
                [--license "Hinweis"]                     optional: Nutzungshinweis, der im Eintrag gespeichert wird
"""

import html
import io
import json
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'src' / 'data' / 'catalog.json'
CREDITS = ROOT / 'src' / 'data' / 'image-credits.json'
PROMPTS = ROOT / 'src' / 'data' / 'card-image-prompts.json'
CARDS_DIR = ROOT / 'public' / 'cards'
REVIEW = ROOT / 'docs' / 'bilder-review.html'
CACHE = Path(tempfile.gettempdir()) / 'geschmacksprofil-card-images'
MAX_WIDTH = 1200
MAX_BYTES = 150 * 1024
RATIO = (4, 3)
SOURCES = ('ai-gemini', 'stock', 'own')


# ---------- Katalog lesen und schreiben (eine Karte pro Zeile, wie bisher) ----------

def dump_catalog(data):
    lines = ['{']
    for key in [key for key in data if key != 'cards']:
        lines.append(f'  {json.dumps(key)}: {json.dumps(data[key], ensure_ascii=False, indent=2).replace(chr(10), chr(10) + "  ")},')
    lines.append('  "cards": [')
    lines.append(',\n'.join('    ' + json.dumps(card, ensure_ascii=False, separators=(',', ':')) for card in data['cards']))
    lines.append('  ]')
    lines.append('}')
    return '\n'.join(lines) + '\n'


def load_catalog():
    text = CATALOG.read_text(encoding='utf-8')
    data = json.loads(text)
    if dump_catalog(data) != text.replace('\r\n', '\n'):
        sys.exit('catalog.json hat ein unerwartetes Format; abgebrochen, damit nichts umformatiert wird.')
    return data


def save_catalog(data):
    CATALOG.write_text(dump_catalog(data), encoding='utf-8', newline='\n')


# ---------- Bild umwandeln ----------

def crop_to(image, ratio, focus=(0.5, 0.5)):
    """Auf das Seitenverhältnis ratio = (Breite, Höhe) zuschneiden, um den Fokuspunkt herum."""
    width, height = image.size
    if width * ratio[1] > height * ratio[0]:
        new_width = round(height * ratio[0] / ratio[1])
        left = min(max(0, round(width * focus[0] - new_width / 2)), width - new_width)
        return image.crop((left, 0, left + new_width, height))
    if width * ratio[1] < height * ratio[0]:
        new_height = round(width * ratio[1] / ratio[0])
        top = min(max(0, round(height * focus[1] - new_height / 2)), height - new_height)
        return image.crop((0, top, width, top + new_height))
    return image


def to_webp(source, target, focus=(0.5, 0.5)):
    from PIL import Image  # pip install pillow

    image = crop_to(Image.open(source).convert('RGB'), RATIO, focus)
    return save_webp(image, target, source)


PART_WIDTHS = (800, 720, 640)  # Teilbilder der Gruppen: kleiner, erscheinen nur im Raster


def save_webp(image, target, name, widths=(MAX_WIDTH, 1080, 960, 840, 720)):
    from PIL import Image  # pip install pillow

    # Höchstens 1200 px breit. Sehr feine Motive (z. B. Bulgur) werden zuerst mit tieferer Qualität, dann schmaler gespeichert.
    for width in widths:
        scaled = image.resize((width, round(width * RATIO[1] / RATIO[0])), Image.LANCZOS) if image.width > width else image
        for quality in range(86, 49, -4):
            buffer = io.BytesIO()
            scaled.save(buffer, 'WEBP', quality=quality, method=6)
            if buffer.tell() <= MAX_BYTES:
                break
        if buffer.tell() <= MAX_BYTES:
            image = scaled
            break
    else:
        sys.exit(f'{name}: auch kleiner und mit tiefer Qualität grösser als 150 KB')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(buffer.getvalue())
    return image.width, image.height, buffer.tell(), quality


def original(photo):
    """Lokales Original (public/images) oder heruntergeladen über imageUrl (A16), zwischengespeichert im Temp-Ordner."""
    if photo.get('file'):
        return ROOT / 'public' / 'images' / photo['file']
    CACHE.mkdir(parents=True, exist_ok=True)
    target = CACHE / f"{photo['photoId']}.jpg"
    if not target.exists():
        url = photo['imageUrl']
        url += ('&' if '?' in url else '?') + 'w=1600&q=85&fm=jpg'
        request = urllib.request.Request(url, headers={'User-Agent': 'geschmacksprofil-50plus prepare-card-images'})
        with urllib.request.urlopen(request, timeout=60) as response:
            target.write_bytes(response.read())
        time.sleep(0.5)
    return target


GAP = 6  # Abstand zwischen den drei Fotos eines Gruppenbilds (weiss)


def command_groups(only=None):
    """Gruppenbilder: je drei Fotos aus groupImages (image-credits.json), wie das frühere Bildraster zusammengesetzt:
    das erste gross links (Breite 1.2 : 1), die anderen zwei rechts übereinander. 4:3, WebP unter 150 KB.
    Dazu je Foto ein Teilbild (cards/parts/{Gruppe}-{n}.webp): Zeigt ein Teil Ausgeschlossenes, setzt die App das Bild
    aus den erlaubten Teilen zusammen."""
    from PIL import Image  # pip install pillow

    credits = json.loads(CREDITS.read_text(encoding='utf-8'))
    photos = {photo['key']: photo for photo in credits['photos']}
    groups = {key: value for key, value in credits.get('groupImages', {}).items() if key != 'note'}
    data = load_catalog()
    width, height = MAX_WIDTH, MAX_WIDTH * RATIO[1] // RATIO[0]
    left_width = round((width - GAP) * 1.2 / 2.2)
    right_width = width - GAP - left_width
    half = (height - GAP) // 2
    cells = [(0, 0, left_width, height), (left_width + GAP, 0, right_width, half), (left_width + GAP, half + GAP, right_width, height - half - GAP)]
    for card in data['cards']:
        group = groups.get(card['id'])
        if not group or (only and card['id'] not in only):
            continue
        canvas = Image.new('RGB', (width, height), 'white')
        for key, (x, y, w, h) in zip(group['photos'], cells):
            photo = photos[key]
            image = Image.open(original(photo)).convert('RGB')
            image = crop_to(image, (w, h), (photo.get('focusX', 0.5), photo.get('focusY', 0.5)))
            canvas.paste(image.resize((w, h), Image.LANCZOS), (x, y))
        size = save_webp(canvas, CARDS_DIR / f"{card['id']}.webp", card['id'])
        parts = []
        for number, part in enumerate(group['parts'], start=1):
            photo = photos[part['photo']]
            image = crop_to(Image.open(original(photo)).convert('RGB'), RATIO, (photo.get('focusX', 0.5), photo.get('focusY', 0.5)))
            src = f"cards/parts/{card['id']}-{number}.webp"
            save_webp(image, ROOT / 'public' / src, src, PART_WIDTHS)
            parts.append({'src': src, 'alt': photo['title'].strip('[]'), 'shows': part['shows'], 'foods': part['foods']})
        card['image'] = entry(card['id'], alt=group['alt'], source='stock', license='Unsplash License', credit=group['photos'],
                              shows=group['shows'], foods=group['foods'], todo=group.get('todo'), parts=parts)
        print(f"{card['id']}: {size[0]}×{size[1]}, {size[2] // 1024} KB (Qualität {size[3]})")
    save_catalog(data)


def entry(card_id, **fields):
    return {'src': f'cards/{card_id}.webp', **{key: value for key, value in fields.items() if value is not None}}


# ---------- Befehle ----------

def command_stock(only=None):
    """Unsplash-Fotos der Untergruppen und der Lebensmittel, die genau dieses Foto zeigen (cardPhotos).
    only: nur diese Karten-IDs neu erzeugen (sonst alle)."""
    credits = json.loads(CREDITS.read_text(encoding='utf-8'))
    by_key = {photo['key']: photo for photo in credits['photos']}
    targets = {photo['cardId']: photo for photo in credits['photos'] if photo.get('cardId')}
    targets.update({card_id: by_key[key] for card_id, key in credits.get('cardPhotos', {}).items()})
    data = load_catalog()
    for card in data['cards']:
        photo = targets.get(card['id'])
        if not photo or (only and card['id'] not in only):
            continue
        size = to_webp(original(photo), CARDS_DIR / f"{card['id']}.webp", (photo.get('focusX', 0.5), photo.get('focusY', 0.5)))
        card['image'] = entry(card['id'], alt=photo['title'].strip('[]'), source='stock', license=photo['license'], credit=photo['key'],
                              shows=photo['shows'], foods=photo['foods'], todo=photo.get('todo'))
        print(f"{card['id']}: {size[0]}×{size[1]}, {size[2] // 1024} KB (Qualität {size[3]})")
    save_catalog(data)


def command_gemini(folder, license_text=None):
    prompts = {entry_['cardId']: entry_ for entry_ in json.loads(PROMPTS.read_text(encoding='utf-8'))['prompts']}
    data = load_catalog()
    cards = {card['id']: card for card in data['cards']}
    files = {path.stem: path for path in Path(folder).iterdir() if path.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp')}
    for stem, path in sorted(files.items()):
        card = cards.get(stem)
        if not card:
            print(f'{path.name}: keine Karte mit dieser ID, übersprungen')
            continue
        if card['stage'] == 1:
            print(f'{path.name}: Gruppe, zeigt das neutrale Symbol (Teamentscheid 20.10.2026), übersprungen')
            continue
        prompt = prompts.get(stem)
        if not prompt:
            print(f'{path.name}: kein Eintrag in card-image-prompts.json (alt-Text fehlt), übersprungen')
            continue
        size = to_webp(path, CARDS_DIR / f'{stem}.webp')
        card['image'] = entry(stem, alt=prompt['alt'], source='ai-gemini', license=license_text, shows=prompt['shows'], foods=prompt['foods'])
        print(f'{stem}: {size[0]}×{size[1]}, {size[2] // 1024} KB (Qualität {size[3]})')
    save_catalog(data)
    command_prompts(only_count=True)


def command_prompts(only_count=False):
    data = load_catalog()
    without = {card['id'] for card in data['cards'] if card['stage'] > 1 and not card.get('image')}
    open_prompts = [entry_ for entry_ in json.loads(PROMPTS.read_text(encoding='utf-8'))['prompts'] if entry_['cardId'] in without]
    if not only_count:
        for entry_ in open_prompts:
            print(f"{entry_['cardId']}\t{entry_['title']}\n{entry_['prompt']}\n")
    print(f'{len(open_prompts)} Karten ohne Bild')


def command_check():
    from PIL import Image  # pip install pillow

    problems = []
    for card in load_catalog()['cards']:
        image = card.get('image')
        if not image:
            continue
        name = card['id']
        if image.get('src') != f'cards/{name}.webp':
            problems.append(f'{name}: src {image.get("src")}')
        if not image.get('alt', '').strip():
            problems.append(f'{name}: alt-Text fehlt')
        if image.get('source') not in SOURCES:
            problems.append(f'{name}: source {image.get("source")}')
        for src in [image.get('src', '')] + [part.get('src', '') for part in image.get('parts', [])]:
            path = ROOT / 'public' / src
            if not path.is_file():
                problems.append(f'{name}: Datei {src} fehlt')
                continue
            with Image.open(path) as opened:
                width, height = opened.size
                kind = opened.format
            if kind != 'WEBP' or width > MAX_WIDTH or width * RATIO[1] != height * RATIO[0] or path.stat().st_size > MAX_BYTES:
                problems.append(f'{name}: {src} {kind} {width}×{height}, {path.stat().st_size // 1024} KB')
    print('\n'.join(problems) if problems else 'Alle Bilder in Ordnung.')
    sys.exit(1 if problems else 0)


# ---------- Prüfseite (A16, nur lokal, nicht in der App verlinkt) ----------

PLATE = ('<svg viewBox="0 0 240 150" class="plate"><circle cx="120" cy="75" r="50"/><circle cx="120" cy="75" r="34" opacity="0.55"/>'
         '<path d="M44 32v30a8 8 0 0 0 8 8h0a8 8 0 0 0 8-8V32 M52 32v26 M52 70v50"/><path d="M196 120V32c-10 6-14 18-14 30v14a6 6 0 0 0 6 6h8"/></svg>')


def command_review():
    data = load_catalog()
    credits = json.loads(CREDITS.read_text(encoding='utf-8'))
    photos = {photo['key']: photo for photo in credits['photos']}
    missing = {entry_['cardId']: entry_ for entry_ in credits.get('withoutPhoto', [])}
    titles = {card['id']: card['title'] for card in data['cards']}
    stages = {1: 'Gruppe', 2: 'Untergruppe', 3: 'Lebensmittel', 4: 'Gericht'}
    esc = html.escape
    tiles, todos = [], []
    for card in data['cards']:
        image = card.get('image')
        credit = (image or {}).get('credit')
        used = [photos[key] for key in (credit if isinstance(credit, list) else [credit]) if key in photos]
        if card['stage'] == 1 and not image:
            art, kind = PLATE, 'plate'
        elif image:
            art, kind = f'<img src="../public/{esc(image["src"])}" alt="{esc(image["alt"])}" loading="lazy">', 'image'
        else:
            reason = missing.get(card['id'], {}).get('reason', 'ohne passendes Bild')
            art, kind = f'<div class="missing"><strong>{esc(card["title"])}</strong><span>ohne passendes Bild</span><small>{esc(reason)}</small></div>', 'none'
        rows = [f'<dt>ID</dt><dd>{esc(card["id"])} · {stages[card["stage"]]}</dd>']
        if image:
            rows.append(f'<dt>alt</dt><dd>{esc(image["alt"])}</dd>')
            rows.append('<dt>shows</dt><dd>' + ', '.join(f'{esc(i)} {esc(titles.get(i, "?"))}' for i in image.get('shows', [])) + '</dd>')
            rows.append(f'<dt>foods</dt><dd>{esc(", ".join(image.get("foods", [])))}</dd>')
            source = f'{esc(image["source"])}, {esc(image.get("license", ""))}'
            if used:
                source += ' · ' + ', '.join(f'<a href="{esc(photo["url"])}">{esc(photo["photographer"])}</a>' for photo in used)
            rows.append(f'<dt>Quelle</dt><dd>{source}</dd>')
        todo = (image or {}).get('todo')
        if todo:
            rows.append(f'<dt>TODO</dt><dd class="todo">{esc(todo)}</dd>')
            todos.append(f'<li><a href="#{esc(card["id"])}">{esc(card["id"])} {esc(card["title"])}</a>: {esc(todo)}</li>')
        tiles.append(f'<article id="{esc(card["id"])}" class="tile kind-{kind}{" has-todo" if todo else ""}"><div class="art">{art}</div>'
                     f'<h2>{esc(card["title"])}</h2><dl>{"".join(rows)}</dl></article>')
    counts = {
        'gesamt': len(data['cards']),
        'mit Bild': sum(1 for card in data['cards'] if card.get('image')),
        'Teller (Gruppen ohne Bild)': sum(1 for card in data['cards'] if card['stage'] == 1 and not card.get('image')),
        'ohne passendes Bild': sum(1 for card in data['cards'] if card['stage'] > 1 and not card.get('image')),
    }
    none_list = ''.join(f'<li><a href="#{esc(card_id)}">{esc(card_id)} {esc(titles.get(card_id, ""))}</a>: {esc(entry_.get("reason", ""))}</li>'
                        for card_id, entry_ in missing.items())
    page = f"""<!doctype html>
<html lang="de-CH"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bilder-Prüfung</title>
<style>
body {{ margin: 0; padding: 24px 16px 48px; background: #f6f2ea; color: #1c2620; font: 16px/1.4 system-ui, sans-serif; }}
h1 {{ margin: 0 0 4px; font-size: 28px; }} .lead {{ margin: 0 0 16px; max-width: 70ch; }}
.counts {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; padding: 0; list-style: none; }}
.counts li {{ padding: 6px 12px; border-radius: 99px; background: #fff; font-weight: 600; }}
.lists {{ display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); margin-bottom: 24px; }}
.lists section {{ background: #fff; border-radius: 12px; padding: 12px 16px; }} .lists h2 {{ font-size: 18px; margin: 0 0 8px; }}
.filter {{ display: flex; gap: 8px; margin: 0 0 16px; }} .filter button {{ font: inherit; padding: 6px 12px; border-radius: 8px; border: 1px solid #b8b0a2; background: #fff; cursor: pointer; }}
.grid {{ display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }}
.tile {{ background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }}
.tile.has-todo {{ outline: 3px solid #c2410c; }} .tile:target {{ outline: 3px solid #1f4d3a; }}
.art {{ aspect-ratio: 4 / 3; background: #ece6da; display: grid; place-items: center; }}
.art img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
.plate {{ width: 60%; fill: none; stroke: #545e58; stroke-width: 5; stroke-linecap: round; }}
.missing {{ display: grid; gap: 4px; text-align: center; padding: 12px; }} .missing span {{ color: #c2410c; font-weight: 700; }}
.tile h2 {{ margin: 10px 12px 4px; font-size: 18px; }} dl {{ margin: 0 12px 12px; display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 14px; }}
dt {{ color: #545e58; }} dd {{ margin: 0; }} .todo {{ color: #c2410c; font-weight: 700; }}
body.only-todo .tile:not(.has-todo), body.only-none .tile:not(.kind-none) {{ display: none; }}
</style></head><body>
<h1>Bilder-Prüfung</h1>
<p class="lead">Alle Karten mit Bild, Karten-ID, Name, shows, foods, Quelle und TODOs (Addendum A16). Nur lokal für das Team,
nicht in der App verlinkt. Neu erzeugen mit <code>python scripts/prepare-card-images.py review</code>.</p>
<ul class="counts">{''.join(f'<li>{esc(label)}: {value}</li>' for label, value in counts.items())}</ul>
<div class="lists">
<section><h2>Prüfliste (TODO zu shows/foods)</h2><ul>{''.join(todos) or '<li>keine</li>'}</ul></section>
<section><h2>Ohne passendes Bild</h2><ul>{none_list or '<li>keine</li>'}</ul></section>
</div>
<div class="filter"><button type="button" onclick="document.body.className=''">Alle</button>
<button type="button" onclick="document.body.className='only-todo'">Nur TODO</button>
<button type="button" onclick="document.body.className='only-none'">Nur ohne Bild</button></div>
<main class="grid">{''.join(tiles)}</main>
</body></html>
"""
    REVIEW.write_text(page, encoding='utf-8', newline='\n')
    print(f'{REVIEW} geschrieben: ' + ', '.join(f'{label} {value}' for label, value in counts.items()))


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args[0] == 'stock':
        command_stock(set(args[1:]) or None)
    elif args[0] == 'gemini' and len(args) >= 2:
        license_text = args[args.index('--license') + 1] if '--license' in args else None
        command_gemini(args[1], license_text)
    elif args[0] == 'prompts':
        command_prompts()
    elif args[0] == 'groups':
        command_groups(set(args[1:]) or None)
    elif args[0] == 'check':
        command_check()
    elif args[0] == 'review':
        command_review()
    else:
        sys.exit(__doc__)

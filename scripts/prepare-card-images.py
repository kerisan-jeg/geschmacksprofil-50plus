"""Bilder für die Karten vorbereiten (Addendum A15, 21.10.2026).

Jede Karte zeigt ein Bild aus public/cards/{cardId}.webp: Seitenverhältnis 4:3, höchstens 1200 px breit,
höchstens 150 KB. Der Eintrag image steht im Katalog (src/data/catalog.json):
  { src, alt, source: "ai-gemini" | "stock" | "own", license?, credit?, shows?, foods? }
credit verweist auf den Bildnachweis in src/data/image-credits.json (Unsplash), shows und foods sagen, was zu sehen
ist (damit ein Bild nie Ausgeschlossenes zeigt). Gruppen (Stufe 1) bekommen kein Bild: Sie zeigen nach dem
Teamentscheid vom 20.10.2026 das neutrale Symbol.

Voraussetzung: pip install pillow

  python scripts/prepare-card-images.py prompts           Prompts für alle Karten ohne Bild (aus card-image-prompts.json)
  python scripts/prepare-card-images.py gemini <ordner>   Gemini-Bilder übernehmen; Dateinamen {cardId}.png, .jpg oder .webp
                [--license "Hinweis"]                     optional: Nutzungshinweis, der im Eintrag gespeichert wird
  python scripts/prepare-card-images.py stock             Unsplash-Fotos aus public/images übernehmen (einmalig gemacht)
  python scripts/prepare-card-images.py check             alle Bilder prüfen (Datei, 4:3, Breite, Grösse, alt-Text)
"""

import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'src' / 'data' / 'catalog.json'
CREDITS = ROOT / 'src' / 'data' / 'image-credits.json'
PROMPTS = ROOT / 'src' / 'data' / 'card-image-prompts.json'
CARDS_DIR = ROOT / 'public' / 'cards'
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

def to_webp(source, target, focus=(0.5, 0.5)):
    from PIL import Image  # pip install pillow

    image = Image.open(source)
    image = image.convert('RGB')
    width, height = image.size
    # Auf 4:3 zuschneiden, um den Fokuspunkt herum
    if width * RATIO[1] > height * RATIO[0]:
        new_width = round(height * RATIO[0] / RATIO[1])
        left = min(max(0, round(width * focus[0] - new_width / 2)), width - new_width)
        image = image.crop((left, 0, left + new_width, height))
    elif width * RATIO[1] < height * RATIO[0]:
        new_height = round(width * RATIO[1] / RATIO[0])
        top = min(max(0, round(height * focus[1] - new_height / 2)), height - new_height)
        image = image.crop((0, top, width, top + new_height))
    if image.width > MAX_WIDTH:
        image = image.resize((MAX_WIDTH, round(MAX_WIDTH * RATIO[1] / RATIO[0])), Image.LANCZOS)
    for quality in range(86, 29, -4):
        buffer = io.BytesIO()
        image.save(buffer, 'WEBP', quality=quality, method=6)
        if buffer.tell() <= MAX_BYTES:
            break
    else:
        sys.exit(f'{source}: auch mit tiefer Qualität grösser als 150 KB')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(buffer.getvalue())
    return image.width, image.height, buffer.tell(), quality


def entry(card_id, **fields):
    return {'src': f'cards/{card_id}.webp', **{key: value for key, value in fields.items() if value is not None}}


# ---------- Befehle ----------

def command_stock():
    """Unsplash-Fotos der Untergruppen und der Lebensmittel, die genau dieses Foto zeigen (cardPhotos)."""
    credits = json.loads(CREDITS.read_text(encoding='utf-8'))
    by_key = {photo['key']: photo for photo in credits['photos']}
    targets = {photo['cardId']: photo for photo in credits['photos'] if photo.get('cardId')}
    targets.update({card_id: by_key[key] for card_id, key in credits.get('cardPhotos', {}).items()})
    data = load_catalog()
    for card in data['cards']:
        photo = targets.get(card['id'])
        if not photo:
            continue
        size = to_webp(ROOT / 'public' / 'images' / photo['file'], CARDS_DIR / f"{card['id']}.webp", (photo.get('focusX', 0.5), photo.get('focusY', 0.5)))
        card['image'] = entry(card['id'], alt=photo['title'].strip('[]'), source='stock', license=photo['license'], credit=photo['key'], shows=photo['shows'], foods=photo['foods'])
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
        path = ROOT / 'public' / image.get('src', '')
        if not path.is_file():
            problems.append(f'{name}: Datei fehlt')
            continue
        with Image.open(path) as opened:
            width, height = opened.size
            kind = opened.format
        if kind != 'WEBP' or width > MAX_WIDTH or width * RATIO[1] != height * RATIO[0] or path.stat().st_size > MAX_BYTES:
            problems.append(f'{name}: {kind} {width}×{height}, {path.stat().st_size // 1024} KB')
    print('\n'.join(problems) if problems else 'Alle Bilder in Ordnung.')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args[0] == 'stock':
        command_stock()
    elif args[0] == 'gemini' and len(args) >= 2:
        license_text = args[args.index('--license') + 1] if '--license' in args else None
        command_gemini(args[1], license_text)
    elif args[0] == 'prompts':
        command_prompts()
    elif args[0] == 'check':
        command_check()
    else:
        sys.exit(__doc__)

#!/usr/bin/env python3
"""
Renomme "coins" -> "gogold"/"GoGold" dans tout stream_web (React + TypeScript).

Contrairement au premier script mobile (qui masquait les cles API tant que le
backend n'etait pas renomme), ICI ON RENOMME TOUT : le backend expose deja les
nouveaux noms (gogold_balance, entry_price_gogold, monetization_gogold,
discriminant 'gogold', endpoint /access/gogold, code d'erreur
insufficient_gogold, event WS gogold_transfer_received). Le web doit matcher
ce contrat exactement.

Usage:
    python scripts/rename_coins_to_gogold.py            # dry-run (affiche le diff)
    python scripts/rename_coins_to_gogold.py --apply     # applique reellement

Strategie identique au script stream_backend : chaque ligne est decoupee en
segments "code" / "chaine litterale" (guillemets simples/doubles/template).
  - CODE (hors chaines) : tout identifiant JS/TS complet (snake_case,
    camelCase, CONSTANTE, PascalCase) contenant coin(s)/COIN(S)/Coin(s) est
    renomme selon sa forme.
  - CHAINES : litteral exact 'coins'/"coins" (discriminant, code d'erreur,
    event WS) traite en priorite ; texte libre restant coins/Coins/COINS ->
    GoGold/GoGold/GOGOLD invariable.
  - Renomme aussi le fichier src/utils/coins.ts -> src/utils/gogold.ts.
"""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

EXCLUDE_DIRS = {"node_modules", "dist", "build", ".git"}

# Faux positifs "coin" = angle d'ecran, releves manuellement — jamais touches.
EXCLUDE_LINE_SUBSTRINGS = [
    "coin haut-gauche",
    "coin bas-gauche",
]


def iter_source_files():
    for ext in ("*.ts", "*.tsx"):
        for path in SRC.rglob(ext):
            if any(part in EXCLUDE_DIRS for part in path.parts):
                continue
            yield path


# ---------------------------------------------------------------------------
# Renommage d'identifiant complet (mot JS/TS entier), toutes formes.
# ---------------------------------------------------------------------------
_IDENTIFIER_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")


def _rename_code_identifier(word: str) -> str | None:
    lower = word.lower()
    if "coin" not in lower:
        return None

    if "_" in word:
        parts = word.split("_")
        changed = False
        new_parts = []
        for p in parts:
            if p in ("coin", "coins"):
                new_parts.append("gogold")
                changed = True
            elif p in ("COIN", "COINS"):
                new_parts.append("GOGOLD")
                changed = True
            elif p in ("Coin", "Coins"):
                new_parts.append("GoGold")
                changed = True
            else:
                new_parts.append(p)
        return "_".join(new_parts) if changed else None

    if word in ("coin", "coins"):
        return "gogold"
    if word in ("COIN", "COINS"):
        return "GOGOLD"
    if word in ("Coin", "Coins"):
        return "GoGold"

    # camelCase / PascalCase sans underscore : coin(s)/Coin(s) en prefixe/milieu/suffixe
    if re.search(r"[a-z]", word) and re.search(r"[A-Z]", word):
        def sub_camel(m):
            return "goGold" if m.group(0)[0].islower() else "GoGold"
        new_word, n = re.subn(r"[Cc]oins?", sub_camel, word)
        if n:
            return new_word

    # tout-minuscule colle sans underscore, ex: "coinstoeur" (improbable) -> ignore
    return None


def replace_code_identifiers(code: str) -> tuple[str, int]:
    count = 0

    def sub(m):
        nonlocal count
        word = m.group(0)
        new_word = _rename_code_identifier(word)
        if new_word is None:
            return word
        count += 1
        return new_word

    code = _IDENTIFIER_RE.sub(sub, code)
    return code, count


# ---------------------------------------------------------------------------
# Chaines litterales : 'coins'/"coins" (discriminant/event/erreur) + texte UI.
# ---------------------------------------------------------------------------
_STRING_SPLIT_RE = re.compile(
    r"('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|`(?:[^`\\]|\\.)*`)"
)
_TEMPLATE_INTERP_RE = re.compile(r"\$\{[^{}]*\}")
_BARE_SNAKE_LITERAL_RE = re.compile(r"^(['\"])([a-zA-Z_][a-zA-Z0-9_]*)\1$")

LITERAL_EXACT_MAP = {
    "coins": "gogold",
    "coin_transfer_received": "gogold_transfer_received",
    "insufficient_coins": "insufficient_gogold",
}


def _replace_ui_text(s: str) -> tuple[str, int]:
    """Texte libre (JSX, messages) contenant coin(s) -> GoGold/GoGold/GOGOLD invariable."""
    count = 0

    def sub(m):
        nonlocal count
        word = m.group(0)
        if "_" in word:
            new_word = _rename_code_identifier(word)
            if new_word is not None:
                count += 1
                return new_word
            return word
        if word.lower() in ("coin", "coins"):
            count += 1
            return "GOGOLD" if word.isupper() else "GoGold"
        return word

    s = _IDENTIFIER_RE.sub(sub, s)
    return s, count


def replace_string_content(s: str) -> tuple[str, int]:
    """s = chaine litterale AVEC ses delimiteurs (', ", ou `)."""
    count = 0
    quote = s[0]

    if quote in ("'", '"'):
        m = _BARE_SNAKE_LITERAL_RE.match(s)
        if m:
            q, word = m.group(1), m.group(2)
            mapped = LITERAL_EXACT_MAP.get(word)
            if mapped:
                return f"{q}{mapped}{q}", 1
            new_word = _rename_code_identifier(word)
            if new_word is not None:
                return f"{q}{new_word}{q}", 1
            return s, 0

        new_s, n = re.subn(r"\binsufficient_coins\b", "insufficient_gogold", s)
        count += n
        s = new_s
        new_s, n = re.subn(r"/access/coins\b", "/access/gogold", s)
        count += n
        s = new_s
        s, n = _replace_ui_text(s)
        count += n
        return s, count

    # template string (`...`) : traiter les interpolations ${...} comme du code,
    # le reste comme texte UI libre.
    def sub_interp(m):
        nonlocal count
        inner, n_inner = replace_code_identifiers(m.group(0)[2:-1])
        count += n_inner
        return "${" + inner + "}"

    s = _TEMPLATE_INTERP_RE.sub(sub_interp, s)
    new_s, n = re.subn(r"/access/coins\b", "/access/gogold", s)
    count += n
    s = new_s
    s, n = _replace_ui_text(s)
    count += n
    return s, count


# Texte JSX brut entre balises : >texte< , y compris apres une expression {..}
# (ex: >{fmtCoins(x)} coins<) — {} elles-memes restent du JS, traitees a part.
_JSX_TEXT_RE = re.compile(r"(?<=[>}])[^<>{}]*(?=[<{])")


def _replace_jsx_and_code(seg: str) -> tuple[str, int]:
    count = 0

    def sub_jsx(m):
        nonlocal count
        new_text, n = _replace_ui_text(m.group(0))
        count += n
        return new_text

    seg = _JSX_TEXT_RE.sub(sub_jsx, seg)
    seg, n = replace_code_identifiers(seg)
    count += n
    return seg, count


_INLINE_BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/")


def _replace_code_segment(seg: str) -> tuple[str, int]:
    """Segment hors chaine litterale : JSX-text / code, commentaires /* .. */ mono-ligne et // ..."""
    count = 0

    def sub_block(m):
        nonlocal count
        new_text, n = _replace_ui_text(m.group(0))
        count += n
        return new_text

    seg = _INLINE_BLOCK_COMMENT_RE.sub(sub_block, seg)

    idx = seg.find("//")
    if idx == -1:
        new_seg, n = _replace_jsx_and_code(seg)
        return new_seg, count + n
    code_part, comment_part = seg[:idx], seg[idx:]
    new_code, n1 = _replace_jsx_and_code(code_part)
    new_comment, n2 = _replace_ui_text(comment_part)
    return new_code + new_comment, count + n1 + n2


def process_line(line: str) -> tuple[str, int]:
    if "coin" not in line.lower():
        return line, 0
    if any(sub in line for sub in EXCLUDE_LINE_SUBSTRINGS):
        return line, 0

    segments = _STRING_SPLIT_RE.split(line)
    total = 0
    out = []
    for seg in segments:
        if len(seg) >= 2 and seg[0] == seg[-1] and seg[0] in ("'", '"', "`"):
            new_seg, n = replace_string_content(seg)
        else:
            new_seg, n = _replace_code_segment(seg)
        total += n
        out.append(new_seg)
    return "".join(out), total


_BLOCK_COMMENT_OPEN_RE = re.compile(r"/\*")
_BLOCK_COMMENT_CLOSE_RE = re.compile(r"\*/")


def process_file(path: Path, apply: bool) -> list[str]:
    original = path.read_text(encoding="utf-8")
    lines = original.splitlines(keepends=True)
    total = 0
    changed_lines = []
    out_lines = []
    in_block_comment = False

    for i, line in enumerate(lines, start=1):
        was_in_block = in_block_comment
        has_open = bool(_BLOCK_COMMENT_OPEN_RE.search(line))
        has_close = bool(_BLOCK_COMMENT_CLOSE_RE.search(line))
        if has_open and not has_close:
            in_block_comment = True
        elif has_close and not has_open:
            in_block_comment = False

        if was_in_block and in_block_comment:
            # ligne entierement a l'interieur d'un bloc /* ... */ multi-lignes
            new_line, n = _replace_ui_text(line)
        else:
            new_line, n = process_line(line)

        if n:
            total += n
            changed_lines.append(i)
        out_lines.append(new_line)

    if total == 0:
        return []

    new_text = "".join(out_lines)
    if apply:
        path.write_text(new_text, encoding="utf-8")

    rel = path.relative_to(ROOT)
    return [f"[edit] {rel}: {total} remplacement(s) sur {len(changed_lines)} ligne(s)"]


# ---------------------------------------------------------------------------
# Renommage de fichier : src/utils/coins.ts -> src/utils/gogold.ts
# ---------------------------------------------------------------------------
COINS_UTIL_OLD = SRC / "utils" / "coins.ts"
COINS_UTIL_NEW = SRC / "utils" / "gogold.ts"


def rename_coins_util(apply: bool) -> list[str]:
    if not COINS_UTIL_OLD.exists():
        return []
    changes = [f"[rename] {COINS_UTIL_OLD.relative_to(ROOT)} -> {COINS_UTIL_NEW.relative_to(ROOT)}"]
    if apply:
        COINS_UTIL_NEW.write_text(COINS_UTIL_OLD.read_text(encoding="utf-8"), encoding="utf-8")
        COINS_UTIL_OLD.unlink()
    return changes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Applique les changements (par defaut: dry-run)")
    args = parser.parse_args()

    all_changes = []
    all_changes += rename_coins_util(args.apply)

    for path in sorted(iter_source_files()):
        if path == COINS_UTIL_OLD:
            continue  # deja renomme/traite ci-dessous
        all_changes += process_file(path, args.apply)

    if args.apply and COINS_UTIL_NEW.exists():
        all_changes += process_file(COINS_UTIL_NEW, apply=True)
    elif not args.apply and COINS_UTIL_OLD.exists():
        # dry-run : le fichier n'a pas encore ete physiquement renomme,
        # on rapporte quand meme son contenu sous l'ancien chemin.
        all_changes += process_file(COINS_UTIL_OLD, apply=False)

    mode = "APPLIQUE" if args.apply else "DRY-RUN (aucune modification ecrite)"
    print(f"=== Mode: {mode} ===\n")
    if not all_changes:
        print("Aucune occurrence trouvee.")
    else:
        print("\n".join(all_changes))
        print(f"\n{len(all_changes)} entrees de rapport.")

    if not args.apply:
        print("\nRelancer avec --apply pour ecrire les changements.")


if __name__ == "__main__":
    main()

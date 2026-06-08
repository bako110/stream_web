"""
Remplace les loaders pleine-page inline par <PageLoader /> dans les fichiers ciblés.
Cible les patterns : if (loading) return (<div...><Spinner /></div>)
"""
import re, pathlib

ROOT = pathlib.Path(__file__).parent / "src"

# (fichier, ancien_pattern_multiline, nouveau)
# On cible les if (loading/isLoading) return (...) qui wrappent un Spinner seul
FIXES = {
    "pages/WalletPage.tsx": [
        (
            '  if (loading) {\n    return (\n      <div className="max-w-2xl mx-auto p-6 flex justify-center py-20">\n        <Spinner />\n      </div>\n    );\n  }',
            '  if (loading) return <PageLoader />;'
        ),
    ],
    "pages/TrendingPage.tsx": [
        (
            '      <div className="flex justify-center py-20">\n        <Spinner />\n      </div>\n    );\n  }\n\n  if (items.length === 0)',
            '      <PageLoader />\n    );\n  }\n\n  if (items.length === 0)'
        ),
    ],
    "pages/MyTicketsPage.tsx": [
        (
            '      <div style={{ maxWidth: 720, margin: \'0 auto\', padding: \'1.5rem\', display: \'flex\', justifyContent: \'center\', paddingTop: 80 }}>\n        <Spinner size="lg" />\n      </div>',
            '      <PageLoader />'
        ),
    ],
}

def fix_file(rel_path, replacements):
    path = ROOT / rel_path
    if not path.exists():
        print(f"  SKIP (not found): {rel_path}")
        return
    content = path.read_text(encoding="utf-8")
    original = content
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"  REPLACED in {rel_path}")
        else:
            print(f"  NOT FOUND pattern in {rel_path}: {repr(old[:60])}...")
    if content != original:
        path.write_text(content, encoding="utf-8")

print("=== fix_pageloader2.py ===")
for rel_path, replacements in FIXES.items():
    fix_file(rel_path, replacements)

# Maintenant : MyConcertsPage, MyEventsPage — pattern inline dans JSX
# {loading ? (<div...<Spinner/>...loading...</div>) : ...}
# On remplace par {loading ? <PageLoader /> : ...}
INLINE_FILES = [
    "pages/MyConcertsPage.tsx",
    "pages/MyEventsPage.tsx",
]

INLINE_PATTERN = re.compile(
    r'\{loading \? \(\s*<div className="flex flex-col items-center gap-3 py-20"><Spinner />\s*<p[^>]*>.*?</p>\s*</div>\s*\) :',
    re.DOTALL
)

for rel_path in INLINE_FILES:
    path = ROOT / rel_path
    if not path.exists():
        print(f"  SKIP: {rel_path}")
        continue
    content = path.read_text(encoding="utf-8")
    original = content
    new_content = INLINE_PATTERN.sub('{loading ? <PageLoader /> :', content)
    if new_content != original:
        path.write_text(new_content, encoding="utf-8")
        print(f"  FIXED inline: {rel_path}")
    else:
        print(f"  NOT MATCHED inline: {rel_path}")

# NotificationsPage — inline dans JSX
path = ROOT / "pages/NotificationsPage.tsx"
if path.exists():
    content = path.read_text(encoding="utf-8")
    original = content
    # Pattern: {loading ? (\n<div className="flex flex-col items-center gap-3 py-20">\n<Spinner />\n<p>...</p>\n</div>\n) :
    pat = re.compile(
        r'\{loading \? \(\s*<div className="flex flex-col items-center gap-3 py-20">\s*<Spinner />\s*<p[^>]*>.*?</p>\s*</div>\s*\) :',
        re.DOTALL
    )
    new_content = pat.sub('{loading ? <PageLoader /> :', content)
    if new_content != original:
        path.write_text(new_content, encoding="utf-8")
        print("  FIXED inline: pages/NotificationsPage.tsx")
    else:
        print("  NOT MATCHED: pages/NotificationsPage.tsx")

print("Done.")

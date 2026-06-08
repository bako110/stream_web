"""
Remplace les loaders pleine-page (<Spinner>) par <PageLoader /> dans les fichiers listés.
- Ajoute PageLoader dans l'import existant si absent
- Remplace les patterns courants de full-page spinner
"""
import re, pathlib

ROOT = pathlib.Path(__file__).parent / "src"

FILES = [
    "pages/BlockedUsersPage.tsx",
    "pages/EventsPage.tsx",
    "pages/FavoritesPage.tsx",
    "pages/FeedPage.tsx",
    "pages/FilmsPage.tsx",
    "pages/GoLivePage.tsx",
    "pages/MyConcertsPage.tsx",
    "pages/MyEventsPage.tsx",
    "pages/MyTicketsPage.tsx",
    "pages/NotificationsPage.tsx",
    "pages/PrivacyPage.tsx",
    "pages/SearchPage.tsx",
    "pages/StoryPage.tsx",
    "pages/TrendingPage.tsx",
    "pages/WalletPage.tsx",
    "pages/WatchHistoryPage.tsx",
    "pages/create/CreateConcertPage.tsx",
    "pages/create/CreateEventPage.tsx",
    "pages/explore/ExploreConcertDetailPage.tsx",
    "pages/explore/ExploreEventDetailPage.tsx",
    "pages/explore/ExploreFilmDetailPage.tsx",
    "pages/wallet/WalletCreateAdPage.tsx",
    "pages/wallet/WalletCreatorDashboardPage.tsx",
    "pages/wallet/WalletReferralPage.tsx",
    "pages/wallet/WalletSubscriptionPaymentPage.tsx",
]

# Patterns de spinner pleine page à remplacer par <PageLoader />
FULLPAGE_PATTERNS = [
    # if (loading) return <div ...><Spinner ... /></div>
    (
        re.compile(
            r'if\s*\((?:loading|isLoading)\)\s*return\s*\('
            r'\s*<div[^>]*(?:flex[^"\']*items-center[^"\']*justify-center|justify-center[^"\']*flex)[^>]*>'
            r'(?:\s*<div[^>]*>)?\s*<Spinner[^/]*/>\s*(?:</div>\s*)?'
            r'\s*</div>\s*\)\s*;',
            re.DOTALL
        ),
        lambda m: _build_return(m.group(0))
    ),
    # if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
    (
        re.compile(
            r'if\s*\((?:loading|isLoading)\)\s*return\s*<div[^>]*(?:flex[^"\']*(?:min-h|h-screen|h-full)[^"\']*|(?:min-h|h-screen|h-full)[^"\']*flex)[^>]*>'
            r'\s*<Spinner[^/]*/>\s*</div>\s*;',
            re.DOTALL
        ),
        lambda m: _build_return(m.group(0))
    ),
]

def _build_return(matched: str) -> str:
    # Extraire la condition (loading ou isLoading)
    cond = "isLoading" if "isLoading" in matched else "loading"
    return f"if ({cond}) return <PageLoader />;"


def fix_import(content: str, depth: int) -> str:
    """Ajoute PageLoader à l'import Spinner existant, ou crée un nouvel import."""
    prefix = "../" * depth + "components/ui/Spinner"

    # Déjà importé ?
    if "PageLoader" in content:
        return content

    # Import Spinner existant → ajouter PageLoader
    pattern = re.compile(
        r"(import\s*\{)([^}]*?)(Spinner)([^}]*?)(\}\s*from\s*['\"]"
        + re.escape(prefix) + r"['\"])"
    )
    if pattern.search(content):
        return pattern.sub(lambda m: m.group(1) + m.group(2) + m.group(3) + m.group(4) + ", PageLoader" + m.group(5), content)

    # Pas d'import Spinner → en ajouter un
    first_import = re.search(r'^import\s', content, re.MULTILINE)
    if first_import:
        insert_at = first_import.start()
        return content[:insert_at] + f"import {{ PageLoader }} from '{prefix}';\n" + content[insert_at:]

    return content


def fix_fullpage_spinners(content: str) -> tuple[str, int]:
    changes = 0
    for pattern, replacer in FULLPAGE_PATTERNS:
        new_content, n = pattern.subn(replacer, content)
        changes += n
        content = new_content
    return content, changes


def process(rel_path: str):
    path = ROOT / rel_path
    if not path.exists():
        print(f"  SKIP (not found): {rel_path}")
        return

    depth = rel_path.count("/")  # profondeur depuis src/pages/
    # pages/X.tsx → depth=1 → prefix="../"
    # pages/sub/X.tsx → depth=2 → prefix="../../"
    # On veut le chemin depuis le fichier vers src/components/ui/Spinner
    # pages/ → 1 niveau depuis src → "../components/ui/Spinner"
    # pages/wallet/ → 2 niveaux → "../../components/ui/Spinner"
    spinner_depth = depth  # nombre de ../ nécessaires

    original = path.read_text(encoding="utf-8")
    content = original

    content, n_spinners = fix_fullpage_spinners(content)
    if n_spinners > 0 or "PageLoader" not in original:
        content = fix_import(content, spinner_depth)

    if content != original:
        path.write_text(content, encoding="utf-8")
        print(f"  FIXED ({n_spinners} spinner(s) replaced): {rel_path}")
    else:
        print(f"  OK (no change): {rel_path}")


print("=== fix_pageloader.py ===")
for f in FILES:
    process(f)
print("Done.")

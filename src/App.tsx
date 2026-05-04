import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';

import { AppLayout }       from './components/layout/AppLayout';
import { ExploreLayout }   from './components/layout/ExploreLayout';
import { ProtectedRoute }  from './components/layout/ProtectedRoute';
import { PublicOnlyRoute } from './components/layout/PublicOnlyRoute';
import { bootstrapAuth, useAuthStore } from './store/authStore';

// ── Lazy pages ────────────────────────────────────────────────────────────────
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const LandingPage        = lazy(() => import('./pages/LandingPage'));

const ExploreFilmsPage         = lazy(() => import('./pages/explore/ExploreFilmsPage'));
const ExploreFilmDetailPage    = lazy(() => import('./pages/explore/ExploreFilmDetailPage'));
const ExploreConcertsPage      = lazy(() => import('./pages/explore/ExploreConcertsPage'));
const ExploreConcertDetailPage = lazy(() => import('./pages/explore/ExploreConcertDetailPage'));
const ExploreEventsPage        = lazy(() => import('./pages/explore/ExploreEventsPage'));
const ExploreEventDetailPage   = lazy(() => import('./pages/explore/ExploreEventDetailPage'));
const ExploreReelsPage         = lazy(() => import('./pages/explore/ExploreReelsPage'));

const FeedPage          = lazy(() => import('./pages/FeedPage'));
const ReelsPage         = lazy(() => import('./pages/ReelsPage'));
const FilmsPage         = lazy(() => import('./pages/FilmsPage'));
const ConcertsPage      = lazy(() => import('./pages/ConcertsPage'));
const EventsPage        = lazy(() => import('./pages/EventsPage'));
const LiveListPage      = lazy(() => import('./pages/LiveListPage'));
const LivePage          = lazy(() => import('./pages/LivePage'));
const SearchPage        = lazy(() => import('./pages/SearchPage'));
const MessagesPage      = lazy(() => import('./pages/MessagesPage'));
const CommunitiesPage   = lazy(() => import('./pages/CommunitiesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage       = lazy(() => import('./pages/ProfilePage'));
const UserProfilePage   = lazy(() => import('./pages/UserProfilePage'));
const SettingsPage      = lazy(() => import('./pages/SettingsPage'));
const ActivityPage      = lazy(() => import('./pages/ActivityPage'));

const FilmDetailPage      = lazy(() => import('./pages/detail/FilmDetailPage'));
const SerieDetailPage     = lazy(() => import('./pages/detail/SerieDetailPage'));
const ConcertDetailPage   = lazy(() => import('./pages/detail/ConcertDetailPage'));
const EventDetailPage     = lazy(() => import('./pages/detail/EventDetailPage'));
const CommunityDetailPage = lazy(() => import('./pages/detail/CommunityDetailPage'));

// ── Loader animé partagé ──────────────────────────────────────────────────────
function GlobalLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-2xl rotate-12"
            style={{
              background: 'linear-gradient(135deg,#7B3FF2,#E0389A)',
              animation:  'spin-slow 3s linear infinite',
            }} />
          <div className="absolute inset-1 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg)' }}>
            <span className="text-lg font-black gradient-text">FX</span>
          </div>
          <div className="absolute inset-0 rounded-2xl rotate-12"
            style={{
              background: 'linear-gradient(135deg,#7B3FF2,#E0389A)',
              opacity:    0.25,
              animation:  'ping-once 1.5s ease-out infinite',
            }} />
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full"
              style={{
                background: 'var(--primary)',
                animation:  `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
          ))}
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>FoliX</p>
      </div>
    </div>
  );
}

// Exécuté une seule fois au chargement du module — avant tout render
bootstrapAuth();

// ── Shell principal ───────────────────────────────────────────────────────────
function AppShell() {
  const { isInitializing } = useAuthStore();

  // Bloquer tout rendu de route tant que l'état auth n'est pas résolu
  if (isInitializing) return <GlobalLoader />;

  return (
    <Suspense fallback={<GlobalLoader />}>
      <Routes>

        {/* Routes publiques uniquement — redirige vers /feed si connecté */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/"                     element={<LandingPage />} />
          <Route path="/auth/login"           element={<LoginPage />} />
          <Route path="/auth/register"        element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Explore public — accessible connecté ou non */}
        <Route element={<ExploreLayout />}>
          <Route path="/explore/films"           element={<ExploreFilmsPage type="film" />} />
          <Route path="/explore/films/:id"       element={<ExploreFilmDetailPage type="film" />} />
          <Route path="/explore/series"          element={<ExploreFilmsPage type="serie" />} />
          <Route path="/explore/series/:id"      element={<ExploreFilmDetailPage type="serie" />} />
          <Route path="/explore/concerts"        element={<ExploreConcertsPage />} />
          <Route path="/explore/concerts/:id"    element={<ExploreConcertDetailPage />} />
          <Route path="/explore/events"          element={<ExploreEventsPage />} />
          <Route path="/explore/events/:id"      element={<ExploreEventDetailPage />} />
          <Route path="/explore/reels"           element={<ExploreReelsPage />} />
        </Route>

        {/* Routes protégées */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/feed"              element={<FeedPage />} />
            <Route path="/reels"             element={<ReelsPage />} />
            <Route path="/films"             element={<FilmsPage type="film" />} />
            <Route path="/films/:id"         element={<FilmDetailPage />} />
            <Route path="/series"            element={<FilmsPage type="serie" />} />
            <Route path="/series/:id"        element={<SerieDetailPage />} />
            <Route path="/concerts"          element={<ConcertsPage />} />
            <Route path="/concerts/:id"      element={<ConcertDetailPage />} />
            <Route path="/events"            element={<EventsPage />} />
            <Route path="/events/:id"        element={<EventDetailPage />} />
            <Route path="/live"              element={<LiveListPage />} />
            <Route path="/live/:id"          element={<LivePage />} />
            <Route path="/search"            element={<SearchPage />} />
            <Route path="/messages"          element={<MessagesPage />} />
            <Route path="/messages/:userId"  element={<MessagesPage />} />
            <Route path="/communities"       element={<CommunitiesPage />} />
            <Route path="/communities/:id"   element={<CommunityDetailPage />} />
            <Route path="/notifications"     element={<NotificationsPage />} />
            <Route path="/profile"           element={<ProfilePage />} />
            <Route path="/user/:id"          element={<UserProfilePage />} />
            <Route path="/settings"          element={<SettingsPage />} />
            <Route path="/activity"          element={<ActivityPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color:      'var(--text-primary)',
            border:     '1px solid var(--border)',
          },
        }}
      />
      <AppShell />
    </BrowserRouter>
  );
}

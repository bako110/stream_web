import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';

import { AppLayout }       from './components/layout/AppLayout';
import { ExploreLayout }   from './components/layout/ExploreLayout';
import { ProtectedRoute }  from './components/layout/ProtectedRoute';
import { PublicOnlyRoute } from './components/layout/PublicOnlyRoute';
import { bootstrapAuth, useAuthStore } from './store/authStore';
import { WebSocketProvider } from './context/WebSocketContext';

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
const LiveListPage        = lazy(() => import('./pages/LiveListPage'));
const LivePage            = lazy(() => import('./pages/LivePage'));
const LiveSimpleListPage  = lazy(() => import('./pages/LiveSimpleListPage'));
const LiveSimplePage      = lazy(() => import('./pages/LiveSimplePage'));
const GoLivePage          = lazy(() => import('./pages/GoLivePage'));
const SearchPage        = lazy(() => import('./pages/SearchPage'));
const MessagesPage      = lazy(() => import('./pages/MessagesPage'));
const CommunitiesPage   = lazy(() => import('./pages/CommunitiesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage       = lazy(() => import('./pages/ProfilePage'));
const UserProfilePage   = lazy(() => import('./pages/UserProfilePage'));
const SettingsPage      = lazy(() => import('./pages/SettingsPage'));
const ActivityPage      = lazy(() => import('./pages/ActivityPage'));
const WalletPage         = lazy(() => import('./pages/WalletPage'));
const WalletBuyPage      = lazy(() => import('./pages/wallet/WalletBuyPage'));
const WalletTransferPage = lazy(() => import('./pages/wallet/WalletTransferPage'));
const WalletWithdrawPage = lazy(() => import('./pages/wallet/WalletWithdrawPage'));
const WalletDashboardPage= lazy(() => import('./pages/wallet/WalletDashboardPage'));
const WalletBoostPage               = lazy(() => import('./pages/wallet/WalletBoostPage'));
const WalletReferralPage            = lazy(() => import('./pages/wallet/WalletReferralPage'));
const WalletCreatorDashboardPage    = lazy(() => import('./pages/wallet/WalletCreatorDashboardPage'));
const WalletMonetisationPage        = lazy(() => import('./pages/wallet/WalletMonetisationPage'));
const WalletMonetisationRequestPage = lazy(() => import('./pages/wallet/WalletMonetisationRequestPage'));
const WalletSubscriptionPlansPage   = lazy(() => import('./pages/wallet/WalletSubscriptionPlansPage'));
const WalletSubscriptionPaymentPage = lazy(() => import('./pages/wallet/WalletSubscriptionPaymentPage'));
const WalletMySubscriptionPage      = lazy(() => import('./pages/wallet/WalletMySubscriptionPage'));
const MyTicketsPage                 = lazy(() => import('./pages/MyTicketsPage'));
const AttendeesPage                 = lazy(() => import('./pages/AttendeesPage'));
const TrendingPage                  = lazy(() => import('./pages/TrendingPage'));
const FavoritesPage                 = lazy(() => import('./pages/FavoritesPage'));
const WatchHistoryPage              = lazy(() => import('./pages/WatchHistoryPage'));
const FollowingPage                 = lazy(() => import('./pages/FollowingPage'));
const CreatePostPage     = lazy(() => import('./pages/create/CreatePostPage'));
const CreateReelPage     = lazy(() => import('./pages/create/CreateReelPage'));
const CreateConcertPage  = lazy(() => import('./pages/create/CreateConcertPage'));
const CreateEventPage    = lazy(() => import('./pages/create/CreateEventPage'));
const SubscriptionsPage              = lazy(() => import('./pages/SubscriptionsPage'));
const PrivacyPage                    = lazy(() => import('./pages/PrivacyPage'));
const CGUPage                        = lazy(() => import('./pages/CGUPage'));
const PolitiqueConfidentialitePage   = lazy(() => import('./pages/PolitiqueConfidentialitePage'));
const MyEventsPage                   = lazy(() => import('./pages/MyEventsPage'));
const MyConcertsPage                 = lazy(() => import('./pages/MyConcertsPage'));
const BlockedUsersPage   = lazy(() => import('./pages/BlockedUsersPage'));
const OnboardingPage     = lazy(() => import('./pages/OnboardingPage'));
const StoryViewersPage   = lazy(() => import('./pages/StoryViewersPage'));
const StoryPage          = lazy(() => import('./pages/StoryPage'));
const PlanningPage       = lazy(() => import('./pages/PlanningPage'));
const SupportPage        = lazy(() => import('./pages/SupportPage'));
const CommunityChannelsPage      = lazy(() => import('./pages/community/CommunityChannelsPage'));
const CommunityLeaderboardPage   = lazy(() => import('./pages/community/CommunityLeaderboardPage'));
const CommunityJoinRequestsPage  = lazy(() => import('./pages/community/CommunityJoinRequestsPage'));
const CommunityEventsPage        = lazy(() => import('./pages/community/CommunityEventsPage'));
const CommunityStatsPage         = lazy(() => import('./pages/community/CommunityStatsPage'));
const CommunityMemberProfilePage = lazy(() => import('./pages/community/CommunityMemberProfilePage'));

const SettingsVerificationPage  = lazy(() => import('./pages/settings/SettingsVerificationPage'));
const SettingsAppearancePage    = lazy(() => import('./pages/settings/SettingsAppearancePage'));
const SettingsNotificationsPage = lazy(() => import('./pages/settings/SettingsNotificationsPage'));
const SettingsPlaybackPage      = lazy(() => import('./pages/settings/SettingsPlaybackPage'));
const SettingsAccountPage       = lazy(() => import('./pages/settings/SettingsAccountPage'));
const SettingsContentPage       = lazy(() => import('./pages/settings/SettingsContentPage'));
const SettingsAboutPage         = lazy(() => import('./pages/settings/SettingsAboutPage'));
const SettingsDangerPage        = lazy(() => import('./pages/settings/SettingsDangerPage'));

const FilmDetailPage      = lazy(() => import('./pages/detail/FilmDetailPage'));
const SerieDetailPage     = lazy(() => import('./pages/detail/SerieDetailPage'));
const ConcertDetailPage   = lazy(() => import('./pages/detail/ConcertDetailPage'));
const EventDetailPage     = lazy(() => import('./pages/detail/EventDetailPage'));
const PostDetailPage      = lazy(() => import('./pages/detail/PostDetailPage'));
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
          <Route path="/onboarding"           element={<OnboardingPage />} />
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

          {/* Reels — plein écran, sans Topbar ni BottomNav */}
          <Route path="/reels" element={<ReelsPage />} />

          <Route element={<AppLayout />}>
            <Route path="/feed"              element={<FeedPage />} />
            <Route path="/films"             element={<FilmsPage type="film" />} />
            <Route path="/films/:id"         element={<FilmDetailPage />} />
            <Route path="/series"            element={<FilmsPage type="serie" />} />
            <Route path="/series/:id"        element={<SerieDetailPage />} />
            <Route path="/concerts"          element={<ConcertsPage />} />
            <Route path="/concerts/:id"      element={<ConcertDetailPage />} />
            <Route path="/events"            element={<EventsPage />} />
            <Route path="/events/:id"        element={<EventDetailPage />} />
            <Route path="/posts/:id"         element={<PostDetailPage />} />
            <Route path="/live"              element={<LiveListPage />} />
            <Route path="/live/:id"          element={<LivePage />} />
            <Route path="/lives"             element={<LiveSimpleListPage />} />
            <Route path="/lives/:id"         element={<LiveSimplePage />} />
            <Route path="/go-live"           element={<GoLivePage />} />
            <Route path="/search"            element={<SearchPage />} />
            <Route path="/messages"          element={<MessagesPage />} />
            <Route path="/messages/:userId"  element={<MessagesPage />} />
            <Route path="/communities"       element={<CommunitiesPage />} />
            <Route path="/communities/:id"   element={<CommunityDetailPage />} />
            <Route path="/notifications"     element={<NotificationsPage />} />
            <Route path="/profile"           element={<ProfilePage />} />
            <Route path="/user/:id"          element={<UserProfilePage />} />
            <Route path="/settings"                    element={<SettingsPage />} />
            <Route path="/settings/verification"       element={<SettingsVerificationPage />} />
            <Route path="/settings/appearance"         element={<SettingsAppearancePage />} />
            <Route path="/settings/notifications"      element={<SettingsNotificationsPage />} />
            <Route path="/settings/playback"           element={<SettingsPlaybackPage />} />
            <Route path="/settings/account"            element={<SettingsAccountPage />} />
            <Route path="/settings/content"            element={<SettingsContentPage />} />
            <Route path="/settings/about"              element={<SettingsAboutPage />} />
            <Route path="/settings/danger"             element={<SettingsDangerPage />} />
            <Route path="/activity"          element={<ActivityPage />} />
            <Route path="/wallet"              element={<WalletPage />} />
            <Route path="/wallet/buy"        element={<WalletBuyPage />} />
            <Route path="/wallet/transfer"   element={<WalletTransferPage />} />
            <Route path="/wallet/withdraw"   element={<WalletWithdrawPage />} />
            <Route path="/wallet/dashboard"  element={<WalletDashboardPage />} />
            <Route path="/wallet/boost"                     element={<WalletBoostPage />} />
            <Route path="/wallet/referral"                  element={<WalletReferralPage />} />
            <Route path="/wallet/creator"                   element={<WalletCreatorDashboardPage />} />
            <Route path="/wallet/monetisation"              element={<WalletMonetisationPage />} />
            <Route path="/wallet/monetisation/request"      element={<WalletMonetisationRequestPage />} />
            <Route path="/wallet/subscription/plans"        element={<WalletSubscriptionPlansPage />} />
            <Route path="/wallet/subscription/payment"      element={<WalletSubscriptionPaymentPage />} />
            <Route path="/wallet/subscription/my"           element={<WalletMySubscriptionPage />} />
            <Route path="/my-tickets"                       element={<MyTicketsPage />} />
            <Route path="/events/:id/attendees"             element={<AttendeesPage />} />
            <Route path="/trending"                         element={<TrendingPage />} />
            <Route path="/favorites"                        element={<FavoritesPage />} />
            <Route path="/watch-history"                    element={<WatchHistoryPage />} />
            <Route path="/following"                        element={<FollowingPage />} />
            <Route path="/following/:userId"                element={<FollowingPage />} />
            <Route path="/create/post"                      element={<CreatePostPage />} />
            <Route path="/create/reel"                      element={<CreateReelPage />} />
            <Route path="/create/concert"                   element={<CreateConcertPage />} />
            <Route path="/create/event"                     element={<CreateEventPage />} />
            <Route path="/subscriptions"     element={<SubscriptionsPage />} />
            <Route path="/privacy"                        element={<PrivacyPage />} />
            <Route path="/my-events"                      element={<MyEventsPage />} />
            <Route path="/my-concerts"                    element={<MyConcertsPage />} />
            <Route path="/cgu"                            element={<CGUPage />} />
            <Route path="/politique-confidentialite"      element={<PolitiqueConfidentialitePage />} />
            <Route path="/blocked-users"                  element={<BlockedUsersPage />} />
            <Route path="/planning"          element={<PlanningPage />} />
            <Route path="/support"           element={<SupportPage />} />
            <Route path="/stories/:id/viewers"                    element={<StoryViewersPage />} />
            <Route path="/stories"                                element={<StoryPage />} />
            <Route path="/communities/:id/channels"               element={<CommunityChannelsPage />} />
            <Route path="/communities/:id/leaderboard"            element={<CommunityLeaderboardPage />} />
            <Route path="/communities/:id/join-requests"          element={<CommunityJoinRequestsPage />} />
            <Route path="/communities/:id/events"                 element={<CommunityEventsPage />} />
            <Route path="/communities/:id/stats"                  element={<CommunityStatsPage />} />
            <Route path="/communities/:id/members/:userId"        element={<CommunityMemberProfilePage />} />
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
      <WebSocketProvider>
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
      </WebSocketProvider>
    </BrowserRouter>
  );
}

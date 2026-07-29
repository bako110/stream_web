import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense } from 'react';

import { AppLayout }       from './components/layout/AppLayout';
import { ExploreLayout }   from './components/layout/ExploreLayout';
import { ProtectedRoute }  from './components/layout/ProtectedRoute';
import { PublicOnlyRoute } from './components/layout/PublicOnlyRoute';
import { MobileGate }      from './components/layout/MobileGate';
import { bootstrapAuth, useAuthStore } from './store/authStore';
import { WebSocketProvider } from './context/WebSocketContext';
import { PageLoader } from './components/ui/Spinner';
import { lazyWithRetry } from './utils/lazyWithRetry';

// ── Lazy pages ────────────────────────────────────────────────────────────────
const LoginPage          = lazyWithRetry(() => import('./pages/auth/LoginPage'));
const RegisterPage       = lazyWithRetry(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/auth/ForgotPasswordPage'));
const LandingPage        = lazyWithRetry(() => import('./pages/LandingPage'));

const ExploreFilmsPage         = lazyWithRetry(() => import('./pages/explore/ExploreFilmsPage'));
const ExploreFilmDetailPage    = lazyWithRetry(() => import('./pages/explore/ExploreFilmDetailPage'));
const ExploreConcertsPage      = lazyWithRetry(() => import('./pages/explore/ExploreConcertsPage'));
const ExploreLivePage          = lazyWithRetry(() => import('./pages/explore/ExploreLivePage'));
const ExploreConcertDetailPage = lazyWithRetry(() => import('./pages/explore/ExploreConcertDetailPage'));
const ExploreEventsPage        = lazyWithRetry(() => import('./pages/explore/ExploreEventsPage'));
const ExploreEventDetailPage   = lazyWithRetry(() => import('./pages/explore/ExploreEventDetailPage'));
const ExploreReelsPage         = lazyWithRetry(() => import('./pages/explore/ExploreReelsPage'));
const ExploreReelDetailPage    = lazyWithRetry(() => import('./pages/explore/ExploreReelDetailPage'));

const FeedPage          = lazyWithRetry(() => import('./pages/FeedPage'));
const ReelsPage         = lazyWithRetry(() => import('./pages/ReelsPage'));
const FilmsPage         = lazyWithRetry(() => import('./pages/FilmsPage'));
const ConcertsPage      = lazyWithRetry(() => import('./pages/ConcertsPage'));
const EventsPage        = lazyWithRetry(() => import('./pages/EventsPage'));
const LiveListPage        = lazyWithRetry(() => import('./pages/LiveListPage'));
const LivePage            = lazyWithRetry(() => import('./pages/LivePage'));
const LiveSimpleListPage  = lazyWithRetry(() => import('./pages/LiveSimpleListPage'));
const LiveSimplePage      = lazyWithRetry(() => import('./pages/LiveSimplePage'));
const GoLivePage          = lazyWithRetry(() => import('./pages/GoLivePage'));
const LiveOneVsOnePage      = lazyWithRetry(() => import('./pages/LiveOneVsOnePage'));
const BattlePage             = lazyWithRetry(() => import('./pages/BattlePage'));
const TournamentListPage     = lazyWithRetry(() => import('./pages/TournamentListPage'));
const TournamentBracketPage  = lazyWithRetry(() => import('./pages/TournamentBracketPage'));
const LiveTournamentsPage    = lazyWithRetry(() => import('./pages/LiveTournamentsPage'));
const TournamentFinancePage  = lazyWithRetry(() => import('./pages/TournamentFinancePage'));
const MorePage               = lazyWithRetry(() => import('./pages/MorePage'));
const SearchPage        = lazyWithRetry(() => import('./pages/SearchPage'));
const MessagesPage      = lazyWithRetry(() => import('./pages/MessagesPage'));
const CommunitiesPage   = lazyWithRetry(() => import('./pages/CommunitiesPage'));
const NotificationsPage = lazyWithRetry(() => import('./pages/NotificationsPage'));
const ProfilePage       = lazyWithRetry(() => import('./pages/ProfilePage'));
const UserProfilePage   = lazyWithRetry(() => import('./pages/UserProfilePage'));
const SettingsPage      = lazyWithRetry(() => import('./pages/SettingsPage'));
const ActivityPage      = lazyWithRetry(() => import('./pages/ActivityPage'));
const WalletPage         = lazyWithRetry(() => import('./pages/WalletPage'));
const WalletBuyPage      = lazyWithRetry(() => import('./pages/wallet/WalletBuyPage'));
const WalletTransferPage = lazyWithRetry(() => import('./pages/wallet/WalletTransferPage'));
const WalletWithdrawPage = lazyWithRetry(() => import('./pages/wallet/WalletWithdrawPage'));
const WalletDashboardPage= lazyWithRetry(() => import('./pages/wallet/WalletDashboardPage'));
const WalletBoostPage               = lazyWithRetry(() => import('./pages/wallet/WalletBoostPage'));
const WalletAdsPage                 = lazyWithRetry(() => import('./pages/wallet/WalletAdsPage'));
const WalletCreateAdPage            = lazyWithRetry(() => import('./pages/wallet/WalletCreateAdPage'));
const WalletReferralPage            = lazyWithRetry(() => import('./pages/wallet/WalletReferralPage'));
const WalletCreatorDashboardPage    = lazyWithRetry(() => import('./pages/wallet/WalletCreatorDashboardPage'));
const WalletMonetisationPage        = lazyWithRetry(() => import('./pages/wallet/WalletMonetisationPage'));
const WalletMonetisationRequestPage = lazyWithRetry(() => import('./pages/wallet/WalletMonetisationRequestPage'));
const CreatorAnalyticsPage          = lazyWithRetry(() => import('./pages/wallet/CreatorAnalyticsPage'));
const WalletRevenuePage             = lazyWithRetry(() => import('./pages/wallet/WalletRevenuePage'));
const WalletRevenueContentPage      = lazyWithRetry(() => import('./pages/wallet/WalletRevenueContentPage'));
const WalletRevenueTransactionsPage = lazyWithRetry(() => import('./pages/wallet/WalletRevenueTransactionsPage'));
const ContentAnalyticsListPage      = lazyWithRetry(() => import('./pages/wallet/ContentAnalyticsListPage'));
const ContentAnalyticsDetailPage    = lazyWithRetry(() => import('./pages/wallet/ContentAnalyticsDetailPage'));
const WalletSubscriptionPlansPage   = lazyWithRetry(() => import('./pages/wallet/WalletSubscriptionPlansPage'));
const WalletSubscriptionPaymentPage = lazyWithRetry(() => import('./pages/wallet/WalletSubscriptionPaymentPage'));
const WalletMySubscriptionPage      = lazyWithRetry(() => import('./pages/wallet/WalletMySubscriptionPage'));
const MyTicketsPage                 = lazyWithRetry(() => import('./pages/MyTicketsPage'));
const AttendeesPage                 = lazyWithRetry(() => import('./pages/AttendeesPage'));
const TrendingPage                  = lazyWithRetry(() => import('./pages/TrendingPage'));
const FavoritesPage                 = lazyWithRetry(() => import('./pages/FavoritesPage'));
const WatchHistoryPage              = lazyWithRetry(() => import('./pages/WatchHistoryPage'));
const FollowingPage                 = lazyWithRetry(() => import('./pages/FollowingPage'));
const SuggestionsPage               = lazyWithRetry(() => import('./pages/SuggestionsPage'));
const DiscoverPeoplePage            = lazyWithRetry(() => import('./pages/discover/DiscoverPeoplePage'));
const DiscoverCommunitiesPage       = lazyWithRetry(() => import('./pages/discover/DiscoverCommunitiesPage'));
const DiscoverEventsPage            = lazyWithRetry(() => import('./pages/discover/DiscoverEventsPage'));
const CreatePostPage     = lazyWithRetry(() => import('./pages/create/CreatePostPage'));
const CreateReelPage     = lazyWithRetry(() => import('./pages/create/CreateReelPage'));
const CreateConcertPage  = lazyWithRetry(() => import('./pages/create/CreateConcertPage'));
const CreateEventPage    = lazyWithRetry(() => import('./pages/create/CreateEventPage'));
const SubscriptionsPage              = lazyWithRetry(() => import('./pages/SubscriptionsPage'));
const PrivacyPage                    = lazyWithRetry(() => import('./pages/PrivacyPage'));
const CGUPage                        = lazyWithRetry(() => import('./pages/CGUPage'));
const AboutPage                      = lazyWithRetry(() => import('./pages/AboutPage'));
const BlogPage                       = lazyWithRetry(() => import('./pages/BlogPage'));
const BlogArticlePage                = lazyWithRetry(() => import('./pages/BlogArticlePage'));
const PressePage                     = lazyWithRetry(() => import('./pages/PressePage'));
const CarrieresPage                  = lazyWithRetry(() => import('./pages/CarrieresPage'));
const CookiesPage                    = lazyWithRetry(() => import('./pages/CookiesPage'));
const PolitiqueConfidentialitePage   = lazyWithRetry(() => import('./pages/PolitiqueConfidentialitePage'));
const EncryptionPage                 = lazyWithRetry(() => import('./pages/EncryptionPage'));
const MyEventsPage                   = lazyWithRetry(() => import('./pages/MyEventsPage'));
const MyConcertsPage                 = lazyWithRetry(() => import('./pages/MyConcertsPage'));
const BlockedUsersPage   = lazyWithRetry(() => import('./pages/BlockedUsersPage'));
const OnboardingPage     = lazyWithRetry(() => import('./pages/OnboardingPage'));
const StoryViewersPage   = lazyWithRetry(() => import('./pages/StoryViewersPage'));
const StoryPage          = lazyWithRetry(() => import('./pages/StoryPage'));
const StoryEditorPage    = lazyWithRetry(() => import('./pages/StoryEditorPage'));
const MyStoriesPage      = lazyWithRetry(() => import('./pages/MyStoriesPage'));
const PlanningPage       = lazyWithRetry(() => import('./pages/PlanningPage'));
const SupportPage        = lazyWithRetry(() => import('./pages/SupportPage'));
const CommunityChannelsPage      = lazyWithRetry(() => import('./pages/community/CommunityChannelsPage'));
const CommunityLeaderboardPage   = lazyWithRetry(() => import('./pages/community/CommunityLeaderboardPage'));
const CommunityJoinRequestsPage  = lazyWithRetry(() => import('./pages/community/CommunityJoinRequestsPage'));
const CommunityEventsPage        = lazyWithRetry(() => import('./pages/community/CommunityEventsPage'));
const CommunityStatsPage         = lazyWithRetry(() => import('./pages/community/CommunityStatsPage'));
const CommunityMemberProfilePage = lazyWithRetry(() => import('./pages/community/CommunityMemberProfilePage'));
const CommunityTreasuryPage      = lazyWithRetry(() => import('./pages/community/CommunityTreasuryPage'));
const CommunityFundPage          = lazyWithRetry(() => import('./pages/community/CommunityFundPage'));
const CommunityFundDetailPage    = lazyWithRetry(() => import('./pages/community/CommunityFundDetailPage'));
const CommunityTreasurerPage     = lazyWithRetry(() => import('./pages/community/CommunityTreasurerPage'));
const CommunityMembersPage       = lazyWithRetry(() => import('./pages/community/CommunityMembersPage'));
const CommunityInvitePage        = lazyWithRetry(() => import('./pages/community/CommunityInvitePage'));

const SettingsVerificationPage  = lazyWithRetry(() => import('./pages/settings/SettingsVerificationPage'));
const SettingsAppearancePage    = lazyWithRetry(() => import('./pages/settings/SettingsAppearancePage'));
const SettingsNotificationsPage = lazyWithRetry(() => import('./pages/settings/SettingsNotificationsPage'));
const SettingsPlaybackPage      = lazyWithRetry(() => import('./pages/settings/SettingsPlaybackPage'));
const SettingsAccountPage       = lazyWithRetry(() => import('./pages/settings/SettingsAccountPage'));
const SettingsContentPage       = lazyWithRetry(() => import('./pages/settings/SettingsContentPage'));
const SettingsAboutPage         = lazyWithRetry(() => import('./pages/settings/SettingsAboutPage'));
const SettingsDangerPage        = lazyWithRetry(() => import('./pages/settings/SettingsDangerPage'));

const FilmDetailPage      = lazyWithRetry(() => import('./pages/detail/FilmDetailPage'));
const SerieDetailPage     = lazyWithRetry(() => import('./pages/detail/SerieDetailPage'));
const ConcertDetailPage   = lazyWithRetry(() => import('./pages/detail/ConcertDetailPage'));
const EventDetailPage     = lazyWithRetry(() => import('./pages/detail/EventDetailPage'));
const PostDetailPage      = lazyWithRetry(() => import('./pages/detail/PostDetailPage'));
const CommunityDetailPage = lazyWithRetry(() => import('./pages/detail/CommunityDetailPage'));

function GlobalLoader() { return <PageLoader />; }

// Layout conditionnel pour les pages partageables :
// connecté → AppLayout (sidebar + topbar), guest → page standalone sans sidebar
function SharedRoute({ page }: { page: React.ReactNode }) {
  const { user: me } = useAuthStore();
  if (me) {
    return <AppLayout>{page}</AppLayout>;
  }
  return <>{page}</>;
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
          <Route path="/explore/live"            element={<ExploreLivePage />} />
          <Route path="/explore/concerts"        element={<ExploreConcertsPage />} />
          <Route path="/explore/concerts/:id"    element={<ExploreConcertDetailPage />} />
          <Route path="/explore/events"          element={<ExploreEventsPage />} />
          <Route path="/explore/events/:id"      element={<ExploreEventDetailPage />} />
          <Route path="/explore/reels"           element={<ExploreReelsPage />} />
          <Route path="/explore/reels/:id"       element={<ExploreReelDetailPage />} />
        </Route>

        {/* Contenu partageable — layout conditionnel selon auth */}
        <Route path="/posts/:id"    element={<SharedRoute page={<PostDetailPage />} />} />
        <Route path="/concerts/:id" element={<SharedRoute page={<ConcertDetailPage />} />} />
        <Route path="/events/:id"   element={<SharedRoute page={<EventDetailPage />} />} />
        <Route path="/films/:id"    element={<SharedRoute page={<FilmDetailPage />} />} />
        <Route path="/series/:id"   element={<SharedRoute page={<SerieDetailPage />} />} />

        {/* Reels — dans AppLayout (sidebar visible, style TikTok desktop), accessible sans connexion */}
        <Route element={<AppLayout />}>
          <Route path="/reels" element={<ReelsPage />} />
        </Route>

        {/* Routes protégées */}
        <Route element={<ProtectedRoute />}>


          <Route element={<AppLayout />}>
            <Route path="/feed"              element={<FeedPage />} />
            <Route path="/films"             element={<FilmsPage type="film" />} />
            <Route path="/series"            element={<FilmsPage type="serie" />} />
            <Route path="/concerts"          element={<ConcertsPage />} />
            <Route path="/events"            element={<EventsPage />} />
            <Route path="/live"              element={<LiveListPage />} />
            <Route path="/live/:id"          element={<LivePage />} />
            <Route path="/lives"             element={<LiveSimpleListPage />} />
            <Route path="/lives/:id"         element={<LiveSimplePage />} />
            <Route path="/go-live"           element={<GoLivePage />} />
            <Route path="/battles"           element={<LiveOneVsOnePage />} />
            <Route path="/battles/:id"       element={<BattlePage />} />
            <Route path="/tournaments"             element={<TournamentListPage />} />
            <Route path="/tournaments/active"      element={<LiveTournamentsPage />} />
            <Route path="/tournaments/:id"         element={<TournamentBracketPage />} />
            <Route path="/tournaments/:id/finance" element={<TournamentFinancePage />} />
            <Route path="/search"            element={<SearchPage />} />
            <Route path="/messages"          element={<MessagesPage />} />
            <Route path="/messages/:userId"  element={<MessagesPage />} />
            <Route path="/communities"       element={<CommunitiesPage />} />
            <Route path="/communities/:id"   element={<CommunityDetailPage />} />
            <Route path="/notifications"     element={<NotificationsPage />} />
            <Route path="/more"              element={<MorePage />} />
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
            <Route path="/wallet/ads"                       element={<WalletAdsPage />} />
            <Route path="/wallet/ads/create"                element={<WalletCreateAdPage />} />
            <Route path="/wallet/referral"                  element={<WalletReferralPage />} />
            <Route path="/wallet/creator"                   element={<WalletCreatorDashboardPage />} />
            <Route path="/wallet/analytics"                 element={<CreatorAnalyticsPage />} />
            <Route path="/wallet/analytics/content"         element={<ContentAnalyticsListPage />} />
            <Route path="/wallet/analytics/content/:type/:id" element={<ContentAnalyticsDetailPage />} />
            <Route path="/wallet/revenue"                   element={<WalletRevenuePage />} />
            <Route path="/wallet/revenue/content"           element={<WalletRevenueContentPage />} />
            <Route path="/wallet/revenue/transactions"      element={<WalletRevenueTransactionsPage />} />
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
            <Route path="/suggestions"                      element={<SuggestionsPage />} />
            <Route path="/discover/people"                  element={<DiscoverPeoplePage />} />
            <Route path="/discover/communities"             element={<DiscoverCommunitiesPage />} />
            <Route path="/discover/events"                  element={<DiscoverEventsPage />} />
            <Route path="/create/post"                      element={<CreatePostPage />} />
            <Route path="/create/reel"                      element={<CreateReelPage />} />
            <Route path="/create/concert"                   element={<CreateConcertPage />} />
            <Route path="/create/event"                     element={<CreateEventPage />} />
            <Route path="/subscriptions"     element={<SubscriptionsPage />} />
            <Route path="/privacy"                        element={<PrivacyPage />} />
            <Route path="/my-events"                      element={<MyEventsPage />} />
            <Route path="/my-concerts"                    element={<MyConcertsPage />} />
            <Route path="/blocked-users"                  element={<BlockedUsersPage />} />
            <Route path="/planning"          element={<PlanningPage />} />
            <Route path="/stories/create"                         element={<StoryEditorPage />} />
            <Route path="/stories/:id/viewers"                    element={<StoryViewersPage />} />
            <Route path="/my-stories"                             element={<MyStoriesPage />} />
            <Route path="/stories"                                element={<StoryPage />} />
            <Route path="/communities/:id/channels"               element={<CommunityChannelsPage />} />
            <Route path="/communities/:id/leaderboard"            element={<CommunityLeaderboardPage />} />
            <Route path="/communities/:id/join-requests"          element={<CommunityJoinRequestsPage />} />
            <Route path="/communities/:id/events"                 element={<CommunityEventsPage />} />
            <Route path="/communities/:id/stats"                  element={<CommunityStatsPage />} />
            <Route path="/communities/:id/members/:userId"        element={<CommunityMemberProfilePage />} />
            <Route path="/communities/:id/treasury"               element={<CommunityTreasuryPage />} />
            <Route path="/communities/:id/fund"                   element={<CommunityFundPage />} />
            <Route path="/communities/:id/fund/:cotId"            element={<CommunityFundDetailPage />} />
            <Route path="/communities/:id/treasurer"              element={<CommunityTreasurerPage />} />
            <Route path="/communities/:id/members"                element={<CommunityMembersPage />} />
            <Route path="/communities/:id/invite"                 element={<CommunityInvitePage />} />
            <Route path="/support"                                element={<SupportPage />} />
          </Route>
        </Route>

        {/* Pages publiques — accessibles sans connexion */}
        <Route path="/cgu"                            element={<CGUPage />} />
        <Route path="/politique-confidentialite"      element={<PolitiqueConfidentialitePage />} />
        <Route path="/chiffrement"                    element={<EncryptionPage />} />
        <Route path="/cookies"                        element={<CookiesPage />} />
        <Route path="/a-propos"                       element={<AboutPage />} />
        <Route path="/blog"                           element={<BlogPage />} />
        <Route path="/blog/:slug"                     element={<BlogArticlePage />} />
        <Route path="/presse"                         element={<PressePage />} />
        <Route path="/carrieres"                      element={<CarrieresPage />} />
        <Route path="/support"                        element={<SupportPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <MobileGate>
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
      </MobileGate>
    </BrowserRouter>
  );
}

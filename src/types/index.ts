// ── User ──────────────────────────────────────────────────────────────────
export type UserRole = 'user' | 'artist' | 'admin';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  // null pour les comptes inscrits par téléphone (le backend masque l'email
  // interne phone_xxx@gofolyx.internal) — utiliser `phone` dans ce cas.
  email: string | null;
  username: string | null;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  location: string | null;
  website: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_online?: boolean | null;
  is_live?: boolean | null;
  verification_status?: VerificationStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified?: boolean;
  bio?: string | null;
  is_online?: boolean | null;
  is_live?: boolean | null;
}

export interface UserPublicProfile extends UserPublic {
  followers_count:         number;
  following_count:         number;
  publications_count:      number;
  is_followed:             boolean;
  banner_url?:             string | null;
  first_name?:             string | null;
  last_name?:              string | null;
  location?:               string | null;
  website?:                string | null;
  created_at?:             string | null;
  privacy_allow_messages?: boolean;
  privacy_profile_public?: boolean;
}

export interface LoginRequest { identifier: string; password: string; }
export interface RegisterRequest {
  first_name: string; last_name: string; email?: string;
  phone?: string; password: string; username?: string;
  referral_code?: string;
  date_of_birth: string; gender: Gender;
  /** Anti-bot : timestamp (epoch ms) de montage du formulaire. */
  form_started_at?: number;
  /** Anti-bot : honeypot, doit toujours rester vide/undefined pour un humain. */
  website_url?: string;
  /** Anti-bot : identifiant d'appareil stable (voir utils/deviceFingerprint.ts). */
  device_fingerprint?: string;
}
export interface AuthToken { access_token: string; refresh_token: string; token_type: string; }
export interface UserUpdate {
  first_name?: string; last_name?: string; username?: string; display_name?: string;
  bio?: string; avatar_url?: string; banner_url?: string; phone?: string;
  date_of_birth?: string; gender?: Gender; location?: string; website?: string;
}

// ── Content ───────────────────────────────────────────────────────────────
export type ContentType = 'film' | 'serie';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface Content {
  id: string; type: ContentType; title: string; original_title: string | null;
  year: number; synopsis: string | null; short_synopsis: string | null;
  director: string | null; cast: Record<string, string> | null; language: string;
  genre: string | null; country: string | null; rating: string | null; thumbnail_url: string | null;
  banner_url: string | null; trailer_url: string | null; is_premium: boolean;
  price: number | null; status: ContentStatus; total_seasons: number;
  view_count: number; average_rating: number | null; published_at: string | null;
  created_at: string; updated_at: string;
}

export interface Season {
  id: string; content_id: string; number: number; title: string | null;
  synopsis: string | null; year: number | null; total_episodes: number; created_at: string;
}

export interface Episode {
  id: string; season_id: string; number: number; title: string; synopsis: string | null;
  duration_sec: number | null; thumbnail_url: string | null; video_url: string | null;
  is_free: boolean; is_published: boolean; view_count: number; created_at: string;
}

export interface VideoMeta {
  id: string; content_id?: string | null; episode_id?: string | null; label: string;
  is_default: boolean; is_free: boolean;
  hls_url: string | null;
  hls_480p_url?: string | null;
  hls_720p_url?: string | null;
  hls_1080p_url?: string | null;
  duration_sec?: number | null; transcode_status?: string; created_at?: string;
}

// ── Concert ───────────────────────────────────────────────────────────────
export type ConcertType = 'live' | 'replay' | 'live_and_replay';
export type AccessType = 'free' | 'subscription' | 'ticket' | 'ppv';
export type ConcertStatus = 'draft' | 'published' | 'live' | 'ended' | 'archived' | 'limited';

export interface Concert {
  id: string; artist_id: string; title: string; description: string | null;
  genre: string | null; venue_name: string | null; venue_city: string | null;
  venue_country: string | null; scheduled_at: string; duration_min: number | null;
  concert_type: ConcertType; access_type: AccessType; status: ConcertStatus;
  ticket_price: number | null; ticket_price_vip: number | null; ticket_price_vvip: number | null; ticket_price_vvvip: number | null;
  max_viewers: number | null; current_viewers: number;
  view_count: number; like_count: number; comment_count: number;
  thumbnail_url: string | null; banner_url: string | null;
  video_url: string | null; is_featured: boolean; published_at: string | null;
  created_at: string; updated_at: string; artist?: User;
  user_reaction?: 'like' | 'dislike' | null;
  category?: string | null;
  ai_analysis_status?: 'pending' | 'done' | null;
}

export interface StreamToken { token: string; room_name: string; livekit_url: string; }
export interface StreamStatus { is_live: boolean; current_viewers: number; started_at: string | null; livekit_url: string | null; }

// ── Live simple ────────────────────────────────────────────────────────────
export type LiveStatus = 'active' | 'ended';
export interface LiveStream {
  id:              string;
  user_id:         string;
  title:           string;
  description:     string | null;
  thumbnail_url:   string | null;
  status:          LiveStatus;
  current_viewers: number;
  peak_viewers:    number;
  likes_count:     number;
  is_featured:     boolean;
  is_private:      boolean;
  started_at:      string;
  ended_at:        string | null;
  user:            User | null;
  // Spotlight épinglé par le host, synchronisé pour tous les viewers.
  pinned_identity?: string | null;
  // Monétisation accès
  is_monetized?:          boolean;
  monetization_type?:     string | null;
  monetization_gogold?:    number | null;
  monetization_gift_id?:  string | null;
  monetization_gift_name?: string | null;
  monetization_gift_emoji?: string | null;
  // Monétisation montée scène
  stage_monetized?:       boolean;
  stage_type?:            string | null;
  stage_gogold?:           number | null;
  stage_gift_id?:         string | null;
  stage_gift_name?:       string | null;
  stage_gift_emoji?:      string | null;
}
export interface LiveStartResponse {
  live:        LiveStream;
  token:       string;
  room_name:   string;
  livekit_url: string;
}
export interface LiveStatusResponse {
  is_active:       boolean;
  current_viewers: number;
  started_at:      string;
  ended_at:        string | null;
  livekit_url:     string | null;
}

// ── Event ─────────────────────────────────────────────────────────────────
export type EventType = 'concert' | 'birthday' | 'festival' | 'conference' | 'sport' | 'theater' | 'exhibition' | 'other';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed' | 'limited' | 'archived';
export type EventAccessType = 'free' | 'ticket' | 'invite_only';

export interface Event {
  id: string; organizer_id: string; title: string; description: string | null;
  event_type: EventType; status: EventStatus; access_type: EventAccessType;
  venue_name: string | null; venue_address: string | null; venue_city: string;
  venue_country: string; is_online: boolean; online_url: string | null;
  starts_at: string; ends_at: string | null; ticket_price: number | null;
  ticket_price_vip: number | null; ticket_price_vvip: number | null; ticket_price_vvvip: number | null;
  max_attendees: number | null; current_attendees: number;
  like_count: number; comment_count: number; share_count: number;
  thumbnail_url: string | null; banner_url: string | null; gallery_urls: string[] | null;
  video_url: string | null; is_featured: boolean; published_at: string | null;
  created_at: string; updated_at: string; organizer?: User;
  user_reaction?: 'like' | 'dislike' | null;
  is_boosted?: boolean;
  category?: string | null;
  ai_analysis_status?: 'pending' | 'done' | null;
}

// ── Sound ─────────────────────────────────────────────────────────────────
export interface Sound {
  id: string;
  title: string;
  artist_name: string | null;
  duration_seconds: number | null;
  file_url: string;
  cover_url: string | null;
  usage_count: number;
  is_original: boolean;
  created_at: string;
  created_by?: UserPublic | null;
}

// ── Reel ──────────────────────────────────────────────────────────────────
export type ReelStatus = 'processing' | 'published' | 'archived' | 'limited';
export type ReelRemixType = 'remix' | 'repost' | null;

export interface Reel {
  id: string; user_id: string; caption: string | null;
  hls_url: string | null;
  thumbnail_url: string | null; duration_sec: number | null; status: ReelStatus;
  ref_content_id: string | null; ref_concert_id: string | null; ref_event_id: string | null;
  view_count: number; like_count: number; dislike_count: number; comment_count: number;
  share_count: number; remix_count: number; repost_count: number; cable_count: number;
  comments_disabled: boolean;
  remix_type?: ReelRemixType;
  source_reel?: { id: string; thumbnail_url: string | null; author?: { display_name?: string | null; username?: string | null } } | null;
  is_featured: boolean; created_at: string; updated_at: string;
  author?: User; user_reaction?: 'like' | 'dislike' | null;
  filter_name?: string | null;
  text_layers?: string | null;
  sticker_layers?: string | null;
  draw_layers?: string | null;
  video_adjust?: string | null;
  music_url?: string | null;
  music_name?: string | null;
  music_start_sec?: number | null;
  music_end_sec?: number | null;
  // Badge "analyse en cours" cote createur uniquement (n'a de sens que pour
  // le proprietaire du reel, comme user_reaction) — cf. moderation_pipeline.py
  // cote ai_service. "pending" | "done" | undefined (jamais analyse).
  ai_analysis_status?: 'pending' | 'done' | null;
}

// ── Post ──────────────────────────────────────────────────────────────────
export interface PostAuthor { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; is_verified?: boolean; }
export interface Post {
  id: string; user_id: string; body?: string | null;
  image_url?: string | null; image_urls?: string[] | null;
  video_url?: string | null; hls_url?: string | null; thumbnail_url?: string | null;
  video_width?: number | null; video_height?: number | null;
  feeling?: string | null; like_count: number; comment_count: number; share_count: number;
  created_at: string; updated_at: string; author?: PostAuthor | null;
  user_reaction?: 'like' | 'dislike' | null;
  category?: string | null;
  ai_analysis_status?: 'pending' | 'done' | null;
  is_private?: boolean;
}
export interface PostCreate { body?: string; image_url?: string; feeling?: string; is_private?: boolean; }

// ── Story ─────────────────────────────────────────────────────────────────
export type StoryMediaType = 'image' | 'video' | 'text' | 'audio' | 'voice';
export type StoryAudienceType = 'everyone' | 'selected' | 'except';
export interface StoryAuthor { id: string; username: string; display_name: string | null; avatar_url: string | null; is_verified?: boolean; }
export interface Story {
  id: string; user_id: string; media_url: string | null; media_type: StoryMediaType;
  thumbnail_url: string | null; caption: string | null; duration_sec: number;
  view_count: number; like_count?: number; liked_by_me?: boolean;
  is_active: boolean; expires_at: string; created_at: string;
  background_color: string | null; audio_url: string | null; audio_name?: string | null; font_style: string | null;
  overlays_json: string | null;
  filter_key?: string | null; filter_overlay_color?: string | null; filter_overlay_opacity?: number | null;
  audience_type?: StoryAudienceType;
  author: StoryAuthor | null; viewed_by_me: boolean;
}
export interface StoryGroup { user: StoryAuthor; stories: Story[]; has_unseen: boolean; }

// ── Social ────────────────────────────────────────────────────────────────
export interface Comment {
  id: string; user_id: string; body: string; is_edited: boolean;
  like_count: number; reply_count?: number; parent_id: string | null;
  created_at: string; updated_at: string;
  liked?: boolean;
  author?: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; } | null;
}
export type ReactionType = 'like' | 'dislike';

// ── Community ─────────────────────────────────────────────────────────────
export interface Community {
  id: string; name: string; description: string | null; avatar_url: string | null;
  banner_url: string | null; member_count: number; members_count?: number;
  is_private: boolean; is_verified?: boolean;
  creator?: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
  is_member?: boolean;
  created_at: string; updated_at: string;
  is_boosted?: boolean;
}

// ── Notification ──────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  ref_id?: string | null;
  ref_type?: string | null;
  is_read: boolean;
  created_at: string;
  actor?: { id: string; username: string; display_name: string; avatar_url: string | null };
}

// ── Message ───────────────────────────────────────────────────────────────
export type ConversationRequestStatus =
  | 'none' | 'pending_incoming' | 'pending_outgoing' | 'accepted' | 'blocked' | 'blocked_by_me';
export interface Conversation {
  user: UserPublic; last_message: string | null; last_message_at: string | null; unread_count: number;
  request_status?: ConversationRequestStatus;
}
export interface Message {
  id: string; sender_id: string; receiver_id: string; body: string | null;
  media_url: string | null; media_type: string | null; is_read: boolean; created_at: string;
}

// ── Subscription ──────────────────────────────────────────────────────────
export interface Plan { id: string; name: string; price: number; currency: string; duration_days: number; features: string[]; }
export interface Subscription { id: string; user_id: string; plan_id: string; status: string; starts_at: string; ends_at: string; plan?: Plan; }

// ── Pagination ────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> { items: T[]; total: number; page: number; limit: number; pages: number; }
export interface ApiErrorResponse { detail: string; status_code?: number; }

// ── Application Constants ────────────────────────────────────────────────────

/** Bcrypt salt rounds for password hashing */
export const BCRYPT_ROUNDS = 10;

/** JWT token expiry duration */
export const JWT_EXPIRY = "24h";

/** Default coordinates (Abidjan, Côte d'Ivoire) */
export const DEFAULT_LATITUDE = 5.36;
export const DEFAULT_LONGITUDE = -4.0083;

/** Default working hours */
export const DEFAULT_WORKING_HOURS_START = "08:00";
export const DEFAULT_WORKING_HOURS_END = "18:00";

/** Body parser size limit */
export const BODY_SIZE_LIMIT = "10mb";

/** Preset avatar URLs for new employees */
export const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
];

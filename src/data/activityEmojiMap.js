/**
 * Emoji mapping for activity types in the Journey View.
 * Phase 2A-2: used for card title prefixes.
 * Phase 2A-3: will also drive per-query emoji in section headers.
 */

export const ACTIVITY_EMOJI_MAP = {
  netflix: '📺',
  youtube: '📺',
  streaming: '📺',
  chatgpt: '💬',
  claude: '💬',
  ai_chat: '💬',
  bitcoin: '⛏️',
  crypto: '⛏️',
  instagram: '📱',
  tiktok: '📱',
  social: '📱',
  spotify: '🎵',
  music: '🎵',
  google_search: '🔍',
  search: '🔍',
  ai_image: '🎨',
  zoom: '📹',
  video_call: '📹',
  cloud_storage: '☁️',
  default: '⚡',
};

export function getActivityEmoji(activityId) {
  return ACTIVITY_EMOJI_MAP[activityId] || ACTIVITY_EMOJI_MAP.default;
}

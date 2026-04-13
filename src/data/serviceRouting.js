/**
 * Service routing context — explains how different digital services
 * route requests to data centers, which affects whether user location
 * meaningfully impacts which facility handles their traffic.
 *
 * routing types:
 *   cdn_edge — served from nearby CDN/edge nodes, user location matters a lot
 *   gpu_cluster — runs on specialized hardware in select regions, user location matters less
 *   global_edge — served from nearest edge node in a global network
 *   cdn_plus_recommendation — content from CDN, but compute runs centrally
 *   regional — served from regional data centers
 */

const SERVICE_ROUTING = {
  // Streaming
  netflix_hd_per_hour: {
    routing: 'cdn_edge',
    location_relevance: 'high',
    note: 'Netflix Open Connect embeds servers inside ISP networks. Your video likely streams from a box in your ISP\'s building, so your location strongly affects which facility is used.',
  },
  netflix_4k_per_hour: {
    routing: 'cdn_edge',
    location_relevance: 'high',
    note: 'Netflix Open Connect embeds servers inside ISP networks. Your video likely streams from a box in your ISP\'s building, so your location strongly affects which facility is used.',
  },
  youtube_hd_per_hour: {
    routing: 'global_edge',
    location_relevance: 'high',
    note: 'YouTube uses Google\'s global edge network with caching nodes worldwide. Popular videos are served from nearby nodes.',
  },
  youtube_sd_per_hour: {
    routing: 'global_edge',
    location_relevance: 'high',
    note: 'YouTube uses Google\'s global edge network with caching nodes worldwide. Popular videos are served from nearby nodes.',
  },
  tiktok_per_hour: {
    routing: 'cdn_plus_recommendation',
    location_relevance: 'medium',
    note: 'Videos stream from CDN edge servers near you, but the recommendation engine that decides what to show runs on central GPU clusters. Your location partially matters.',
  },
  zoom_video_call_per_hour: {
    routing: 'regional',
    location_relevance: 'high',
    note: 'Zoom routes calls through the nearest regional data center to minimize latency. Your location directly determines which facility processes your call.',
  },

  // AI queries
  chatgpt_single_query: {
    routing: 'gpu_cluster',
    location_relevance: 'low',
    note: 'ChatGPT runs on specialized GPU clusters in select regions (primarily Iowa, Virginia, and Arizona). Your location has little influence on which facility handles your query.',
  },
  chatgpt_conversation: {
    routing: 'gpu_cluster',
    location_relevance: 'low',
    note: 'ChatGPT runs on specialized GPU clusters in select regions. Your location has little influence on which facility handles your conversation.',
  },
  google_gemini_query: {
    routing: 'gpu_cluster',
    location_relevance: 'low',
    note: 'Gemini runs on Google\'s TPU clusters in select data centers. Your location has minimal influence on routing.',
  },
  ai_image_generation: {
    routing: 'gpu_cluster',
    location_relevance: 'low',
    note: 'Image generation requires GPU hardware concentrated in a few large facilities. Your location has little effect on which data center processes your request.',
  },
  ai_video_generation_5sec: {
    routing: 'gpu_cluster',
    location_relevance: 'low',
    note: 'Video generation requires massive GPU resources in specialized facilities. Your location has minimal influence on routing.',
  },

  // Search
  google_search: {
    routing: 'global_edge',
    location_relevance: 'high',
    note: 'Google Search uses a massive global edge network. Your query is handled by the nearest Google data center, making your location very relevant.',
  },
  google_ai_overview_search: {
    routing: 'cdn_plus_recommendation',
    location_relevance: 'medium',
    note: 'The search portion uses nearby edge servers, but AI Overview generation may run on central GPU clusters. Your location partially matters.',
  },

  // Social media
  facebook_per_hour: {
    routing: 'cdn_plus_recommendation',
    location_relevance: 'medium',
    note: 'Images and videos load from nearby CDN nodes, but the feed ranking algorithm runs on central servers. Your location partially matters.',
  },
  instagram_per_hour: {
    routing: 'cdn_plus_recommendation',
    location_relevance: 'medium',
    note: 'Photos and Reels stream from CDN edge servers, but the recommendation engine runs centrally. Your location partially matters.',
  },
  twitter_per_hour: {
    routing: 'cdn_plus_recommendation',
    location_relevance: 'medium',
    note: 'Timeline content is cached at edge nodes, but the ranking algorithm runs on central servers.',
  },
  snapchat_per_hour: {
    routing: 'cdn_plus_recommendation',
    location_relevance: 'medium',
    note: 'Snaps and Stories load from CDN, but filters and recommendations run centrally on Google Cloud.',
  },

  // Email
  email_regular: {
    routing: 'regional',
    location_relevance: 'medium',
    note: 'Email is processed at regional data centers. Your provider\'s infrastructure location matters more than your physical location.',
  },
  email_with_attachment: {
    routing: 'regional',
    location_relevance: 'medium',
    note: 'Email with attachments is stored and processed at regional data centers.',
  },

  // Gaming
  cloud_gaming_per_hour: {
    routing: 'regional',
    location_relevance: 'high',
    note: 'Cloud gaming requires low-latency GPU rendering, so it must run at a nearby data center. Your location strongly affects which facility is used.',
  },
  console_gaming_per_hour: {
    routing: 'local',
    location_relevance: 'none',
    note: 'Offline console gaming uses no data center resources. All energy is consumed by your device at home.',
  },
  mobile_gaming_per_hour: {
    routing: 'regional',
    location_relevance: 'low',
    note: 'Most mobile games use minimal server resources. Multiplayer games connect to nearby regional servers.',
  },

  // Crypto
  bitcoin_transaction: {
    routing: 'global_distributed',
    location_relevance: 'none',
    note: 'Bitcoin mining is distributed worldwide across mining pools. Your location has no effect — the energy cost is determined by the global mining network.',
  },
  ethereum_transaction: {
    routing: 'global_distributed',
    location_relevance: 'none',
    note: 'Ethereum validators are distributed globally. Your location does not affect which validators process your transaction.',
  },
};

/**
 * Get routing context for an activity.
 * @param {string} activityId
 * @returns {object|null}
 */
export function getServiceRouting(activityId) {
  return SERVICE_ROUTING[activityId] || null;
}

/**
 * Get a short relevance label for display.
 */
export function getLocationRelevanceLabel(activityId) {
  const routing = SERVICE_ROUTING[activityId];
  if (!routing) return null;

  const labels = {
    high: 'Your location strongly affects this estimate',
    medium: 'Your location partially affects this estimate',
    low: 'Your location has little effect on this estimate',
    none: 'Your location does not affect this estimate',
  };

  return labels[routing.location_relevance] || null;
}

export default SERVICE_ROUTING;

/**
 * Video is stored as a full URL everywhere — Django's `Room.video_url` and
 * `Service.video_url`, and the content modules mirror that. Embeds and
 * thumbnails need the bare 11-character ID, so derive it at the render
 * boundary rather than persisting a second representation that can drift.
 */

const PATTERNS = [
  /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
];

/** Returns the video ID, or null when the URL isn't a recognisable YouTube link. */
export function youtubeEmbedId(url: string | null | undefined): string | null {
  if (!url) return null;

  for (const pattern of PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // Tolerate a bare ID so seeded data and admin paste-ins both work.
  return /^[\w-]{11}$/.test(url) ? url : null;
}

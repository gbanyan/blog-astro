/**
 * Mastodon API utilities for fetching and processing toots
 */

export interface MastodonStatus {
  id: string;
  content: string;
  created_at: string;
  url: string;
  reblog: MastodonStatus | null;
  account: {
    username: string;
    display_name: string;
    avatar: string;
  };
  media_attachments: Array<{
    id: string;
    type: 'image' | 'video' | 'gifv' | 'audio' | 'unknown';
    url: string | null;
    preview_url: string | null;
    description: string | null;
    blurhash?: string | null;
  }>;
}

/**
 * Parse Mastodon URL to extract instance domain and username
 * @param url - Mastodon profile URL (e.g., "https://mastodon.social/@username")
 * @returns Object with instance and username, or null if invalid
 */
export function parseMastodonUrl(url: string): { instance: string; username: string } | null {
  try {
    const urlObj = new URL(url);
    const instance = urlObj.hostname;
    const pathMatch = urlObj.pathname.match(/^\/@?([^/]+)/);

    if (!pathMatch) return null;

    const username = pathMatch[1];
    return { instance, username };
  } catch {
    return null;
  }
}

/**
 * Strip HTML tags from content and decode HTML entities
 * @param html - HTML content from Mastodon post
 * @returns Plain text content
 */
export function stripHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p><p>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  return text.trim();
}

/**
 * Truncate text smartly, avoiding cutting words in half
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 180)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 180): string {
  if (text.length <= maxLength) return text;

  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If there's a space, cut at the space; otherwise use maxLength
  const cutPoint = lastSpace > maxLength * 0.8 ? lastSpace : maxLength;

  return text.substring(0, cutPoint).trim() + '...';
}

/**
 * Format timestamp as relative time in Chinese
 * @param dateString - ISO date string
 * @returns Relative time string (e.g., "2小時前")
 */
export function formatRelativeTime(dateString: string, locale: 'zh-TW' | 'en' = 'zh-TW'): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (locale === 'en') {
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
    if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
    return `${Math.floor(diffDay / 365)}y ago`;
  }

  if (diffSec < 60) return '剛剛';
  if (diffMin < 60) return `${diffMin}分鐘前`;
  if (diffHour < 24) return `${diffHour}小時前`;
  if (diffDay < 7) return `${diffDay}天前`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}週前`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}個月前`;

  return `${Math.floor(diffDay / 365)}年前`;
}

/**
 * Fetch user's Mastodon account ID from username
 * @param instance - Mastodon instance domain
 * @param username - Username without @
 * @returns Account ID or null if not found
 */
export async function fetchAccountId(instance: string, username: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://${instance}/api/v1/accounts/lookup?acct=${username}`,
      { cache: 'no-store' }
    );

    if (!response.ok) return null;

    const account = await response.json();
    return account.id;
  } catch (error) {
    console.error('Error fetching Mastodon account:', error);
    return null;
  }
}

/**
 * Fetch user's recent statuses from Mastodon
 * @param instance - Mastodon instance domain
 * @param accountId - Account ID
 * @param limit - Number of statuses to fetch (default: 5)
 * @returns Array of statuses or empty array on error
 */
export async function fetchStatuses(
  instance: string,
  accountId: string,
  limit: number = 5
): Promise<MastodonStatus[]> {
  try {
    const response = await fetch(
      `https://${instance}/api/v1/accounts/${accountId}/statuses?limit=${limit}&exclude_replies=true`,
      { cache: 'no-store' }
    );

    if (!response.ok) return [];

    const statuses = await response.json();
    return statuses;
  } catch (error) {
    console.error('Error fetching Mastodon statuses:', error);
    return [];
  }
}

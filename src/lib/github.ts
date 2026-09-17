export type RepoSummary = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  updatedAt: string;
};

const GITHUB_API_BASE = 'https://api.github.com';

function getGithubHeaders() {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'blog-nextjs-app',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token && token.trim() !== '') {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch all public repositories for the configured GitHub user.
 * Excludes forked repositories. Returns an empty array on error instead of
 * throwing, so the UI can render a graceful fallback.
 */
export async function fetchPublicRepos(usernameOverride?: string): Promise<RepoSummary[]> {
  const username = usernameOverride || process.env.GITHUB_USERNAME;

  if (!username) {
    console.error('GITHUB_USERNAME is not set; cannot fetch GitHub repositories.');
    return [];
  }

  const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(
    username
  )}/repos?type=public&sort=updated`;

  try {
    const res = await fetch(url, {
      headers: getGithubHeaders(),
    });

    if (!res.ok) {
      console.error('Failed to fetch GitHub repositories:', res.status, res.statusText);
      return [];
    }

    const data = (await res.json()) as any[];

    return data
      .filter((repo) => !repo.fork)
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        description: repo.description,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        updatedAt: repo.updated_at,
      }));
  } catch (error) {
    console.error('Error while fetching GitHub repositories:', error);
    return [];
  }
}


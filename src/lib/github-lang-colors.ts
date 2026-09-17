/**
 * GitHub-style language colors for repo cards.
 * Fallback: #94a3b8 (slate-400) for unknown languages.
 */
const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Java: '#b07219',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#239120',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Dart: '#00B4AB',
  Scala: '#c22d40',
  Elixir: '#6e4a7e',
  Lua: '#000080',
  R: '#198CE7',
  Markdown: '#083fa1',
  YAML: '#cb171e',
  JSON: '#292929',
};

const FALLBACK_COLOR = '#94a3b8';

/**
 * Returns the GitHub-style hex color for a programming language.
 * Unknown languages use a neutral slate fallback.
 */
export function getLanguageColor(lang: string | null): string {
  if (!lang || !lang.trim()) return FALLBACK_COLOR;
  return LANG_COLORS[lang] ?? FALLBACK_COLOR;
}

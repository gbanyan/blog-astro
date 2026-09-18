// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Flat ESLint config for blog-astro.
 *
 * Scope: everything except the ignores below — in practice `src/**` (TS +
 * React islands) plus the root config files. Plain `node_modules` is
 * ignored by ESLint itself.
 *
 * Intentional ignores:
 *  - `dist/`   build output
 *  - `.astro/` generated Astro cache/types
 *  - `content/` git submodule (separate personal-blog repo, markdown only)
 *  - `public/` synced assets (copied from content/assets)
 *  - `.superpowers/` agent tooling
 *  - `scripts/` plain-node `.mjs` build tooling — kept OUT of the lint gate
 *    on purpose (no TS, no React). They are still type-checked by
 *    `tsc --noEmit` via tsconfig `include`. Revisit if they grow.
 *
 * Rule set:
 *  - @eslint/js recommended
 *  - typescript-eslint recommended (syntax layer only — no type-checked
 *    rules; `tsc --noEmit` owns the type gate)
 *  - react-hooks: only the two long-standing rules (`rules-of-hooks`,
 *    `exhaustive-deps`). The installed eslint-plugin-react-hooks v7
 *    `recommended` preset also enables React-Compiler-era rules
 *    (`use-memo`, `purity`, `refs`, `gating`, …) that flag the ported
 *    pre-compiler code from blog-nextjs — that would fight the port, so
 *    they stay off.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'content/**',
      'public/**',
      '.superpowers/**',
      'scripts/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);

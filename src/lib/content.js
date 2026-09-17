// Node-side entry for the plain-`node` i18n scripts (check-i18n-content.mjs,
// i18n-validation-adapter.mjs): Node cannot resolve the `@/` alias or the
// extensionless TS specifiers used by the app, so the scripts load the
// content layer through this shim, which re-exports the TypeScript module
// (executed natively by Node's type stripping). The Astro/Vite app keeps
// importing `@/lib/content` directly.
export * from './content.ts';
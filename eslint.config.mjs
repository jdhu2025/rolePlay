// ESLint flat config for Next.js + TypeScript projects.
//
// Why this file exists:
// - eslint v9 dropped automatic discovery of `.eslintrc.*` files; it now only
//   reads `eslint.config.{js,mjs,cjs}`. Without this file `pnpm lint` fails with
//   "ESLint couldn't find an eslint.config.* file".
// - eslint-config-next v16 already exports a flat-config-shaped array, so we
//   just spread it. Project-specific overrides go below.

import nextConfig from 'eslint-config-next';

// Paths that are vendored from shadcn / magicui / fumadocs / template
// scaffolds. We don't want to rewrite these on every `pnpm lint`; the noise
// comes from rules that ship in react-hooks 7.x and Next 16's flat config but
// don't match the patterns these libraries use. Scope the noisiest rules to
// off here, but keep them on for app code under `src/app`, `src/data`,
// `src/shared/components/roleplay/**`, `src/shared/lib/**`, and `src/core`.
const VENDORED_GLOBS = [
  'src/shared/components/ui/**',
  'src/shared/components/magicui/**',
  'src/shared/components/ai-elements/**',
  'src/shared/blocks/**',
  'src/shared/hooks/**',
  'src/themes/**',
  'src/mdx-components.tsx',
  'src/core/theme/**',
  'src/shared/types/**',
  'src/shared/lib/rate-limit.ts',
  // Bracketed Next.js route segments need their brackets escaped because the
  // glob library treats `[]` as character classes. The `[[]xxx[]]` form
  // matches a literal `[xxx]` segment.
  'src/app/[[]locale[]]/[(]landing[)]/[[]...slug[]]/page.tsx',
  'src/app/[[]locale[]]/[(]chat[)]/chat/[[]id[]]/page.tsx',
];

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    // Project-specific ignores. Next-config already ignores `.next/`, `out/`,
    // `build/`, and `next-env.d.ts`. We add scratch / generated locations.
    ignores: [
      'node_modules/**',
      'output/**',
      'public/**',
      'content/**',
      'scripts/**',
      'src/config/db/migrations/**',
      '.open-next/**',
    ],
  },
  {
    // react-hooks 7.x ships a new `set-state-in-effect` rule that flags any
    // synchronous setState call inside an effect body. The pattern is in fact
    // idiomatic and necessary in many cases:
    //  - "mount flag" anti-hydration shims: `useEffect(() => setMounted(true), [])`
    //  - reading initial value from window / matchMedia and setting state
    //  - resetting state when an external dependency changes
    // The rule is debatable and the React team has not deprecated these
    // patterns. Keep it off to avoid false positives across the template's
    // vendored UI components (sonner, sidebar, animated-grid, magicui, etc.)
    // and the third-party hooks (use-media, use-media-query).
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Vendored / template surface area. These directories are imported as-is
    // from shadcn, magicui, fumadocs MDX, and the ShipAny template scaffold.
    // The errors they trigger are real but not actionable inside this app:
    //  - `react-hooks/rules-of-hooks` early returns before hooks (template
    //    pattern in locale-detector / payment / social providers).
    //  - `react-hooks/exhaustive-deps` missing/extra deps the original
    //    upstream code accepts intentionally.
    //  - `react-hooks/static-components` ("Cannot create components during
    //    render", "Cannot call impure function during render", "Avoid
    //    constructing JSX within try/catch") — react-hooks 7 strictness
    //    that the shadcn sidebar and the animated-* primitives don't follow.
    //  - `@next/next/no-img-element` because these blocks predate
    //    next/image migration.
    //  - `@next/next/no-assign-module-variable` because of dynamic icon /
    //    theme import patterns that name a local variable `module`.
    //  - `react/display-name` for the HOC inside `mdx-components.tsx`.
    //  - `import/no-anonymous-default-export` for config-style files.
    files: VENDORED_GLOBS,
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      // react-hooks 7 ships a family of compiler-style rules. Each one fires
      // its own message but maps to a distinct rule id under react-hooks/*.
      // We disable the strict ones in vendored code:
      //   error-boundaries  → "Avoid constructing JSX within try/catch"
      //   static-components → "Cannot create components during render"
      //   purity            → "Cannot call impure function during render"
      //   immutability      → "Cannot access variable before it is declared"
      'react-hooks/error-boundaries': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-assign-module-variable': 'off',
      'react/display-name': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
];

export default config;


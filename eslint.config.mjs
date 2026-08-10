import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Architecture enforcement lives here.
 *
 * The Clean Architecture dependency rule and the modular-monolith boundaries are not
 * documentation — they are lint errors. If a rule below ever feels obstructive, that is
 * the signal to revisit the architecture deliberately, not to add an eslint-disable.
 *
 * See the architecture plan §2.3 (module boundaries) and §4 (layer responsibilities).
 *
 * IMPLEMENTATION NOTE — two traps worth knowing about, both verified by
 * `backend/tests/architecture/boundaries.test.ts`:
 *
 *  1. Flat config REPLACES a rule when a later block sets the same rule name. Layer rules
 *     and module rules therefore cannot live in separate blocks that both match a file —
 *     the second would silently erase the first. Every glob gets exactly ONE
 *     `no-restricted-imports` entry, assembled below.
 *
 *  2. `no-restricted-imports` matches the literal import STRING, not the resolved path.
 *     A real cross-module import reads `../../catalog/domain/x.js`, which contains no
 *     `modules/` segment. Patterns must be written against relative shapes.
 */

/** Domain modules in the backend monolith. Add here when a module is genuinely split out. */
const MODULES = ['catalog', 'investigation'];

const LAYERS = ['domain', 'application', 'interface', 'infrastructure'];

/** Packages that mean "you are touching the outside world". */
const OUTER_WORLD = [
  'express',
  'express/*',
  'cors',
  'drizzle-orm',
  'drizzle-orm/*',
  'postgres',
  'postgres/*',
  '@dd/shared',
];

const DRIVERS = ['drizzle-orm', 'drizzle-orm/*', 'postgres', 'postgres/*'];

/**
 * The dependency rule, per layer. Inner layers may not name outer ones.
 * Infrastructure is unconstrained by layer — it exists precisely to depend inward.
 */
function layerRestrictions(layer) {
  switch (layer) {
    case 'domain':
      return [
        {
          group: OUTER_WORLD,
          message:
            'The domain layer must not depend on frameworks, drivers, or transport concerns. ' +
            'This is what keeps domain tests runnable with no DB and no network.',
        },
        {
          group: ['**/application/**', '**/interface/**', '**/infrastructure/**', '**/platform/**'],
          message: 'Dependencies point inward. The domain cannot import an outer layer.',
        },
      ];
    case 'application':
      return [
        {
          group: [...DRIVERS, 'express', 'express/*', 'cors'],
          message:
            'Use cases depend on ports, not on Drizzle or Express. Declare an interface in ' +
            'ports.ts and implement it in infrastructure.',
        },
        {
          group: ['**/interface/**', '**/infrastructure/**'],
          message:
            'Dependencies point inward. Application cannot import interface or infrastructure.',
        },
      ];
    case 'interface':
      return [
        {
          group: [...DRIVERS, '**/infrastructure/**'],
          message: 'Controllers must not touch persistence. Go through a use case.',
        },
      ];
    default:
      return [];
  }
}

/**
 * Cross-module imports must go through the module's public API (`modules/<name>/index.ts`).
 * Each module's index exports a `create<Name>Module()` factory that wires its own internals,
 * so even the composition root never reaches past the front door.
 */
function crossModuleRestrictions(currentModule) {
  return MODULES.filter((m) => m !== currentModule).map((other) => ({
    group: LAYERS.flatMap((layer) => [`**/${other}/${layer}/**`, `**/${other}/${layer}`]),
    message:
      `Do not reach into the '${other}' module. Import its public API ` +
      `(modules/${other}) instead — see architecture plan §2.3.`,
  }));
}

/** One config block per module/layer pair, with layer + module rules already merged. */
const moduleBoundaryConfigs = MODULES.flatMap((mod) => [
  ...LAYERS.map((layer) => ({
    files: [`backend/src/modules/${mod}/${layer}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...layerRestrictions(layer), ...crossModuleRestrictions(mod)] },
      ],
    },
  })),
  {
    // The module's own front door (index.ts) — module rules only, no layer rules.
    files: [`backend/src/modules/${mod}/*.ts`],
    rules: {
      'no-restricted-imports': ['error', { patterns: crossModuleRestrictions(mod) }],
    },
  },
]);

export default ts.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'backend/src/db/migrations/**'],
  },

  js.configs.recommended,
  ...ts.configs.recommended,

  // ---------------------------------------------------------------------------
  // Baseline for all TypeScript
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ---------------------------------------------------------------------------
  // Clean Architecture layers + modular monolith boundaries
  // ---------------------------------------------------------------------------
  ...moduleBoundaryConfigs,

  // Platform is cross-cutting plumbing: env, db client, http server, error mapping.
  // It must never contain queries or business rules, so it has no business importing
  // a domain module at all. Modules get wired together in composition.ts.
  {
    files: ['backend/src/platform/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/**'],
              message:
                'Platform is generic infrastructure and must not know about domain modules. ' +
                'Wire modules together in composition.ts instead.',
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------
  {
    files: ['backend/tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // Tests legitimately reach into internals to build fakes and assert wiring.
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // Frontend
  // ---------------------------------------------------------------------------
  ...vue.configs['flat/recommended'],
  {
    files: ['frontend/**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        parser: ts.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off', // views are single-word by design
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': ['error', { order: ['defineProps', 'defineEmits'] }],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
    },
  },
  {
    // The design system is only a design system if nobody bypasses it.
    files: ['frontend/src/**/*.vue'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message:
            'No raw hex colours in components. Add a token to design/tokens.css and ' +
            'reference it, or map the domain value in design/theme.ts.',
        },
      ],
    },
  },

  // Config files run in Node and are allowed to be scrappy.
  {
    files: ['**/*.config.{js,mjs,ts}', '**/vite.config.ts', '**/drizzle.config.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-restricted-imports': 'off',
      'no-console': 'off',
    },
  },

  // Must stay last: turns off everything that fights Prettier.
  prettier,
);

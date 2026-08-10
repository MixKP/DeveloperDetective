import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const MODULES = ['catalog', 'investigation'];

const LAYERS = ['domain', 'application', 'interface', 'infrastructure'];

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

function crossModuleRestrictions(currentModule) {
  return MODULES.filter((m) => m !== currentModule).map((other) => ({
    group: LAYERS.flatMap((layer) => [`**/${other}/${layer}/**`, `**/${other}/${layer}`]),
    message:
      `Do not reach into the '${other}' module. Import its public API ` +
      `(modules/${other}) instead — see architecture plan §2.3.`,
  }));
}

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

  ...moduleBoundaryConfigs,

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

  {
    files: ['backend/tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

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
      'vue/multi-word-component-names': 'off',
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': ['error', { order: ['defineProps', 'defineEmits'] }],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
    },
  },
  {
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

  {
    files: ['**/*.config.{js,mjs,ts}', '**/vite.config.ts', '**/drizzle.config.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-restricted-imports': 'off',
      'no-console': 'off',
    },
  },

  prettier,
);

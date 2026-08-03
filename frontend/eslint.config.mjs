import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Flat config wired from the plugins directly.
 *
 * `eslint-config-next` is deliberately NOT imported: it is still an eslintrc
 * config whose entry point unconditionally requires
 * `@rushstack/eslint-patch/modern-module-resolution`, which throws on ESLint 9
 * ("Failed to patch ESLint because the calling module was not recognized") and
 * took down both `next lint` and the lint step of `next build`. Its Next.js
 * rules live in `@next/eslint-plugin-next`, which ships a real flat config, so
 * we get the same coverage without the patch.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'test-results/**',
      'playwright-report/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.flatConfig.coreWebVitals.rules,
    },
  },

  reactHooks.configs['recommended-latest'],

  {
    rules: {
      // Unused variables are worth failing on, but allow the conventional
      // underscore prefix for deliberately-ignored bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
);

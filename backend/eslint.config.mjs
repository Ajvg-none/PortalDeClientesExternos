import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * X7.3 - ESLint (flat config) del backend. Reglas recomendadas de JS + TS,
 * entorno Node y globals de Jest para los tests. Sin reglas de estilo (eso es
 * responsabilidad de tsc/formatos), solo correccion.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // args de middlewares de Express (p. ej. `_next`) y payloads vacios de
      // Prisma son idiomaticos: se permiten con el prefijo `_` / tipos objeto.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);

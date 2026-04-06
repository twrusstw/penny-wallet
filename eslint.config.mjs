import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['main.js', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'off',
      'no-irregular-whitespace': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression[left.type='MemberExpression'][left.object.type='MemberExpression'][left.object.property.name='style']",
          message: "Avoid direct style assignment. Use element.setCssProps(), .show(), or .hide() instead.",
        },
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: "Avoid innerHTML. Use DOM creation methods (createEl, createDiv, setText) instead.",
        },
      ],
    },
  },
)

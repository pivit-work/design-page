import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments'
import noLiteralFontFamily from './eslint-rules/no-literal-font-family.js'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@eslint-community/eslint-comments': eslintComments,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // lint 에러를 주석으로 우회하는 것을 금지. 에러가 나면 코드를 고쳐야 한다.
      '@eslint-community/eslint-comments/no-use': ['error', { allow: [] }],
    },
  },
  {
    // 글씨체는 디자인 기준값 하나에서만 정한다 (PW-923). CSS 쪽은 scripts/check-font-families.mjs.
    // src/devtools/ 는 미리보기 사이트 개발 도구 창이라 화면이 아니다.
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/devtools/**', 'src/**/*.test.{js,jsx}'],
    plugins: { pivit: { rules: { 'no-literal-font-family': noLiteralFontFamily } } },
    rules: {
      'pivit/no-literal-font-family': 'error',
    },
  },
]

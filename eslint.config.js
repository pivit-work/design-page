import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments'
import noLiteralFontFamily from './eslint-rules/no-literal-font-family.js'

export default [
  // eslint-rules/fixtures/ 는 규칙이 무는지 재는 일부러 틀린 표본이다 (scripts/check-lint.mjs).
  { ignores: ['dist', 'eslint-rules/fixtures'] },
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
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@eslint-community/eslint-comments': eslintComments,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 들여오지 않은 이름을 화면 조각(<DpStatusBadge />)으로 쓰면 실패시킨다. 기본 검사는 JSX 안의
      // 이름을 안 봐서, 리포트 검수 화면이 그리는 순간 죽는 판(0.1.630)이 그대로 게시됐다 (PW-906).
      'react/jsx-no-undef': 'error',
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

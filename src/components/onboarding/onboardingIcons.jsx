/**
 * 온보딩 부품이 스스로 그리는 아이콘 — 진행 표시의 체크·자물쇠, 태그의 닫기, 버튼의 스피너.
 *
 * 시안(`8. onboarding/onboarding-app.jsx`)은 체크를 글리프 「✓」, 닫기를 「×」로 그렸다.
 * design-page 는 인라인 SVG 로 옮긴다.
 *
 * 규약: viewBox 0 0 24 24, fill none, stroke currentColor, strokeWidth 2, round cap/join,
 * aria-hidden. 크기는 size prop, 색은 부모의 color 상속(SVG 안에 리터럴 색 금지).
 * 두 곳 이상 쓰는 그림은 design-page `shared/lineIcons.jsx` 한 벌을 부른다(PW-1011).
 */

import { ArrowLeftGlyph, CheckGlyph, CloseGlyph, LockGlyph } from '../shared/lineIcons.jsx';

export function OnbCheckIcon({ size = 12 }) {
  return <CheckGlyph size={size} strokeWidth={3} />;
}

export function OnbLockIcon({ size = 11 }) {
  return <LockGlyph size={size} />;
}

export function OnbCloseIcon({ size = 14 }) {
  return <CloseGlyph size={size} />;
}

export function OnbArrowLeftIcon({ size = 14 }) {
  return <ArrowLeftGlyph size={size} />;
}

/** 시안 Spinner — 옅은 원 + 1/4 호. 색은 부모 color 를 따른다. */
export function OnbSpinner({ size = 16 }) {
  return (
    <svg className="onb-spinner" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Google 로고 — 브랜드 색이 정해진 자산이라 리터럴 색 예외. */
export function OnbGoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

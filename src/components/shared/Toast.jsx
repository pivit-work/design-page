import { createPortal } from 'react-dom';

/**
 * Toast — 화면 아래 가운데에 잠깐 떴다 사라지는 안내.
 *
 * 기획서 어드민 시안(`admin-app.jsx` 의 `Toast`)을 옮겼다. 색 셋 — 성공(초록 글자색
 * 토큰) · 안내(브랜드색) · 실패(빨강 글자색 토큰).
 *
 * 겹침 순서는 시안 숫자(200)가 아니라 «창 위»를 지킨다 — 앱은 창·드릴다운이 9999 까지
 * 올라가 있어 시안 숫자를 그대로 쓰면 창을 연 채 뜬 토스트가 창 뒤에 깔린다.
 *
 * 떴다 사라지는 시점은 호스트가 정한다 — `message` 가 비면 아무것도 그리지 않는다.
 * 나머지 속성(data-* 등)은 겉 상자에 그대로 붙는다.
 */
export default function Toast({ message, tone = 'success', ...rest }) {
  if (!message) return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`pw-toast pw-toast--${tone}`}
      data-tone={tone}
      {...rest}
    >
      {message}
    </div>,
    document.body,
  );
}

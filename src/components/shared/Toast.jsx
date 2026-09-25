import { createPortal } from 'react-dom';
import { CloseGlyph } from './lineIcons.jsx';

/**
 * Toast — 화면 아래 가운데에 잠깐 떴다 사라지는 안내.
 *
 * 기획서 어드민 시안(`admin-app.jsx` 의 `Toast`)을 옮겼다. 색 넷 — 성공(초록 글자색
 * 토큰) · 안내(브랜드색) · 실패(빨강 글자색 토큰) · 주의(주황 글자색 토큰 · PW-1010).
 *
 * 화면마다 따로 만든 토스트(어드민 연동·AI 프롬프트·팀 관리·직원 관리·결제 등)를 이 한 벌로
 * 모았다(PW-1010). `role` 은 기본 `status` 이고, 곧바로 읽혀야 하는 실패는 `role="alert"` 를
 * 넘겨 덮는다.
 *
 * 겹침 순서는 시안 숫자(200)가 아니라 «창 위»를 지킨다 — 앱은 창·드릴다운이 9999 까지
 * 올라가 있어 시안 숫자를 그대로 쓰면 창을 연 채 뜬 토스트가 창 뒤에 깔린다.
 *
 * 떴다 사라지는 시점은 호스트가 정한다 — `message` 가 비면 아무것도 그리지 않는다.
 * `onClose` 를 주면 오른쪽에 닫기(×) 버튼이 붙는다(어드민 항목 관리 · PW-1010).
 * 나머지 속성(data-* 등)은 겉 상자에 그대로 붙는다.
 */
export default function Toast({ message, tone = 'success', onClose, closeLabel = '닫기', ...rest }) {
  if (!message) return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`pw-toast pw-toast--${tone}${onClose ? ' pw-toast--closable' : ''}`}
      data-tone={tone}
      {...rest}
    >
      {onClose ? (
        <>
          <span>{message}</span>
          <button type="button" className="pw-toast__close" onClick={onClose} aria-label={closeLabel}>
            <CloseGlyph size={13} aria-hidden="true" />
          </button>
        </>
      ) : (
        message
      )}
    </div>,
    document.body,
  );
}

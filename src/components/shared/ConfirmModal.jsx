import { createPortal } from 'react-dom';

/**
 * ConfirmModal — 앱 공용 확인 창.
 *
 * 생김새는 평가 사이클 관리(`EvalCycleHrCanvas`)의 확인 창(`.evc-modal-*`)과 같은
 * 토큰·같은 값이다. `.evc-*` 는 평가 화면 소유의 클래스라 어드민·조직도·온보딩이 끌어
 * 쓰면 결합이 생기므로, 같은 값을 `.pw-confirm-*`(`app-overlays.css`)로 옮겨 두었다.
 *
 * 화면만 그린다 — 약속(promise)·초점·Esc 처리 같은 동작은 호스트가 갖는다.
 * `document.body` 직속 포털로 그린다: 본문 칸(`.content-area`)이 `position: fixed`
 * 라 자기 스태킹 컨텍스트를 만들어, 그 안에서 그리면 막이 왼쪽 메뉴를 못 덮는다.
 *
 * Props:
 *   title, body            제목·본문(문자열 또는 노드). body 가 null/undefined 면 본문 칸을 그리지 않는다
 *   confirmLabel, cancelLabel
 *   danger                 확인 버튼을 위험(빨강)으로
 *   hideCancel             취소 버튼을 그리지 않는다 — 답을 받지 않는 «안내»
 *   busy                   확인이 처리되는 동안 두 버튼을 잠근다. 막 클릭은 호스트가 onCancel 에서 거른다
 *                          (확인 문구를 「저장 중…」으로 바꾸는 것도 호스트가 confirmLabel 로 한다)
 *   onConfirm, onCancel    막을 눌러도 onCancel
 *   cancelRef, confirmRef  호스트가 초점을 줄 버튼 ref
 *   zIndex                 막의 겹침 순서 (기본은 CSS 값)
 *   testId                 창의 data-testid (기본 'confirm-dialog')
 */
export default function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  hideCancel = false,
  busy = false,
  onConfirm,
  onCancel,
  cancelRef,
  confirmRef,
  zIndex,
  testId = 'confirm-dialog',
}) {
  return createPortal(
    <div
      className="pw-confirm-overlay"
      style={zIndex != null ? { zIndex } : undefined}
      onClick={onCancel}
      data-testid="confirm-dialog-overlay"
    >
      <div
        className="pw-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="pw-confirm-title">{title}</h3>
        {body !== undefined && body !== null && (
          <div className="pw-confirm-body" data-testid="confirm-dialog-body">
            {body}
          </div>
        )}
        <div className="pw-confirm-actions">
          {!hideCancel && (
            <button
              type="button"
              ref={cancelRef}
              className="pw-confirm-btn is-ghost"
              data-testid="confirm-dialog-cancel"
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            ref={confirmRef}
            className={`pw-confirm-btn ${danger ? 'is-danger' : 'is-primary'}`}
            data-testid="confirm-dialog-confirm"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

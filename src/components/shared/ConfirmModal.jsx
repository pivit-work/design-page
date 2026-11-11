import Button from './Button.jsx';
import { CloseGlyph } from './lineIcons.jsx';
import { createPortal } from 'react-dom';

/**
 * ConfirmModal — 앱 공용 확인 창.
 *
 * 생김새는 디자이너가 그린 1on1 «회의 종료하기» 확인 창(stesslee cba28e7a `.mtg-end-confirm-*`,
 * Figma 16708-28310)이다 — 400폭 · 오른쪽 위 닫기 X · 16px 제목 · 14px 본문 · 같은 너비 44px 버튼.
 * PW-836 에서 이 창을 공용 부품으로 모을 때 평가 사이클 확인 창 값으로 덮였던 것을 되돌렸다
 * (pivit-work PW-2705). 닫기 X 는 디자이너 클래스 `.tl-group-modal-close`(modal-shell.css)를 쓴다.
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
 *   confirmDisabled        확인 버튼만 잠근다(취소는 그대로) — 이름을 똑같이 쳐야 지울 수 있는 확인처럼
 *                          조건이 맞을 때까지 확인을 막는 창 (PW-836 — 조직도 스쿼드 삭제)
 *   onConfirm, onCancel    막을 눌러도, 닫기 X 를 눌러도 onCancel
 *   closeLabel             닫기 X 의 읽어 주는 이름 (기본 '닫기')
 *   cancelRef, confirmRef  호스트가 초점을 줄 버튼 ref
 *   extraLabel, onExtra    취소와 확인 사이의 보조 버튼 하나 — 같은 자리에서 다른 길로 가는 창 (pivit-work PW-2576 «재입사로 진행»).
 *                          없으면 그리지 않는다. busy 일 때 함께 잠긴다
 *   extraTestId            보조 버튼의 data-testid
 *   zIndex                 막의 겹침 순서 (기본은 CSS 값)
 *   testId                 창의 data-testid (기본 'confirm-dialog')
 *   cancelTestId, confirmTestId  두 버튼의 data-testid (기본 'confirm-dialog-cancel' · 'confirm-dialog-confirm').
 *                          한 화면에 확인 창이 여럿이면 어느 창의 버튼인지 가르려고 둔다 (PW-832)
 */
export default function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  hideCancel = false,
  busy = false,
  confirmDisabled = false,
  extraLabel,
  onExtra,
  extraTestId,
  onConfirm,
  onCancel,
  closeLabel = '닫기',
  cancelRef,
  confirmRef,
  zIndex,
  testId = 'confirm-dialog',
  cancelTestId = 'confirm-dialog-cancel',
  confirmTestId = 'confirm-dialog-confirm',
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
        <button
          type="button"
          className="tl-group-modal-close"
          aria-label={closeLabel}
          data-testid={`${testId}-close`}
          onClick={onCancel}
          disabled={busy}
        >
          <CloseGlyph size={20} />
        </button>
        <div className="pw-confirm-header">
          <h3 className="pw-confirm-title">{title}</h3>
          {body !== undefined && body !== null && (
            <div className="pw-confirm-body" data-testid="confirm-dialog-body">
              {body}
            </div>
          )}
        </div>
        <div className="pw-confirm-actions">
          {!hideCancel && (
            <button
              type="button"
              ref={cancelRef}
              className="pw-confirm-btn is-ghost"
              data-testid={cancelTestId}
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
          )}
          {extraLabel && (
            <Button
              className="pw-confirm-btn is-ghost"
              data-testid={extraTestId}
              onClick={onExtra}
              disabled={busy}
            >
              {extraLabel}
            </Button>
          )}
          <button
            type="button"
            ref={confirmRef}
            className={`pw-confirm-btn ${danger ? 'is-danger' : 'is-primary'}`}
            data-testid={confirmTestId}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

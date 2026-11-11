import Button from './Button.jsx';
import { CloseGlyph } from './lineIcons.jsx';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * ConfirmModal — 앱 공용 확인 창.
 *
 * 생김새는 디자이너가 그린 1on1 «회의 종료하기» 확인 창(stesslee cba28e7a `.mtg-end-confirm-*`,
 * Figma 16708-28310)이다 — 400폭 · 오른쪽 위 닫기 X · 16px 제목 · 14px 본문 · 같은 너비 44px 버튼.
 * PW-836 에서 이 창을 공용 부품으로 모을 때 평가 사이클 확인 창 값으로 덮였던 것을 되돌렸다
 * (pivit-work PW-2705). 닫기 X 는 디자이너 클래스 `.tl-group-modal-close`(modal-shell.css)를 쓴다.
 *
 * Esc 와 처음 초점은 창이 갖는다 (pivit-work PW-2705). 전에는 «호스트가 갖는다»였는데, 이 창을 쓰는
 * 쉰 곳 가까이 중 Esc 를 단 곳은 열몇 곳뿐이라 평가 사이클 단계 넘김·연차 정책 삭제·직군 차단 창이
 * Esc 로 안 닫혔고 초점도 화면 바탕에 남았다. 이제 Esc = 닫기 X = 막 누르기 = onCancel 이고,
 * 처음 초점은 [취소](없으면 확인)다 — 읽지 않고 Enter 로 넘기지 않게. 창 안의 칸이 autoFocus 로
 * 이미 초점을 가져갔으면 건드리지 않는다. 약속(promise) 같은 나머지 동작은 호스트가 갖는다.
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
 *   closeOnEscape          false 면 Esc 로 닫지 않는다(기본 true) — 이름을 쳐야 지우는 창처럼 실수로 닫히면 안 되는 창.
 *                          false 여도 Esc 는 이 창에서 멈춘다(밑의 창·메뉴가 대신 닫히지 않게)
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
  closeOnEscape = true,
  zIndex,
  testId = 'confirm-dialog',
  cancelTestId = 'confirm-dialog-cancel',
  confirmTestId = 'confirm-dialog-confirm',
}) {
  const overlayRef = useRef(null);
  // Esc·처음 초점 처리가 그때의 값을 읽는다 — 그리는 중에는 ref 를 만지지 않으므로 효과에서 넣는다.
  const live = useRef({});
  useEffect(() => {
    live.current = { onCancel, busy, closeOnEscape, hideCancel };
  });

  // 처음 초점 — [취소], 없으면 확인. 칸이 autoFocus 로 가져갔으면 그대로 둔다. 호스트가 뒤에서 다른 곳에 줘도 그것이 이긴다.
  useEffect(() => {
    const modal = overlayRef.current?.firstElementChild;
    if (!modal || modal.contains(document.activeElement)) return;
    const btns = modal.querySelectorAll('.pw-confirm-actions > button');
    (live.current.hideCancel ? btns[btns.length - 1] : btns[0])?.focus();
  }, []);

  // Esc — 문서의 잡기 단계에서 받아 이 창에서 멈춘다. 창 밑의 화면·호스트가 단 Esc 처리는 받지 않는다
  // (둘 다 닫히거나 onCancel 이 두 번 불리지 않게). 확인 창이 겹쳐 있으면 맨 위(나중에 붙은) 것만 닫는다.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const all = document.querySelectorAll('.pw-confirm-overlay');
      if (all[all.length - 1] !== overlayRef.current) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      const { onCancel: cancel, busy: isBusy, closeOnEscape: canClose } = live.current;
      if (!isBusy && canClose) cancel?.();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
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

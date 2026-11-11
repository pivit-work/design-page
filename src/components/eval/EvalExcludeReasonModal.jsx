import { useId, useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';

/**
 * EvalExcludeReasonModal — 오픈 뒤 대상자 제외의 사유 입력 창 (PW-534 · 정책 §5.3.6).
 *
 * 오픈된 사이클에서 사람이 직접 빼는 제외는 사유가 필수다 — 이미 시작된 평가를 멈추는
 * 일이라 왜 멈췄는지가 남아야 한다. 정책은 「사유 필수」만 정하고 입력 자리를 정하지 않아,
 * 커트 판단(2026-09-13)으로 시안 `eval-app.jsx` 의 **동료 리뷰어 제외 사유 창**과 같은
 * 모양으로 옮겼다: 필수 표시 · 300자 · 사유가 비어 있으면 확인 버튼이 눌리지 않는다.
 *
 * 새 모양을 짓지 않는다 — 껍데기는 공용 `ModalShell`. 칸 묶음은 리포트 승인·반려 창(pivit-work PW-2591 ·
 * PW-2698)과 같은 원온원 «내 작성» 칸(`ono-my-field-head` · `ono-my-textarea` · `ono-my-field-aux`, 디자이너
 * one_on_one.css)에 18px 이름표(`evrr-approve-label` = 타임라인 창 이름표). 글자 수는 칸 바로 아래 오른쪽.
 * 스타일은 `styles/modal-shell.css` · `styles/eval-cycle.css` · `styles/one-on-one.css` (부르는 화면이 싣는다).
 *
 * 한 사람을 빼는 자리(진행 현황)와 여러 사람을 한 번에 빼는 자리(대상자 탭 저장)가 같은
 * 창을 쓴다 — 무엇을 묻는지는 호출부가 `title` · `description` 으로 넣는다.
 *
 * Props:
 *   title, description   헤더 문구
 *   label                필드 라벨 (필수 표시를 포함해 넘긴다 — 끝의 «*» 는 떼어 빨강으로 그린다)
 *   placeholder          입력 예시
 *   counter              글자 수 문구 — `{count}` · `{max}` 자리표시자
 *   submitLabel, cancelLabel, closeLabel
 *   maxLength            최대 글자 수 (기본 300)
 *   busy                 보내는 중 — 확인 버튼을 막는다
 *   error                거절 문장. 창을 닫지 않고 필드 아래에 적는다(적어 둔 사유는 남는다)
 *   onSubmit(reason)     앞뒤 공백을 걷은 사유
 *   onClose
 */
const fill = (tpl, vars) =>
  String(tpl ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

export default function EvalExcludeReasonModal({
  title,
  description,
  label,
  placeholder,
  counter = '{count} / {max}',
  submitLabel,
  cancelLabel,
  closeLabel,
  maxLength = 300,
  busy = false,
  error = null,
  onSubmit,
  onClose,
}) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const inputId = useId();
  // 화면 글(«제외 사유 *»)은 부르는 화면의 것 그대로 — 끝의 필수 «*» 만 떼어 빨강으로 그린다(PW-2698 ⑧).
  const rawLabel = String(label ?? '');
  const required = /\s*\*\s*$/.test(rawLabel);
  const labelText = required ? rawLabel.replace(/\s*\*\s*$/, '') : rawLabel;

  return (
    <ModalShell
      title={title}
      description={description}
      titleId="evx-reason-modal-title"
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      canSubmit={trimmed.length > 0 && !busy}
      onClose={onClose}
      onSubmit={() => onSubmit?.(trimmed)}
    >
      <div className="evrr-approve-field evx-reason-field" data-testid="evx-reason-field">
        <div className="ono-my-field-head">
          <div className="ono-my-field-label-row">
            <label className="evrr-approve-label" htmlFor={inputId}>
              {labelText}
              {required && (
                <span className="evx-reason-required" aria-hidden="true">
                  *
                </span>
              )}
            </label>
          </div>
        </div>
        <textarea
          id={inputId}
          className={`ono-my-textarea${error ? ' is-invalid' : ''}`}
          rows={5}
          maxLength={maxLength}
          value={reason}
          placeholder={placeholder}
          aria-required="true"
          onChange={(e) => setReason(e.target.value.slice(0, maxLength))}
          data-testid="evx-reason-input"
        />
        <div className="evl-lc-aux">
          <span />
          <span className="ono-my-field-aux" data-testid="evx-reason-count">
            {fill(counter, { count: reason.length, max: maxLength })}
          </span>
        </div>
        {error && (
          <span className="evl-lcp-line is-error" role="alert" data-testid="evx-reason-error">
            <span className="evl-lcp-line-text">{error}</span>
          </span>
        )}
      </div>
    </ModalShell>
  );
}

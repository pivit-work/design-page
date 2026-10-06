import { useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';

/**
 * EvalSendChannelModal — 리포트 발송 직전의 «발송 채널 선택» 창 (PW-1228 · 정책 §8.4).
 *
 * 정책 §8.4 「발송 채널 선택: Pivit 알림 / 이메일 / Slack」과 시안 `eval-app.jsx` 의
 * `SendResultModal` 을 옮겼다. 처음 체크는 사이클 관리 «리포트» 탭의 «발송 채널 기본값»이다
 * (§8.3) — 그 값은 호출부가 `defaults` 로 넣는다.
 *
 * 새 모양을 짓지 않는다 — 껍데기는 공용 `ModalShell`, 칩은 리포트 탭의 채널 칩과 같은
 * 클래스(`evrs-chips` · `evrs-chip`)다. 잠긴 칩(`locked`)은 리포트 탭의 필수 섹션처럼
 * «보이되 눌리지 않고» 옆에 사유(`lockedNote`)를 적는다.
 *
 * Props:
 *   title, description   헤더 문구 (description 의 `{count}` 는 보낼 사람 수)
 *   count                보낼 사람 수
 *   options              [{ id, label, locked? }] — locked 는 늘 체크된 채 잠긴다
 *   defaults             처음 체크할 id 목록
 *   lockedNote           잠긴 칩 옆 문구
 *   submitLabel, cancelLabel, closeLabel
 *   busy                 보내는 중 — 확인 버튼을 막는다
 *   onSubmit(ids)        체크된 id 목록 (잠긴 것 포함, options 순서)
 *   onClose
 */
export default function EvalSendChannelModal({
  title,
  description,
  count = 0,
  options = [],
  defaults = [],
  lockedNote,
  submitLabel,
  cancelLabel,
  closeLabel,
  busy = false,
  onSubmit,
  onClose,
}) {
  const [checked, setChecked] = useState(() => new Set(defaults));
  const isOn = (o) => o.locked || checked.has(o.id);
  const chosen = options.filter(isOn).map((o) => o.id);

  const toggle = (id) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ModalShell
      title={title}
      description={String(description ?? '').replace('{count}', String(count))}
      titleId="evrr-channel-modal-title"
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      canSubmit={chosen.length > 0 && !busy}
      busy={busy}
      onClose={onClose}
      onSubmit={() => onSubmit?.(chosen)}
    >
      <div className="evrs-chips" data-testid="evrr-channel-options">
        {options.map((o) => {
          const on = isOn(o);
          return (
            <label
              key={o.id}
              className={`evrs-chip ${on ? 'is-on' : ''} ${o.locked ? 'is-locked' : ''}`}
              data-testid={`evrr-channel-${o.id}`}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={o.locked}
                onChange={() => toggle(o.id)}
              />
              <span>{o.label}</span>
              {o.locked && lockedNote && <span className="evrs-chip-req">{lockedNote}</span>}
            </label>
          );
        })}
      </div>
    </ModalShell>
  );
}

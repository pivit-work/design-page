import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import ModalShell from '../shared/ModalShell.jsx';

/**
 * OkrKrUpdateModal — Key Result 달성률 업데이트 모달.
 *
 * detail: { title, krLabel('KR #1-1'), method('개수 달성'), unit('개'),
 *   total, currentValue, aiValue?, aiMeta?('신뢰도 88% · 오늘 9:12') }
 * AI 초안 카드는 aiValue 가 있을 때만 렌더한다(집계 데이터가 없으면 숨김).
 * 입력값 초기치는 currentValue → aiValue 순으로 채우고, 달성률(%)은
 * 입력값/목표로 자동 계산된다. 호스트가 detail.progressFor(값) 를 넘기면 그 값을
 * 그대로 보인다(PW-1063 — 저장 뒤 서버가 매길 달성률과 창 안 미리보기를 맞추려고.
 * 완료형·목표 0·음수에서 단순 나눗셈과 서버 값이 달랐다).
 *
 * 🔴 확정은 **onConfirm 이 끝나기를 기다린 뒤에만 닫는다.** 예전에는 부르자마자
 * 닫았는데, 저장이 거절돼도(권한 없음·서버 오류) 창이 그대로 사라져서 아무 말도 없이
 * 「저장된 것처럼」 보였다 — 소비처가 실패를 알려 줄 자리조차 없었다. onConfirm 이
 * 거부(reject)하면 창을 열어 둔 채로 두어 입력값을 잃지 않게 한다. 실패 사유를 사람에게
 * 보이는 것은 소비처 몫이다(앱은 토스트를 쓴다).
 */
export default function OkrKrUpdateModal({ detail, icons, baseUrl = '', onClose, onConfirm }) {
  const [value, setValue] = useState(detail.currentValue ?? detail.aiValue ?? '');
  const [saving, setSaving] = useState(false);

  const numeric = Number(value) || 0;
  const percent = typeof detail.progressFor === 'function'
    ? detail.progressFor(numeric)
    : Math.min(Math.round((numeric / detail.total) * 100), 100);

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm?.(numeric);
      onClose();
    } catch {
      // 실패했으면 닫지 않는다 — 입력값을 남겨 다시 누를 수 있게 한다.
      setSaving(false);
    }
  };

  // 껍데기는 공용 창 틀(ModalShell · PW-836). 저장 중에는 busy 로 Esc·막 클릭·닫기 X·취소를
  // 모두 막는다 — 닫아 버리면 저장이 끝났는지 모르는 채로 입력값만 사라진다.
  return (
    <ModalShell
      title={detail.title}
      description={(
        <span className="okr-kru-sub">
          <span>{detail.krLabel} — 달성률 업데이트</span>
          <span className="okr-kru-method">{detail.method}</span>
        </span>
      )}
      titleId="okr-kru-title"
      closeLabel="취소"
      cancelLabel="취소"
      submitLabel="확정"
      canSubmit
      busy={saving}
      onClose={onClose}
      onSubmit={confirm}
      zIndex={1000}
      className="okr-shell"
      bodyClassName="okr-shell-body"
    >
      {detail.aiValue != null && (
        <div className="okr-kru-ai">
          <div className="okr-kru-ai-head">
            <div className="okr-kru-ai-label">
              <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
              <span>AI 초안</span>
            </div>
            <span>{detail.aiMeta}</span>
          </div>
          <div className="okr-kru-ai-result">
            <p className="okr-kru-ai-caption">집계결과</p>
            <p className="okr-kru-ai-value">{detail.aiValue}/{detail.total}{detail.unit}</p>
          </div>
          <button type="button" className="okr-kru-apply" onClick={() => setValue(detail.aiValue)}>적용</button>
        </div>
      )}

      <div className="okr-kru-input-row">
        <input
          className="okr-kru-input"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span className="okr-kru-total">/ {detail.total}</span>
        <span className="okr-kru-percent">{percent}%</span>
      </div>
    </ModalShell>
  );
}

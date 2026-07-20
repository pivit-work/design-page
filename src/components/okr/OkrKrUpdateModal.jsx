import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * OkrKrUpdateModal — Key Result 달성률 업데이트 모달.
 *
 * detail: { title, krLabel('KR #1-1'), method('개수 달성'), unit('개'),
 *   total, currentValue, aiValue?, aiMeta?('신뢰도 88% · 오늘 9:12') }
 * AI 초안 카드는 aiValue 가 있을 때만 렌더한다(집계 데이터가 없으면 숨김).
 * 입력값 초기치는 currentValue → aiValue 순으로 채우고, 달성률(%)은
 * 입력값/목표로 자동 계산된다. 확정 시 onConfirm(값)을 부르고 닫는다.
 */
export default function OkrKrUpdateModal({ detail, icons, baseUrl = '', onClose, onConfirm }) {
  const [value, setValue] = useState(detail.currentValue ?? detail.aiValue ?? '');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const numeric = Number(value) || 0;
  const percent = Math.min(Math.round((numeric / detail.total) * 100), 100);

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-compose-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
        <div className="okr-kru-body">
          <div className="okr-kru-header">
            <h2 className="okr-compose-title">{detail.title}</h2>
            <div className="okr-kru-sub">
              <span>{detail.krLabel} — 달성률 업데이트</span>
              <span className="okr-kru-method">{detail.method}</span>
            </div>
          </div>

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
              <button className="okr-kru-apply" onClick={() => setValue(detail.aiValue)}>적용</button>
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
        </div>
        <div className="okr-modal-footer">
          <button className="okr-btn is-outline" onClick={onClose}>취소</button>
          <button
            className="okr-btn is-brand"
            onClick={() => { onConfirm?.(numeric); onClose(); }}
          >
            확정
          </button>
        </div>
      </div>
    </div>
  );
}

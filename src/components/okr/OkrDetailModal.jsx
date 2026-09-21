import Icon from '../shared/Icon.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import OkrProgressBar from './OkrProgressBar.jsx';
import rowKey from './rowKey.js';

/**
 * OkrDetailModal — 대시보드 블록 클릭 시 뜨는 OKR 상세 모달.
 *
 * detail: { title, aiSignals: [string], quarters: [{ q, title,
 *   progressLabel, weight, krs: [{ id, title, percent, variant,
 *   valueLabel, weight }] }] }
 * detail 이 없으면 렌더하지 않는다. ESC/오버레이/X 로 닫는다 — 껍데기는 공용 창 틀
 * (ModalShell · PW-836)이고 읽기만 하는 창이라 발(footer)이 없다.
 *
 * label: 위험 신호 배너 제목(기본 'AI 위험 신호').
 * showRefresh: 우측 새로고침 아이콘 표시 여부(기본 true, non-breaking).
 */
export default function OkrDetailModal({
  detail,
  icons,
  baseUrl = '',
  onClose,
  label = 'AI 위험 신호',
  showRefresh = true,
}) {
  if (!detail) return null;

  return (
    <ModalShell
      title={detail.title}
      titleId="okr-detail-title"
      onClose={onClose}
      zIndex={1000}
      className="okr-shell is-detail"
      bodyClassName="okr-shell-body"
      footer={null}
    >
      <div className="okr-ai-signal">
        <div className="okr-ai-banner">
          <div className="okr-ai-banner-label">
            <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
            <span>{label}</span>
          </div>
          {showRefresh && (
            <Icon src={icons.refreshCw} size={16} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          )}
        </div>
        <div className="okr-ai-chips">
          {detail.aiSignals.map((signal, si) => (
            <div className="okr-ai-chip" key={rowKey(signal, si)}>{signal}</div>
          ))}
        </div>
      </div>

      <div className="okr-quarter-tables">
        {detail.quarters.map((quarter, qi) => (
          <div className="okr-quarter-table" key={rowKey(quarter, qi, 'q')}>
            <div className="okr-qrow is-head">
              <div className="okr-qcell-label">
                <span className="okr-q-name">{quarter.q}</span>
              </div>
              <div className="okr-qcell-main">
                <span className="okr-qhead-title">{quarter.title}</span>
                <span className="okr-qhead-progress">{quarter.progressLabel}</span>
              </div>
              <div className="okr-qcell-weight is-head">{quarter.weight}</div>
            </div>
            {quarter.krs.map((kr) => (
              <div className="okr-qrow is-kr" key={kr.id}>
                <div className="okr-qcell-label">
                  <span className="okr-kr-id">{kr.id}</span>
                </div>
                <div className="okr-qcell-main">
                  <span className="okr-kr-title">{kr.title}</span>
                  <span className="okr-kr-progress">
                    <OkrProgressBar percent={kr.percent} variant={kr.variant} width={56} />
                    <span className={`okr-kr-value${kr.variant === 'brand' ? ' is-done' : ''}`}>{kr.valueLabel}</span>
                  </span>
                </div>
                <div className="okr-qcell-weight">{kr.weight}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

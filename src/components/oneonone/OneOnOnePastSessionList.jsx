import Icon from '../shared/Icon.jsx';
import EmptyState from '../shared/EmptyState.jsx';

/**
 * 「내 원온원」 지난 회차 목록 — Figma 17556:23218 (1on1 멤버 뷰).
 *
 * 머리(「{매니저} 매니저와의 지난 원온원」 · 「총 N회 · 회차를 선택해 기록을 확인하세요」)와
 * 행 목록. 행은 날짜 120 · 길이+액션 100 · 요약 + [기록보기] 로 나뉜다. AI 분석이 아직
 * 끝나지 않은 회차는 버튼 대신 「AI 분석 중」 글자만 둔다 — 눌러도 열 기록이 없어서다.
 *
 * 순수 컴포넌트다. 날짜·길이는 호스트가 **완성된 글자**로 넘긴다(시간대·로케일은 호스트에
 * 있다). 매니저 팀원 히스토리(`OneOnOneMemberCanvas` 의 HistoryScreen)와 design-page 데모가
 * 같은 부품을 쓴다.
 *
 * @param {object} props
 * @param {string} props.title            머리 제목
 * @param {string} [props.subtitle]       머리 부제
 * @param {Array<{ id, dateLabel, durationLabel, actionDone, actionTotal, summary, analyzing }>} props.sessions
 * @param {(session) => void} [props.onOpen]  [기록보기]
 * @param {{ open, analyzing, action }} [props.labels]
 * @param {string} [props.emptyText]      회차가 없을 때의 안내. 없으면 빈 목록을 그리지 않는다.
 * @param {string} [props.baseUrl]
 */
const DEFAULT_LABELS = { open: '기록보기', analyzing: 'AI 분석 중', action: '액션' };

export default function OneOnOnePastSessionList({
  title,
  subtitle,
  sessions = [],
  onOpen,
  labels,
  emptyText,
  baseUrl = '',
}) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };
  return (
    <section className="ono-past" data-testid="ono-past-list">
      <header className="ono-past-head">
        <h2 className="ono-past-title">{title}</h2>
        {subtitle && <p className="ono-past-subtitle">{subtitle}</p>}
      </header>
      {sessions.length === 0 ? (
        emptyText ? <EmptyState description={emptyText} /> : null
      ) : (
        <div className="ono-past-list">
          {sessions.map((s) => (
            <div className="ono-past-row" key={s.id} data-testid="ono-history-row">
              <div className="ono-past-date">{s.dateLabel}</div>
              <div className="ono-past-stat">
                {s.durationLabel && <span className="ono-past-duration">{s.durationLabel}</span>}
                {s.actionTotal > 0 && (
                  <span className="ono-past-actions">
                    <Icon src="/icons-solid/check.svg" size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
                    <span>{L.action}</span>
                    <span>{s.actionDone ?? 0}/{s.actionTotal}</span>
                  </span>
                )}
              </div>
              <div className="ono-past-main">
                <p className="ono-past-summary">{s.summary}</p>
                {s.analyzing ? (
                  <span className="ono-past-analyzing" data-testid="ono-past-analyzing">{L.analyzing}</span>
                ) : (
                  <button type="button" className="ono-past-open" onClick={() => onOpen?.(s)}>
                    {L.open}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

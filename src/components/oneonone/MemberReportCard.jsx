import AiMark from '../shared/AiMark.jsx';
import Icon from '../shared/Icon.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import MemberField from './MemberField.jsx';

/**
 * 멤버 준비 화면의 AI 보고서 영역.
 *
 * 생성 전 (Figma 17416:27977) — 보고서 카드 하나: 제목 · 출처 · 안내 상자 · 「OKR 자가 평가」(실제 막대 +
 *   자가 평가 슬라이더 · 인식 차 경고) · 지난 Upward Feedback.
 * 생성 뒤 (Figma 17556:23902 · 24486 · 24558) — 세 덩어리: 「이 기간 업무 요약」 카드(잘 된 것 · 어려웠던 것 ·
 *   현재 포커스) · 「OKR 자가 평가」(카드 밖 · KR 코멘트) · 「앞으로 필요한 것」 카드(블로커 · 지원 · 리소스).
 *
 * 자가 평가 슬라이더는 작성 중에만 움직인다(policy §4.2.6 `input[type=range]`). 제출 뒤에는 막대만 남는다.
 * 실제 진행률은 OKR 시스템이 채우는 값이라 여기서는 손대지 않는다.
 */
export default function MemberReportCard({
  phase,
  report,
  reportContent = null,
  actions = null,
  okr = [],
  onSelfChange,
  upwardFeedbackPrev,
  L,
  baseUrl = '',
}) {
  const editable = phase === 'prep';

  const okrRows = (withComments) => (
    <div className={withComments ? 'ono-my-okr-plain' : 'ono-start-okr'}>
      {okr.map((k, i) => (
        <div key={k.kr} className="ono-my-okr-block">
          <div className="ono-start-okr-row">
            <p className="ono-start-okr-kr">{k.kr}</p>
            <div className="ono-start-okr-bars">
              <div className="ono-start-okr-bar">
                <span className="ono-start-okr-bar-label">{withComments ? L.okrActual : L.okrActualLinked}</span>
                <div className="ono-start-okr-bar-line">
                  <div className="ono-my-track">
                    <div className="ono-my-fill" style={{ width: `${k.actual ?? 0}%` }} />
                  </div>
                  <span className="ono-start-okr-bar-pct">{k.actual ?? 0}%</span>
                </div>
              </div>
              <div className="ono-start-okr-bar">
                {editable ? (
                  <div className="ono-my-okr-label-row">
                    <span className="ono-my-okr-self-label">{L.okrSelf}</span>
                    <StatusBadge tone="neutral" className="ono-done-badge">{L.manual}</StatusBadge>
                  </div>
                ) : (
                  <span className="ono-start-okr-bar-label">{L.okrSelf}</span>
                )}
                <div className="ono-start-okr-bar-line">
                  <div className="ono-my-okr-slider">
                    <div className="ono-my-track">
                      <div className={`ono-my-fill${editable ? ' is-self' : ''}`} style={{ width: `${k.self ?? 0}%` }} />
                    </div>
                    {editable && (
                      <input
                        type="range"
                        className="ono-my-okr-range"
                        min={0}
                        max={100}
                        step={1}
                        value={k.self ?? 0}
                        onChange={(e) => onSelfChange?.(i, Number(e.target.value))}
                        aria-label={`${k.kr} ${L.okrSelf}`}
                      />
                    )}
                  </div>
                  <span className="ono-start-okr-bar-pct">{k.self ?? 0}%</span>
                </div>
              </div>
            </div>
            {k.alert && !withComments && (
              <p className="ono-start-okr-alert">
                <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--text-error-primary)" baseUrl={baseUrl} />
                {k.alert}
              </p>
            )}
          </div>
          {withComments && k.comment && (
            <div className="ono-my-okr-comment">
              <div className="ono-my-okr-comment-head">
                <span className="ono-my-okr-comment-title">{L.comment}</span>
                <StatusBadge tone="ai" className="ono-done-badge">{L.aiGenerated}</StatusBadge>
              </div>
              <p className="ono-my-okr-comment-text">{k.comment}</p>
            </div>
          )}
        </div>
      ))}
      {!withComments && upwardFeedbackPrev && (
        <div className="ono-start-upward">
          <span className="ono-start-upward-label">{L.upward}</span>
          <p className="ono-start-upward-text">{upwardFeedbackPrev}</p>
        </div>
      )}
    </div>
  );

  const cardTitle = (text) => (
    <div className="ono-start-briefing-head">
      <span className="ono-start-briefing-title">
        <AiMark size={14} baseUrl={baseUrl} />
        {text}
      </span>
    </div>
  );

  // 기존 한 편 보고서의 편집·저장 계약을 유지하는 소비처 자리 (PW-575).
  // text를 구조별 칸에 임의로 나누지 않고 보고서 전체를 그대로 보여 준다.
  if (reportContent) {
    return <>{reportContent}<div className="ono-start-briefing-block"><h3 className="ono-my-h3">{L.okrTitle}</h3>{okrRows(false)}</div></>;
  }

  if (!report?.generated) {
    return (
      <div className="ono-start-briefing-card ono-my-report" data-testid="ono-my-report">
        {cardTitle(L.reportTitle)}
        {actions}
        <p className="ono-my-report-source">{report?.source}</p>
        <p className={`ono-my-readbox${report?.text ? '' : ' is-empty'}`} data-testid="ono-my-report-legacy-text">{report?.text || report?.placeholder}</p>
        <div className="ono-start-briefing-block">
          <h3 className="ono-my-h3">{L.okrTitle}</h3>
          {okrRows(false)}
        </div>
      </div>
    );
  }

  const s = report.summary ?? {};
  const n = report.needs ?? {};
  const aiField = (title, value, key) => (
    <MemberField key={key} title={title} size="sm" badge="ai" badgeLabels={L} ai inCard value={value} testId={`ono-my-report-${key}`} />
  );
  return (
    <>
      <div className="ono-start-briefing-card ono-my-report" data-testid="ono-my-report-summary">
        {cardTitle(L.summaryTitle)}
        {actions}
        <p className="ono-my-report-source">{report.summarySource}</p>
        {aiField(L.wins, s.wins, 'wins')}
        {aiField(L.hard, s.hard, 'hard')}
        {aiField(L.focus, s.focus, 'focus')}
      </div>
      <div className="ono-start-briefing-block" data-testid="ono-my-okr">
        <h3 className="ono-my-h3">{L.okrTitle}</h3>
        {okrRows(true)}
      </div>
      <div className="ono-start-briefing-card ono-my-report" data-testid="ono-my-report-needs">
        {cardTitle(L.needsTitle)}
        <p className="ono-my-report-source">{report.needsSource}</p>
        {aiField(L.blockers, n.blockers, 'blockers')}
        {aiField(L.support, n.support, 'support')}
        {aiField(L.resources, n.resources, 'resources')}
      </div>
    </>
  );
}

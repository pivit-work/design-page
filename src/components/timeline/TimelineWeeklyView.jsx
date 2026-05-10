import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Icon from '../shared/Icon.jsx';

/**
 * TimelineWeeklyView — "Weekly" 탭 AI 주간 리포트 뷰.
 * Figma "timeline_gant_week" (16636:73372, 16639:77164).
 *
 * 데이터는 props 로만 들어온다. design-page 의 "내부 fallback 없음" 패턴.
 *  - `report === null` → 빈 상태 (지금 생성하기 버튼)
 *  - `report` 가 있으면 전체 리포트 렌더 + 진입 애니메이션
 *  - `periodTab` 은 controlled — 부모가 주차 전환 시 새 report 를 fetch.
 *
 * 데모용 형태의 샘플 데이터는 `./weekly-demo-data.js` 의 DEMO_WEEKLY_REPORT 참조.
 */

// 차트 SVG path 생성 (데이터 범위 7.0~9.0 → y 좌표 변환)
const buildChartPath = (healthData) => {
  const W = 300, H = 120, PAD_X = 20, PAD_Y = 16;
  const N = healthData.length;
  if (!N) return { points: [], line: '', area: '', W, H, PAD_X };
  const points = healthData.map((v, i) => {
    const x = PAD_X + (N === 1 ? 0 : (i / (N - 1)) * (W - PAD_X * 2));
    const y = PAD_Y + (1 - (v - 7) / 2) * (H - PAD_Y * 2);
    return [x, y];
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' ');
  const area = line + ` L ${points[points.length - 1][0]},${H} L ${points[0][0]},${H} Z`;
  return { points, line, area, W, H, PAD_X };
};

export default function TimelineWeeklyView({
  baseUrl,
  // Period tab — controlled. 부모가 주차 변경 시 새 report 를 fetch 해서 주입.
  periodTab,
  onPeriodTabChange,
  // Report data — null 이면 빈 상태(생성 전), 객체면 전체 리포트 렌더.
  // shape: weekly-demo-data.js 의 DEMO_WEEKLY_REPORT 참조.
  report,
  // 생성 중 로딩 (버튼 비활성화). report 가 도착하면 자연스럽게 빈 상태 → 리포트로 전환.
  isGenerating = false,
  onGenerate,
  onViewHistory,
}) {
  const cardInnerRef = useRef(null);
  const prevReportIdRef = useRef(null);

  // 빈 상태 → 리포트 로드 시점에서만 자식 요소들을 순차 페이드인.
  // 이미 렌더된 상태에서 report 객체만 바뀌어도 재실행되면 어색하므로
  // generatedAt 으로 신규 리포트 도착 여부를 판정.
  useEffect(() => {
    if (!report) {
      prevReportIdRef.current = null;
      return;
    }
    const id = report.generatedAt ?? '__report__';
    if (prevReportIdRef.current === id) return;
    prevReportIdRef.current = id;
    const root = cardInnerRef.current;
    if (!root) return;
    const children = Array.from(root.children);
    if (!children.length) return;
    children.forEach((child, i) => {
      gsap.fromTo(
        child,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power2.out', delay: i * 0.1 },
      );
    });
  }, [report]);

  const chart = report ? buildChartPath(report.healthData ?? []) : null;

  return (
    <div className="tl-weekly">
      {/* Sub-tabs */}
      <div className="tl-weekly-subtabs-row">
        <div className="seg-control" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={periodTab === 'lastWeek'}
            className={`seg-item ${periodTab === 'lastWeek' ? 'is-active' : ''}`}
            onClick={() => onPeriodTabChange?.('lastWeek')}
          >
            지난주
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={periodTab === 'thisWeek'}
            className={`seg-item ${periodTab === 'thisWeek' ? 'is-active' : ''}`}
            onClick={() => onPeriodTabChange?.('thisWeek')}
          >
            이번주
          </button>
        </div>
      </div>

      {/* AI info banner */}
      <div className="tl-weekly-info">
        <Icon
          src="/icons-solid/ai-chat-01.svg"
          size={14}
          color="#ad00fe"
          baseUrl={baseUrl}
        />
        <span className="tl-weekly-info-text">
          AI가 이번 주 스니핏, 헬스체크, OKR 변화를 분석해 자동으로 요약합니다. 매주 금요일 자동 생성되며, 언제든 직접 생성할 수 있습니다.
        </span>
      </div>

      {/* Main content card — Figma: wide white card with 660px 중앙 컬럼 */}
      <article className="tl-weekly-card">
        {report?.generatedAt && (
          <div className="tl-weekly-card-meta">{report.generatedAt}</div>
        )}

        {isGenerating && !report ? (
          /* Loading — Figma 16839:51130. video 296×68 mix-blend-darken + Generating... text */
          <div className="tl-weekly-loading">
            <div className="tl-weekly-loading-inner">
              <video
                className="tl-weekly-loading-video"
                src={`${baseUrl}weekly-loader.mp4`}
                autoPlay
                loop
                muted
                playsInline
              />
              <p className="tl-weekly-loading-text">Generating...</p>
            </div>
          </div>
        ) : !report ? (
          <div className="tl-weekly-empty">
            <p className="tl-weekly-empty-text">
              아직 이번 주 리포트 자동 생성 전이에요.<br />
              지금 생성을 원하시면 아래 버튼을 클릭하시면 됩니다.
            </p>
            <button
              type="button"
              className="tl-weekly-generate-btn"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              <Icon src="/icons-solid/ai-chat-01.svg" size={20} color="#fff" baseUrl={baseUrl} />
              <span>지금 생성하기</span>
            </button>
          </div>
        ) : (
        <div className="tl-weekly-card-inner" ref={cardInnerRef}>

        <div className="tl-weekly-intro">
          <header className="tl-weekly-report-head">
            <h2 className="tl-weekly-report-title">AI Weekly Report</h2>
            <div className="tl-weekly-report-meta">
              <span className="tl-weekly-meta-item">
                <Icon src="/icons/calendar.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                {report.meta?.dateRange}
              </span>
              <span className="tl-weekly-meta-sep">·</span>
              <span className="tl-weekly-meta-item">
                <Icon src="/icons/file-05.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                스니핏 {report.meta?.snippetCount ?? 0}개
              </span>
              <span className="tl-weekly-meta-sep">·</span>
              <span className="tl-weekly-meta-item">
                <Icon src="/icons/laptop-02.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                활동일 {report.meta?.activeDays ?? 0}일
              </span>
              <span className="tl-weekly-meta-sep">·</span>
              <span className="tl-weekly-meta-item">
                <Icon src="/icons/activity-heart.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                {report.meta?.weekAvgHealth ?? '-'}
              </span>
            </div>
          </header>

          <p className="tl-weekly-summary">{report.summary}</p>
        </div>

        {/* Daily entries — 각 엔트리가 자체 padding/border 섹션 */}
        {(report.dayEntries ?? []).map((e) => (
            <div key={`${e.day}-${e.date}`} className="tl-weekly-entry">
              <div className="tl-weekly-entry-head">
                <span className="tl-weekly-entry-day">{e.day}</span>
                <span className="tl-weekly-entry-date">{e.date}</span>
                <span className="tl-weekly-meta-sep">·</span>
                <span className="tl-weekly-entry-health">
                  <img src={`${baseUrl}icons-solid/health-icon-01.svg`} width={20} height={20} alt="" aria-hidden="true" />
                  {e.health}
                </span>
                {e.krTitle && (
                  <div className="tl-weekly-entry-kr">
                    <span className="tl-weekly-kr-badge">KR</span>
                    <span>{e.krTitle}</span>
                  </div>
                )}
              </div>
              {e.desc && <p className="tl-weekly-entry-desc">{e.desc}</p>}
              {e.highlight && <blockquote className="tl-weekly-entry-highlight">{e.highlight}</blockquote>}
              {e.cards?.length > 0 && (
                <div className="tl-weekly-entry-cards">
                  {e.cards.map((c, i) => (
                    <div key={i} className={`tl-weekly-entry-card is-${c.type}`}>
                      <span className="tl-weekly-entry-card-icon" aria-hidden="true">
                        {c.type === 'good' ? (
                          <Icon src="/icons/annotation-heart.svg" size={16} color="var(--colors-foreground-fgSuccessPrimary, #079455)" baseUrl={baseUrl} />
                        ) : (
                          <Icon src="/icons/alert-triangle.svg" size={16} color="var(--colors-foreground-fgErrorPrimary, #d92d20)" baseUrl={baseUrl} />
                        )}
                      </span>
                      {c.title}
                    </div>
                  ))}
                </div>
              )}
              {e.tags?.length > 0 && (
                <div className="tl-weekly-entry-tags">
                  {e.tags.map((t) => (
                    <span key={t} className="tl-weekly-entry-tag">#{t}</span>
                  ))}
                </div>
              )}
            </div>
        ))}

        {/* Health chart + Tag counts (2-col) */}
        <section className="tl-weekly-section">
          <div className="tl-weekly-two-col">
            <div className="tl-weekly-chart-wrap">
              <div className="tl-weekly-chart-head">
                <div className="tl-weekly-section-title">헬스체크</div>
                <div className="tl-weekly-chart-avg">
                  <strong>{report.meta?.weekAvgHealth ?? '-'}</strong> 주 평균
                </div>
              </div>
              <div className="tl-weekly-chart-area" aria-label="헬스체크 차트">
                {chart && chart.points.length > 0 && (
                  <svg viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none">
                    <defs>
                      {/* Figma: Linear 세로 그라디언트 — 0% green 100, 49% blue 40, 100% red 0 */}
                      <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#75E86B" stopOpacity="1" />
                        <stop offset="49%" stopColor="#90B0FA" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#F96363" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="healthLineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#75E86B" />
                        <stop offset="49%" stopColor="#90B0FA" />
                        <stop offset="100%" stopColor="#F96363" />
                      </linearGradient>
                    </defs>
                    <path d={chart.area} fill="url(#healthGrad)" />
                    <path
                      d={chart.line}
                      fill="none"
                      stroke="url(#healthLineGrad)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {chart.points.map((p, i) => {
                      const ratio = (p[1] - 16) / (chart.H - 32);
                      const color = ratio < 0.49 ? '#75E86B' : ratio < 0.85 ? '#90B0FA' : '#F96363';
                      return <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} />;
                    })}
                  </svg>
                )}
              </div>
              <div className="tl-weekly-chart-xlabels">
                {(report.weekDays ?? []).map((d, i) => (<span key={`${d}-${i}`}>{d}</span>))}
              </div>
            </div>
            <div className="tl-weekly-tag-stats">
              <div className="tl-weekly-section-title">주요 태그</div>
              <ul className="tl-weekly-tag-list">
                {(report.tagCounts ?? []).map((t) => {
                  const max = report.tagCounts[0]?.count || 1;
                  return (
                    <li key={t.label} className="tl-weekly-tag-row">
                      <span className="tl-weekly-tag-name">#{t.label}</span>
                      <span className="tl-weekly-tag-track">
                        <span style={{ width: `${(t.count / max) * 100}%` }} />
                      </span>
                      <span className="tl-weekly-tag-count">{t.count}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* OKR progress */}
        <section className="tl-weekly-section">
          <div className="tl-weekly-section-title">OKR 달성도 변화</div>
          <ul className="tl-weekly-okr-list">
            {(report.okrItems ?? []).map((o) => (
              <li key={o.label} className="tl-weekly-okr-item">
                <div className="tl-weekly-okr-row">
                  <span className="tl-weekly-okr-label">{o.label}</span>
                  <span className="tl-weekly-okr-delta" style={{ color: o.color }}>
                    {o.delta >= 0 ? '+' : ''}{o.delta}%
                  </span>
                  <span className="tl-weekly-okr-value" style={{ color: o.color }}>{o.value}%</span>
                </div>
                <span className="tl-weekly-okr-bar">
                  <span style={{ width: `${o.value}%`, background: o.barColor }} />
                </span>
                <span className="tl-weekly-okr-prev">지난 주 {o.prev}%</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 주요 기여 / 블로커 (2-col) */}
        <section className="tl-weekly-section">
          <div className="tl-weekly-two-col">
            <div className="tl-weekly-box">
              <div className="tl-weekly-box-title tl-weekly-box-title-good">주요 기여</div>
              <ul className="tl-weekly-note-list">
                {(report.contributions ?? []).map((c, i) => (<li key={i}>{c}</li>))}
              </ul>
            </div>
            <div className="tl-weekly-box">
              <div className="tl-weekly-box-title tl-weekly-box-title-blocker">
                블로커
                <span className="tl-weekly-blocker-count">{(report.blockers ?? []).length}개 미해결</span>
              </div>
              <ul className="tl-weekly-note-list">
                {(report.blockers ?? []).map((b, i) => (<li key={i}>{b}</li>))}
              </ul>
            </div>
          </div>
        </section>

        {/* 다음 주 포커스 */}
        <section className="tl-weekly-section">
          <div className="tl-weekly-section-title">
            다음 주 포커스
            <span className="tl-weekly-meta-sep">·</span>
            <span className="tl-weekly-ai-suggest">AI 제안</span>
          </div>
          <ol className="tl-weekly-recommend-list">
            {(report.nextFocus ?? []).map((x, i) => (<li key={i}>{x}</li>))}
          </ol>
        </section>

        {/* 하단 액션 */}
        <div className="tl-weekly-bottom-action">
          <button type="button" className="tl-weekly-snippet-btn" onClick={onViewHistory}>
            지난 히스토리 보기
          </button>
        </div>
        </div>
        )}
      </article>
    </div>
  );
}

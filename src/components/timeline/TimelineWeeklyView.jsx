import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Icon from '../shared/Icon.jsx';

/**
 * TimelineWeeklyView — "Weekly" 탭 AI 주간 리포트 뷰.
 * Figma "timeline_gant_week" (16636:73372, 16639:77164).
 */

const DAY_ENTRIES = [
  {
    day: '월', date: '4/12', health: 8.1,
    krTitle: 'Phase 1 UI 기획 완료',
    desc: 'IA v1.0 초안 작성 — 9개 모듈 화면 계층 정의. 타임라인 피드 더미 데이터 구조 설계.',
    highlight: 'Phase 1 범위를 확정하기 위해 전체 화면 구조를 먼저 잡아야 했음.',
    cards: [
      { type: 'good', title: 'IA 초안을 반나절 만에 완성' },
      { type: 'issue', title: 'OKR 연동 구조가 아직 불명확' },
    ],
    tags: ['기획', '회의', '개발'],
  },
  {
    day: '화', date: '4/13', health: 8.4,
    krTitle: 'Phase 1 UI 기획 완료',
    desc: 'RBAC 권한 관리 화면 27개 항목 설계. 어드민 클릭 액션 20건 정의 완료.',
    highlight: '권한 구조가 확정되어야 모든 화면의 접근 제어를 설계할 수 있음.',
    cards: [
      { type: 'good', title: 'RBAC 27개 항목을 하루 만에 정리' },
    ],
    tags: ['기획', '회의', '개발'],
  },
  {
    day: '수', date: '4/14', health: 8.0,
    krTitle: 'Phase 1 UI 기획 완료',
    desc: '홈페이지 카피 전면 재작성 — 3-C 방향(Clear, Concise, Compelling) 확정. IR 자료 투자자 데크 초안 리뷰.',
    highlight: '3-C 카피 방향이 팀 전체의 메시징을 정렬하는 기준이 됨.',
    cards: [
      { type: 'good', title: '홈페이지 카피 방향 3-C 확정 — 팀 만장일치 동의' },
      { type: 'issue', title: 'IR 데크에 들어갈 수치 자료 부족' },
    ],
    tags: ['기획', '회의', '개발'],
  },
  {
    day: '목', date: '4/15', health: 8.4,
    krTitle: 'Phase 1 UI 기획 완료',
    desc: 'RBAC 권한 관리 화면 27개 항목 설계. 어드민 클릭 액션 20건 정의 완료.',
    highlight: '권한 구조가 확정되어야 모든 화면의 접근 제어를 설계할 수 있음.',
    cards: [
      { type: 'good', title: '피드백 중심 제품 철학 재정의 — SH님과 합의 완료' },
      { type: 'issue', title: 'OKR 연동 구조가 아직 불명확' },
    ],
    tags: ['기획', '회의', '개발'],
  },
  {
    day: '금', date: '4/16', health: 8.4,
    krTitle: 'Phase 1 UI 기획 완료',
    desc: 'IA v1.1 업데이트 — 회의 피드백 반영. 어니스트 1on1 진행 — 데이터 스키마 최종 확정.',
    highlight: '미팅에서 나온 피드백을 즉시 반영하여 기획 완성도를 높임.',
    cards: [
      { type: 'good', title: '데이터 스키마 100개 필드 정리 완료' },
    ],
    tags: ['기획', '회의', '개발'],
  },
];

const TAG_COUNTS = [
  { label: '기획', count: 6 },
  { label: '회의', count: 4 },
  { label: 'UI', count: 3 },
  { label: '산출물', count: 3 },
  { label: '스키마', count: 2 },
];

// Figma: utility-green-600 text + utility-green-500 bar / utility-blue-600 + blue-400 / utility-error-600 + error-400
const OKR_ITEMS = [
  { label: 'Phase 1 UI 기획 완료', prev: 58, value: 72, delta: 14, color: '#099250', barColor: '#2dbd82' },
  { label: '얼리 엑세스 등록 100건', prev: 40, value: 45, delta: 5, color: '#1570ef', barColor: '#53b1fd' },
  { label: '투자자 미팅 3건 완료', prev: 38, value: 33, delta: -5, color: '#d92d20', barColor: '#f97066' },
];

const CONTRIBUTIONS = [
  'IA v1.1 Phase 1 기준 완성 — 9개 모듈, 35개 페이지 확정',
  'RBAC 권한 관리 화면 27개 항목 설계 완료',
  '홈페이지 카피 전면 재작성 — 3-C 방향 확정 및 반영',
  '4차 정기 미팅 진행 — 피드백 중심 제품 철학 재정의',
];

const BLOCKERS = [
  '타임라인 교차 뷰 UI 복잡도 — 더미 데이터 검증 필요',
  '커트 As-of DB 구조 검토 미완 — 다음 주 공유 예정',
  'SH PPT 슬라이드 공유 대기 중',
];

const NEXT_FOCUS = [
  '회의록 화면 UI 기획 및 구현 착수',
  'Weekly Digest 화면 완성',
  '1on1 대시보드 리스트 뷰 기획',
  '홈페이지 구글 심사 준비 시작',
];

// 헬스체크 차트: 월~금 점수
const HEALTH_DATA = [7.8, 8.1, 8.0, 8.4, 8.4];
const WEEK_DAYS = ['월', '화', '수', '목', '금'];

// 차트 SVG path 생성 (데이터 범위 7.0~9.0 → y 좌표 변환)
const chartPath = () => {
  const W = 300, H = 120, PAD_X = 20, PAD_Y = 16;
  const points = HEALTH_DATA.map((v, i) => {
    const x = PAD_X + (i / (HEALTH_DATA.length - 1)) * (W - PAD_X * 2);
    const y = PAD_Y + (1 - (v - 7) / 2) * (H - PAD_Y * 2);
    return [x, y];
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' ');
  const area = line + ` L ${points[points.length - 1][0]},${H} L ${points[0][0]},${H} Z`;
  return { points, line, area, W, H, PAD_X };
};

export default function TimelineWeeklyView({ baseUrl }) {
  const [periodTab, setPeriodTab] = useState('thisWeek');
  const [isGenerated, setIsGenerated] = useState(false);
  const cardInnerRef = useRef(null);
  const chart = chartPath();

  // 생성 완료 시점에서 card-inner 의 직계 자식들을 순차 페이드인.
  // 각 컨테이너가 y+60 → 0 으로 power2.out(easeOutQuad 근사)로 올라오며,
  // 위에서부터 index * 0.02초 delay 를 줘서 "앞 텍스트를 따라 올라오는" 효과.
  useEffect(() => {
    if (!isGenerated) return;
    const root = cardInnerRef.current;
    if (!root) return;
    const children = Array.from(root.children);
    if (!children.length) return;
    children.forEach((child, i) => {
      gsap.fromTo(
        child,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power2.out',
          delay: i * 0.1,
        }
      );
    });
  }, [isGenerated]);

  const handleGenerate = () => setIsGenerated(true);

  return (
    <div className="tl-weekly">
      {/* Sub-tabs */}
      <div className="tl-weekly-subtabs-row">
        <div className="tl-weekly-subtabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={periodTab === 'lastWeek'}
            className={`tl-weekly-subtab ${periodTab === 'lastWeek' ? 'is-active' : ''}`}
            onClick={() => setPeriodTab('lastWeek')}
          >
            지난주
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={periodTab === 'thisWeek'}
            className={`tl-weekly-subtab ${periodTab === 'thisWeek' ? 'is-active' : ''}`}
            onClick={() => setPeriodTab('thisWeek')}
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
        {isGenerated && (
          <div className="tl-weekly-card-meta">2026.03.15 (금) 오후 6:00 자동 생성</div>
        )}

        {!isGenerated ? (
          <div className="tl-weekly-empty">
            <p className="tl-weekly-empty-text">
              아직 이번 주 리포트 자동 생성 전이에요.<br />
              지금 생성을 원하시면 아래 버튼을 클릭하시면 됩니다.
            </p>
            <button type="button" className="tl-weekly-generate-btn" onClick={handleGenerate}>
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
                2026.03.09 ~ 03.15
              </span>
              <span className="tl-weekly-meta-sep">·</span>
              <span className="tl-weekly-meta-item">
                <Icon src="/icons/file-05.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                스니핏 9개
              </span>
              <span className="tl-weekly-meta-sep">·</span>
              <span className="tl-weekly-meta-item">
                <Icon src="/icons/laptop-02.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                활동일 5일
              </span>
              <span className="tl-weekly-meta-sep">·</span>
              <span className="tl-weekly-meta-item">
                <Icon src="/icons/activity-heart.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                8.1
              </span>
            </div>
          </header>

          <p className="tl-weekly-summary">
            이번 주는 Phase 1 기획 완성도를 높이는 데 집중한 한 주였습니다. IA 구조 정의, 어드민 클릭션 정의, RBAC 설계 등 핵심 산출물이 완성됐으며, 팀 전체 회의 2회를 통해 방향성이 정렬됐습니다. 헬스체크는 주 평균 8.1로 안정적이었고, 수요일 이후 꾸준히 유지됐습니다.
          </p>
        </div>

        {/* Daily entries — 각 엔트리가 자체 padding/border 섹션 */}
        {DAY_ENTRIES.map((e) => (
            <div key={e.day} className="tl-weekly-entry">
              <div className="tl-weekly-entry-head">
                <span className="tl-weekly-entry-day">{e.day}</span>
                <span className="tl-weekly-entry-date">{e.date}</span>
                <span className="tl-weekly-meta-sep">·</span>
                <span className="tl-weekly-entry-health">
                  <img src={`${baseUrl}icons-solid/health-icon-01.svg`} width={20} height={20} alt="" aria-hidden="true" />
                  {e.health}
                </span>
                <div className="tl-weekly-entry-kr">
                  <span className="tl-weekly-kr-badge">KR</span>
                  <span>{e.krTitle}</span>
                </div>
              </div>
              <p className="tl-weekly-entry-desc">{e.desc}</p>
              <blockquote className="tl-weekly-entry-highlight">{e.highlight}</blockquote>
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
              <div className="tl-weekly-entry-tags">
                {e.tags.map((t) => (
                  <span key={t} className="tl-weekly-entry-tag">#{t}</span>
                ))}
              </div>
            </div>
        ))}

        {/* Health chart + Tag counts (2-col) */}
        <section className="tl-weekly-section">
          <div className="tl-weekly-two-col">
            <div className="tl-weekly-chart-wrap">
              <div className="tl-weekly-chart-head">
                <div className="tl-weekly-section-title">헬스체크</div>
                <div className="tl-weekly-chart-avg"><strong>8.1</strong> 주 평균</div>
              </div>
              <div className="tl-weekly-chart-area" aria-label="헬스체크 차트">
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
              </div>
              <div className="tl-weekly-chart-xlabels">
                {WEEK_DAYS.map((d) => (<span key={d}>{d}</span>))}
              </div>
            </div>
            <div className="tl-weekly-tag-stats">
              <div className="tl-weekly-section-title">주요 태그</div>
              <ul className="tl-weekly-tag-list">
                {TAG_COUNTS.map((t) => {
                  const max = TAG_COUNTS[0].count;
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
            {OKR_ITEMS.map((o) => (
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
                {CONTRIBUTIONS.map((c, i) => (<li key={i}>{c}</li>))}
              </ul>
            </div>
            <div className="tl-weekly-box">
              <div className="tl-weekly-box-title tl-weekly-box-title-blocker">
                블로커
                <span className="tl-weekly-blocker-count">{BLOCKERS.length}개 미해결</span>
              </div>
              <ul className="tl-weekly-note-list">
                {BLOCKERS.map((b, i) => (<li key={i}>{b}</li>))}
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
            {NEXT_FOCUS.map((x, i) => (<li key={i}>{x}</li>))}
          </ol>
        </section>

        {/* 하단 액션 */}
        <div className="tl-weekly-bottom-action">
          <button type="button" className="tl-weekly-snippet-btn">지난 히스토리 보기</button>
        </div>
        </div>
        )}
      </article>
    </div>
  );
}

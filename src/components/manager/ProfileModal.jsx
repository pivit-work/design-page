import { Component, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Spline from '@splinetool/react-spline';
import Icon from '../shared/Icon.jsx';
import assetUrl from '../shared/assetUrl.js';

// member 가 자기 splineImage / avatar 를 갖고 있지 않을 때만 사용되는 데모 폴백.
const FALLBACK_IMAGE = 'https://pivit-work.github.io/design-page/man.png';

const PROFILE_SCENE = 'https://prod.spline.design/zcv5m26Zb2Qxpqcc/scene.splinecode';

/**
 * `<Spline>` 격리용 Error Boundary — 조직도 ProfileModal 과 동일 패턴.
 * WebGL 컨텍스트 생성 실패 시 Spline 내부에서 throw 되면 부모 트리가 통째로 언마운트
 * 되므로 boundary 로 격리해 헥사 영역만 비운다.
 */
class SplineBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/**
 * Spline scene 의 'profileImage' 오브젝트 텍스처를 멤버 아바타로 교체.
 * 조직도 ProfileModal 과 동일 패턴 — iframe 시절 spline-profile.html 의 applyTexture 를 동일 구현.
 */
function applyTexture(app, objectName, imageSrc) {
  return new Promise((resolve) => {
    const obj = app.findObjectByName(objectName);
    if (!obj) { resolve(); return; }
    const layers = obj.material?.layers;
    if (!layers) { resolve(); return; }
    const texLayer = [...Array(layers.length)]
      .map((_, i) => layers[i])
      .find((l) => l.type === 'texture');
    if (!texLayer) { resolve(); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      try {
        texLayer.updateTexture(img);
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        texLayer.updateTexture(c.toDataURL('image/png'));
        const tex = texLayer.texture;
        tex.image = img;
        texLayer.texture = tex;
      } catch (e) { /* texture swap 실패 — baked 텍스처 유지 */ }
      resolve();
    };
    img.onerror = () => resolve();
  });
}

/**
 * 매니저 페이지 멤버 카드 클릭 시 노출되는 직원 프로필 모달 (v2).
 * Figma node 16952:13855.
 *
 * 구조/노출 로직/Spline 사이즈는 조직도 ProfileModal 과 완전히 동일:
 *  - createPortal 로 document.body 에 렌더 (사이드바/헤더 위로 overlay 가 올라가도록)
 *  - overlay + scroll-wrap + 정중앙 modal-card (width 432)
 *  - spline-wrap 432x432 + react-spline stage 600 scale 0.5 + margin offset (조직도와 동일)
 *  - 닫힘 동안 마지막 멤버 콘텐츠 유지 (`displayMember`)
 *
 * Spline 은 조직도 ProfileModal 과 동일하게 `@splinetool/react-spline` 단일 공유 런타임을 쓴다.
 * iframe 시절엔 `spline-profile.html` 을 src 로 띄웠는데, nginx 의 `.html` rewrite 가
 * query string 을 날려 React index.html 로 fallback 되는 버그가 있었다 (dev 배포에서만 재현).
 *
 * 컨텐츠는 매니저 v2 디자인 — segment control + 종합 브리핑 + 1on1 아젠다 + KPI 4 grid.
 *
 * 헤더의 [1on1]·[메시지] 는 `MemberCard` 의 같은 이름 버튼과 동일한 콜백 이름을 받는다
 * (`onOneOnOneClick` / `onMessageClick`) — 소비자가 카드와 모달에 같은 핸들러를 물릴 수
 * 있게 하기 위함이다. 콜백을 안 넘기면(데모) 눌러도 아무 일도 일어나지 않는다.
 */
export default function ProfileModal({
  member,
  onClose,
  baseUrl = '',
  icons,
  onOneOnOneClick,
  onMessageClick,
}) {
  // splineReady/Failed 를 boolean 으로 두면 새 멤버 모달 진입 시 useEffect 로 reset 해야
  // 하는데, react-hooks/set-state-in-effect 룰을 깬다. 대신 "현재 로드 완료된 멤버 id" 와
  // "실패한 멤버 id" 를 저장하고, displayMember?.id 와 비교해 derived 로 쓴다.
  // 새 멤버 모달이 열리면 자동으로 false 처리되어 fade-in 이 다시 트리거된다.
  const [splineReadyId, setSplineReadyId] = useState(null);
  const [splineFailedId, setSplineFailedId] = useState(null);
  const [splineActive, setSplineActive] = useState(false);
  const [activeTab, setActiveTab] = useState('ai');
  const scrollWrapRef = useRef(null);

  const [displayMember, setDisplayMember] = useState(member);
  if (member && member !== displayMember) setDisplayMember(member);
  // 모달이 닫히면 spline 인터랙션 상태도 리셋 (조직도 ProfileModal 과 동일).
  if (!member && splineActive) setSplineActive(false);

  const splineImage = displayMember?.splineImage || displayMember?.avatar || FALLBACK_IMAGE;
  const splineReady = displayMember?.id != null && splineReadyId === displayMember.id;
  const splineFailed = displayMember?.id != null && splineFailedId === displayMember.id;

  const handleSplineLoad = useCallback(async (app) => {
    const targetId = displayMember?.id ?? null;
    if (splineImage) {
      await applyTexture(app, 'profileImage', splineImage);
      await applyTexture(app, 'profileImage-2', splineImage);
    }
    setSplineReadyId(targetId);
  }, [splineImage, displayMember?.id]);

  const handleSplineFail = useCallback(() => {
    setSplineFailedId(displayMember?.id ?? null);
  }, [displayMember?.id]);

  useEffect(() => {
    if (member && scrollWrapRef.current) scrollWrapRef.current.scrollTop = 0;
  }, [member]);

  useEffect(() => {
    if (!member) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [member, onClose]);

  const isOpen = !!member;
  const profile = displayMember?.profile;
  const agendas = profile?.agendas ?? [];

  const TABS = [
    { key: 'ai', label: 'AI 브리핑' },
    { key: 'snippet', label: '스니핏' },
    { key: 'health', label: '헬스 트렌드' },
    { key: 'oneonone', label: '1on1' },
  ];

  const node = (
    <>
      <div
        className="manager-modal-overlay"
        onClick={onClose}
        style={{ display: isOpen ? '' : 'none' }}
      />
      <div
        className="manager-modal-scroll-wrap"
        ref={scrollWrapRef}
        onClick={onClose}
        style={{ display: isOpen ? '' : 'none' }}
      >
        <div className="manager-modal-card" onClick={(e) => e.stopPropagation()}>
          {/* Header (yellow→white gradient + spline + name + ai-rec + buttons) */}
          <div className="manager-modal-header">
            <button type="button" className="manager-modal-close" onClick={onClose} aria-label="닫기">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div
              className={`manager-modal-spline-wrap ${splineActive ? 'spline-active' : ''}`}
              onClick={() => setSplineActive(true)}
              onMouseLeave={() => setSplineActive(false)}
            >
              {isOpen && !splineFailed && (
                <div
                  className={`manager-modal-spline-stage ${splineReady ? 'is-ready' : ''}`}
                >
                  <SplineBoundary onFail={handleSplineFail}>
                    <Spline
                      key={member?.id}
                      scene={PROFILE_SCENE}
                      onLoad={handleSplineLoad}
                    />
                  </SplineBoundary>
                </div>
              )}
            </div>

            <div className="manager-modal-name">{displayMember?.name}</div>
            <div className="manager-modal-role">{displayMember?.role}</div>

            {profile?.aiRecommendation && (
              <p className="manager-modal-ai-rec">{profile.aiRecommendation}</p>
            )}

            <div className="manager-modal-actions">
              <button type="button" className="manager-modal-btn-primary" onClick={onOneOnOneClick}>
                <Icon src={icons?.userOutline} size={20} color="var(--text-white)" baseUrl={baseUrl} />
                <span>1on1</span>
              </button>
              <button type="button" className="manager-modal-btn-secondary" onClick={onMessageClick}>
                <Icon src={icons?.messageText} size={20} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
                <span>메시지</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="manager-modal-body">
            <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />


            {activeTab === 'ai' && profile && (
              <AiBriefingTab profile={profile} agendas={agendas} icons={icons} baseUrl={baseUrl} />
            )}
            {activeTab === 'snippet' && profile?.snippets && (
              <SnippetTab profile={profile} icons={icons} baseUrl={baseUrl} />
            )}
            {activeTab === 'health' && profile?.healthTrend && (
              <HealthTrendTab trend={profile.healthTrend} />
            )}
            {activeTab === 'oneonone' && profile?.oneOnOne && (
              <OneOnOneTab data={profile.oneOnOne} />
            )}
          </div>

          {/* Footer */}
          <div className="manager-modal-footer">
            <span className="manager-modal-footer-text">Get Communication with</span>
            <img src={assetUrl(baseUrl, 'logo.svg')} alt="Pivit" className="manager-modal-footer-logo" />
          </div>
        </div>
      </div>
    </>
  );

  // SSR 환경 대비 — document 가 없으면 마운트 자체를 미룬다.
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}

/**
 * 매니저 모달 segment control — active 탭 위치를 absolute slider 로 전환해 슬라이딩.
 * 활성 탭 button 의 offsetLeft / offsetWidth 를 측정해서 slider 의 left/width 를 갱신.
 */
function Tabs({ tabs, activeTab, onChange }) {
  const containerRef = useRef(null);
  const buttonRefs = useRef({});
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const el = buttonRefs.current[activeTab];
    if (!el) return;
    setSliderStyle({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 });
  }, [activeTab, tabs]);

  return (
    <div ref={containerRef} className="manager-modal-tabs">
      <span
        className="manager-modal-tab-slider"
        style={{
          left: sliderStyle.left,
          width: sliderStyle.width,
          opacity: sliderStyle.opacity,
        }}
      />
      {tabs.map((t) => (
        <button
          key={t.key}
          ref={(el) => { if (el) buttonRefs.current[t.key] = el; }}
          type="button"
          className={`manager-modal-tab ${activeTab === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function MetricTile({ label, value }) {
  return (
    <div className="manager-modal-metric-tile">
      <p className="manager-modal-metric-label">{label}</p>
      <p className="manager-modal-metric-value">{value}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   탭 별 컨텐츠
   ──────────────────────────────────────────────── */

function AiBriefingTab({ profile, agendas, icons, baseUrl }) {
  return (
    <div className="manager-modal-content-section">
      <div className="manager-modal-brief-card">
        <div className="manager-modal-brief-label-row">
          <Icon src={icons?.summarySparkle} size={12} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          <span className="manager-modal-brief-label">종합 브리핑</span>
        </div>
        <p className="manager-modal-brief-text">{profile.aiBrief}</p>
      </div>

      {agendas.map((a, i) => (
        <div key={i} className="manager-modal-agenda-item">
          {i === 0 && <p className="manager-modal-agenda-list-title">1on1 추천 아젠다</p>}
          <div className="manager-modal-agenda-content">
            <p className="manager-modal-agenda-heading">{i + 1}. {a.title}</p>
            <p className="manager-modal-agenda-question">{a.question}</p>
          </div>
        </div>
      ))}

      {profile.metrics && (
        <div className="manager-modal-metrics-section">
          <div className="manager-modal-metrics-grid">
            <MetricTile label="헬스 평균" value={profile.metrics.healthAvg} />
            <MetricTile label="스니핏 연속" value={profile.metrics.snippetStreak} />
            <MetricTile label="마지막 1on1" value={profile.metrics.lastOneOnOne} />
            <MetricTile label="KR 달성률" value={profile.metrics.krProgress} />
          </div>
        </div>
      )}
    </div>
  );
}

function SnippetTab({ profile, icons, baseUrl }) {
  return (
    <div className="manager-modal-content-section">
      {/* AI 요약 카드 (이번 주) */}
      <div className="manager-modal-brief-card">
        <div className="manager-modal-brief-label-row">
          <Icon src={icons?.summarySparkle} size={12} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          <span className="manager-modal-brief-label">AI 요약 · 이번 주</span>
        </div>
        <p className="manager-modal-brief-text">{profile.snippetsSummary || profile.aiBrief}</p>
      </div>

      {/* 스니핏 항목들 */}
      {profile.snippets.map((s, i) => (
        <SnippetItem key={i} snippet={s} />
      ))}
    </div>
  );
}

function SnippetItem({ snippet }) {
  return (
    <div className="manager-modal-snippet-item">
      <div className="manager-modal-snippet-meta">
        <p className="manager-modal-snippet-date">{snippet.date}</p>
        <div className="manager-modal-snippet-tags">
          {snippet.tags?.map((t) => (
            <span key={t} className="manager-modal-snippet-tag">{t}</span>
          ))}
          <span className="manager-modal-snippet-health">
            <CheckHeartIcon size={14} />
            <span>{snippet.healthScore}</span>
          </span>
        </div>
      </div>
      <div className="manager-modal-snippet-body">
        <p className="manager-modal-snippet-title">{snippet.title}</p>
        {(snippet.ups?.length || snippet.downs?.length) && (
          <div className="manager-modal-snippet-points">
            {snippet.ups?.map((u, i) => (
              <span key={`u${i}`} className="manager-modal-snippet-point">
                <ArrowUpIcon size={16} />
                <span>{u}</span>
                <span className="manager-modal-snippet-dot">•</span>
              </span>
            ))}
            {snippet.downs?.map((d, i) => (
              <span key={`d${i}`} className="manager-modal-snippet-point">
                <ArrowUpIcon size={16} className="rotate-180" />
                <span>{d}</span>
                <span className="manager-modal-snippet-dot">•</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckHeartIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path
        d="M11.6667 4.66667C11.6667 3.376 10.6573 2.33333 9.41667 2.33333C8.49 2.33333 7.69333 2.91667 7.34833 3.74C7.00333 2.91667 6.20667 2.33333 5.28 2.33333C4.03933 2.33333 3.03 3.376 3.03 4.66667C3.03 8.43367 7.34833 11 7.34833 11M9.91667 8.16667L11.0833 9.33333L13.4167 7"
        stroke="var(--colors-text-textWarningPrimary, #dc6803)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      style={className.includes('rotate-180') ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path
        d="M8 13.333V2.667M8 2.667L3.333 7.333M8 2.667L12.667 7.333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OneOnOneTab({ data }) {
  return (
    <div className="manager-modal-content-section">
      {/* 마지막 1on1 1-grid */}
      <div className="manager-modal-trend-grid manager-modal-oneonone-grid">
        <MetricTile label="마지막 1on1" value={data.lastDate} />
      </div>

      {/* 1on1 기록 항목들 */}
      {data.items?.map((item, i) => (
        <div key={i} className="manager-modal-oneonone-item">
          <p className="manager-modal-oneonone-date">{item.date}</p>
          <p className="manager-modal-oneonone-title">{item.title}</p>
        </div>
      ))}
    </div>
  );
}

function HealthTrendTab({ trend }) {
  return (
    <div className="manager-modal-content-section">
      {/* 3-grid KPI */}
      <div className="manager-modal-trend-grid">
        <MetricTile label="현재" value={trend.current} />
        <MetricTile label="변화" value={trend.change} />
        <MetricTile label="팀 평균" value={trend.teamAvg} />
      </div>

      {/* Chart */}
      <HealthChart points={trend.points || []} teamAverage={trend.teamAverage} dates={trend.dates || []} />

      {/* 감지된 플래그 */}
      {trend.flags?.length > 0 && (
        <div className="manager-modal-agenda-item">
          <p className="manager-modal-agenda-list-title">감지된 플래그</p>
          <div className="manager-modal-flags">
            {trend.flags.map((f, i) => (
              <p key={i} className={`manager-modal-flag manager-modal-flag-${f.severity}`}>
                {f.label}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 헬스 트렌드 line chart (SVG).
 * y축 0~10, x축 dates 4개, line + dots + 팀 평균 dashed line.
 */
function HealthChart({ points, teamAverage, dates }) {
  const W = 336;
  const H = 150;
  const PAD_LEFT = 24;
  const PAD_RIGHT = 12;
  const Y_MAX = 10;

  const xFor = (i, n) =>
    PAD_LEFT + ((W - PAD_LEFT - PAD_RIGHT) / Math.max(1, n - 1)) * i;
  const yFor = (v) => (H - (v / Y_MAX) * H);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i, points.length)} ${yFor(p.value)}`)
    .join(' ');
  const teamY = teamAverage != null ? yFor(teamAverage) : null;

  return (
    <div className="manager-modal-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        {/* y 축 grid lines */}
        {[10, 8, 6, 4, 2, 0].map((v) => (
          <g key={v}>
            <text x={0} y={yFor(v) + 4} fontSize="12" fill="var(--text-tertiary)">{v}</text>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT / 2}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="var(--border-secondary-alt, #e6e8ea)"
              strokeWidth="1"
            />
          </g>
        ))}
        {/* 팀 평균 dashed */}
        {teamY != null && (
          <line
            x1={PAD_LEFT}
            x2={W - PAD_RIGHT / 2}
            y1={teamY}
            y2={teamY}
            stroke="var(--text-tertiary)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        )}
        {/* 라인 그래프 */}
        {linePath && (
          <path d={linePath} stroke="var(--utility-purple-500)" strokeWidth="2" fill="none" />
        )}
        {/* 데이터 포인트 dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xFor(i, points.length)}
            cy={yFor(p.value)}
            r="4"
            fill="var(--utility-purple-500)"
          />
        ))}
      </svg>
      {/* x축 라벨 */}
      <div
        className="manager-modal-chart-x-labels"
        style={{ paddingLeft: PAD_LEFT, paddingRight: PAD_RIGHT }}
      >
        {dates.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      {teamAverage != null && (
        <div className="manager-modal-chart-legend">
          <span className="manager-modal-chart-legend-line" />
          <span>팀 평균 {teamAverage}</span>
        </div>
      )}
    </div>
  );
}

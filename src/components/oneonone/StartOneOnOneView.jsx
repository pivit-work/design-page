import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * "1on1 진행" 준비 뷰 — Figma 16817:39186(준비1) / 16972:15514(준비2).
 *
 * 원온원 페이지 안의 뷰 (full-width 카드, 페이지 스크롤). "AI 브리핑 및 매니저
 * 관점 초안 전체 생성" 버튼을 누르면 briefingExpanded=true 가 되어 요약 + 토픽
 * 배지 + 코칭 가이드가 펼쳐지고, 매니저 관점 textarea 가 AI 초안으로 채워진다.
 * 각 매니저 관점 항목을 "확정"하면 카운트가 올라가고, 4/4 가 되면 푸터 버튼이
 * "시작하기"로 바뀐다.
 *
 * member shape: { name, role, avatar, badge? }
 */
const MEMBER_SUPPORTING = '2026.04.08 · 수시 · 2026.03.06 – 2026.04.08';
// 녹음 시작 후 sticky 미니 위젯용 더미 데이터.
const REC_MEETING_TIME = '2026.04.08 · 11:00 ~';
const REC_ELAPSED = '04:29';
const REC_WAVE = [5, 5, 14, 9, 9, 12];

const PREP_BARS = [
  { who: '김민준', pct: 50 },
  { who: '나(매니저)', pct: 5 },
];

const COACHING_GUIDE = [
  {
    title: '블로커 해소 (긴급)',
    body: 'A팀 협업 채널 미개설이 2주 연속 업무 지연의 주요 원인으로 기록됩니다. 이번 미팅에서 매니저가 A팀 리더에게 직접 연락하는 것을 명시적 액션아이템으로 합의하고, 완료 기한을 이번 주 내로 설정하세요.',
  },
  {
    title: 'OKR 인식 정합 (중요)',
    body: '팀원이 KR2를 55%로 자가 평가하고 있으나 실제는 50%입니다. 고객 인터뷰 일정을 4/15까지 확정하는 것을 다음 KR2 달성의 선행 조건으로 함께 확인하고, 구체적 책임자와 방법을 이번 미팅에서 결정하세요.',
  },
  {
    title: '커리어 논의 (필요)',
    body: 'PM 트랙 전환 의향이 최소 3회 기록되었습니다. 이번 미팅에서 구체적인 전환 로드맵을 논의하거나, 전환이 현실적으로 가능한지 HR 상담 연결 여부를 결정하세요. 결론을 미루면 이직 가능성이 높아질 수 있습니다.',
  },
  {
    title: '몰입도 하락 모니터링 (주의)',
    body: '지난 4주간 Health Check 몰입도가 7→5로 하락했습니다. 블로커 지속·커리어 불확실성과 연관 가능성이 있습니다. 미팅 중 부담 없이 물어보세요: "요즘 에너지 수준은 어때요?"',
  },
];

const BRIEFING_SUMMARY =
  '김민준 님은 이번 기간(3/6–4/8) 동안 KR1(전환율 15%)을 72%까지 달성했으며 A/B 테스트 적용과 온보딩 문서화가 주요 기여 요인입니다. 반면 KR2(NPS 45점)는 실제 진행률 50%로 자가 평가(55%)보다 낮게 나타났고, 고객 인터뷰 일정이 3주째 미확정 상태입니다. A팀 협업 채널 미개설이 2주 연속 블로커로 기록되었으며, 커리어 방향(PM 전환)에 대한 논의 요청이 Daily Snippet에서 2회, 이전 1on1에서 1회 확인됩니다. Health Check 기준 이번 달 몰입도는 소폭 하락(7→5) 중입니다.';
// 브리핑 요약 아래 플래그 배지 — 톤(색)별 + 아이콘.
const BRIEFING_FLAGS = [
  { label: '블로커 미해결(2건)', tone: 'error', icon: '/icons-solid/slash-circle-01.svg' },
  { label: 'KR2 목표 대비 지연', tone: 'warning', icon: '/icons-solid/alert-triangle.svg' },
  { label: '커리어 논의 요청', tone: 'blue', icon: '/icons-solid/message-notification-circle.svg' },
  { label: '몰입도 하락', tone: 'purple', icon: '/icons-solid/corner-right-down.svg' },
];

const MEMBER_REPORT =
  '이번 기간(2026.03.06–04.08) 동안 온보딩 플로우 문서화를 기한 내 완료하고 팀 전체에 공유했습니다. 신규 고객 3사 온보딩을 성공적으로 진행했으며, A/B 테스트 결과를 분석해 전환율 개선안을 제안했습니다.\n\nKR1(신규 고객 전환율 15%)은 72%로 순항 중입니다. A/B 테스트 결과 적용이 주요 기여 요인이며 현재 속도 유지 시 기한 내 달성 가능합니다. KR2(NPS 45점)는 50%로, 고객 인터뷰 일정이 3주째 미확정 상태인 것이 현재 가장 큰 병목입니다.\n\n현재 블로커는 ① A팀 협업 채널 미개설(회의록 3/19, 스니핏 2건 반복 언급) ② NPS 고객 인터뷰 일정 미확정입니다. 매니저의 A팀 리더 직접 연결 또는 채널 개설 개입과 고객 인터뷰 대상자 추천이 필요합니다. 인터뷰 진행을 위한 리서치 도구(Maze 또는 Typeform Pro) 접근 권한도 요청드립니다.';
const MEMBER_REPORT_SOURCE = '출처: Daily Snippet 12건 · 회의록 3건 · 피드백 2건';

const OKR_SELF = [
  { kr: 'KR1. 신규 고객 전환율 15% 달성', actual: 62, self: 70 },
  {
    kr: 'KR2. NPS 스코어 45점 이상',
    actual: 50,
    self: 55,
    alert: '자가 평가가 실제보다 5%p 높음 — 인식 정합 논의 권장',
  },
];
const UPWARD_FEEDBACK =
  '"이번 분기 방향 공유가 명확했습니다. 우선순위가 자주 바뀌는 부분이 아쉬웠어요."';

const CAPABILITIES = [
  { key: 'expertise', label: '업무 전문성', value: 5 },
  { key: 'communication', label: '커뮤니케이션', value: 3 },
  { key: 'problemSolving', label: '문제 해결력', value: 4 },
  { key: 'teamwork', label: '협업 / 팀워크', value: 5 },
  { key: 'selfDriven', label: '자가주도성', value: 2 },
];

// 매니저 관점 — 확정 카운트 대상 4개 섹션. badges = AI 초안 출처 배지(첫 번째는
// 강조), hint = (SBI 등) 보조 구조 배지.
const SOURCE_BADGES = ['Daily Snippet', '회의록', '피드백', '기존1on1'];
const MGR_SECTIONS = [
  { key: 'strengths', title: '관찰한 강점', badges: SOURCE_BADGES, kind: 'textarea' },
  { key: 'sbi', title: '개선 피드백 (SBI 형식)', badges: SOURCE_BADGES, hint: ['Situation', 'Behavior', 'Impact'], kind: 'textarea' },
  { key: 'support', title: '지원 계획', badges: SOURCE_BADGES, kind: 'textarea' },
  { key: 'caps', title: '역량 매니저 평가', badges: SOURCE_BADGES, kind: 'caps' },
];
const TEXTAREA_PLACEHOLDER = 'AI 초안 생성 또는 직접 입력';

const AI_DRAFTS = {
  strengths:
    '온보딩 플로우 문서화를 기한 내 완료하고 팀 전체에 공유한 점이 인상적입니다. A/B 테스트 결과를 분석해 전환율 개선안까지 제안한 주도성도 강점입니다. 어려운 상황(A팀 블로커)에서도 우회 경로를 찾아 KR1 진척을 유지했습니다.',
  sbi:
    '(Situation) 3/19 팀 회의에서 (Behavior) A팀 협업 채널 이슈를 공유했지만 후속 에스컬레이션 없이 2주간 같은 블로커가 반복되었고 (Impact) KR2 진행이 지연되었습니다. 다음엔 블로커 발견 즉시 매니저에게 에스컬레이션해 주세요.',
  support:
    '① A팀 리더에게 매니저가 직접 연결 — 이번 주 내. ② NPS 고객 인터뷰 대상자 3명 추천 + 리서치 도구(Maze/Typeform Pro) 권한 신청 대행. ③ PM 전환 관련 HR 상담 일정 주선.',
};

// Recognition & 피드백
const MEMBER_AGENDAS = [
  'A팀 협업 채널 — 블로커 해소 방안 논의',
  'KR2 NPS — 고객 인터뷰 일정 확정',
  '커리어 성장 기회 검토 (PM 트랙)',
];
const INITIAL_MGR_AGENDAS = ['KR2 집중 지원 방안 논의', 'PM 전환 로드맵 — HR 상담 연결 결정'];
const EXPECTED_ACTIONS = [
  { text: 'A팀 협업 채널 개설 요청', owner: '나', due: '이번주' },
  { text: 'PM 전환 HR 상담 연결', owner: '나', due: '4/22' },
];

function ProgressBar({ pct }) {
  return (
    <div className="ono-start-progress-track">
      <div className="ono-start-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

// 매니저 평가 점수 색상: 3 주의(warning), 2↓ 위험(error), 그 외(4·5)는 기본 색.
const ratingTone = (v) => (v === 3 ? 'is-warn' : v <= 2 ? 'is-bad' : '');

// ai=true(AI 초안 생성됨)이면 막대 색이 green → purple 로 바뀐다.
function RatingBar({ value, ai = false }) {
  return (
    <div className="ono-start-rating">
      <div className={`ono-start-rating-segs ${ai ? 'is-ai' : ''}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`ono-start-rating-seg ${n <= value ? 'is-on' : ''}`} />
        ))}
      </div>
      <span className={`ono-start-rating-num ${ratingTone(value)}`}>{value}</span>
    </div>
  );
}

const AI_WARN =
  'AI 초안 — 반드시 검토 후 확정해주세요. 미확정 내용은 DONE 피드백에 반영되지 않습니다.';

export default function StartOneOnOneView({ member, onBack, baseUrl = '' }) {
  // briefingExpanded: AI 초안이 생성됐는지(되돌리지 않음 — CTA/매니저 관점 상태 유지).
  // briefingOpen: 브리핑 카드의 펼친 상세(요약·플래그·코칭 가이드)가 보이는지(접기/펼치기 토글).
  const [briefingExpanded, setBriefingExpanded] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [strengths, setStrengths] = useState('');
  const [sbi, setSbi] = useState('');
  const [support, setSupport] = useState('');
  const [caps] = useState(() => Object.fromEntries(CAPABILITIES.map((c) => [c.key, c.value])));
  // 매니저 관점 4개 항목 확정 상태.
  const [confirmed, setConfirmed] = useState({ strengths: false, sbi: false, support: false, caps: false });
  // 아젠다 & 액션아이템: 멤버 제안·예상 액션은 읽기 전용. 매니저만 "매니저 추가
  // 아젠다"를 추가/삭제할 수 있다.
  const [mgrAgendas, setMgrAgendas] = useState(INITIAL_MGR_AGENDAS);
  const [agendaInput, setAgendaInput] = useState('');
  // "시작하기" → 녹음 시작: 페이지 최상단으로 스크롤 + sticky 미니 녹음 위젯 노출.
  const [recording, setRecording] = useState(false);
  const startMeeting = () => {
    setRecording(true);
    document.querySelector('.ono-page')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const confirmedCount = Object.values(confirmed).filter(Boolean).length;
  const allConfirmed = confirmedCount === 4;

  const generateAll = () => {
    setBriefingExpanded(true);
    setBriefingOpen(true);
    setStrengths(AI_DRAFTS.strengths);
    setSbi(AI_DRAFTS.sbi);
    setSupport(AI_DRAFTS.support);
  };
  const toggleConfirm = (key) => setConfirmed((p) => ({ ...p, [key]: !p[key] }));

  const removeMgrAgenda = (a) => setMgrAgendas((prev) => prev.filter((x) => x !== a));
  const addMgrAgenda = () => {
    const v = agendaInput.trim();
    if (!v) return;
    setMgrAgendas((prev) => [...prev, v]);
    setAgendaInput('');
  };

  const sectionValue = (key) => ({ strengths, sbi, support }[key] ?? '');
  const setSectionValue = (key, v) => {
    if (key === 'strengths') setStrengths(v);
    else if (key === 'sbi') setSbi(v);
    else if (key === 'support') setSupport(v);
  };

  return (
    <div className="ono-start-view">
      <div className="ono-start-view-card">
        {recording && (
          <div className="ono-start-rec-wrap">
            <div className="ono-start-rec-mini">
              <div className="ono-start-rec-head">
                <p className="ono-start-rec-title">1on1 녹음 중...</p>
                <div className="ono-start-rec-member">
                  <div className="ono-start-rec-avatar">
                    {member?.avatar && <img src={member.avatar} alt="" />}
                  </div>
                  <div className="ono-start-rec-member-info">
                    <div className="ono-start-rec-name-row">
                      <span className="ono-start-rec-name">{member?.name ?? '김민준'}</span>
                      <span className="ono-start-rec-badge">{member?.badge ?? 'P미팅'}</span>
                    </div>
                    <span className="ono-start-rec-time">{REC_MEETING_TIME}</span>
                  </div>
                </div>
              </div>
              <div className="ono-start-rec-bar">
                <div className="ono-start-rec-timer">
                  <span className="ono-start-rec-elapsed">{REC_ELAPSED}</span>
                  <div className="ono-start-rec-wave">
                    {REC_WAVE.map((h, i) => (
                      <span key={i} style={{ height: `${h}px` }} />
                    ))}
                  </div>
                </div>
                <button type="button" className="ono-start-rec-stop" onClick={() => setRecording(false)}>종료</button>
              </div>
            </div>
          </div>
        )}
        <div className="ono-start-view-body">
          <p className="ono-start-modal-title">1on1 • 2026.04.12</p>

          {/* 멤버 */}
          <div className="ono-add-modal-member">
            <div className="ono-add-modal-member-avatar">
              {member?.avatar && <img src={member.avatar} alt="" />}
            </div>
            <div className="ono-add-modal-member-info">
              <div className="ono-add-modal-member-name-row">
                <span className="ono-add-modal-member-name">{member?.name ?? '김민준'}</span>
                <span className="ono-add-modal-member-badge">{member?.badge ?? 'P미팅'}</span>
              </div>
              <span className="ono-add-modal-member-role">{MEMBER_SUPPORTING}</span>
            </div>
          </div>

          {/* 준비도 */}
          <div className="ono-start-section">
            <span className="ono-start-section-title">준비도</span>
            <div className="ono-start-prep">
              {PREP_BARS.map((b) => (
                <div key={b.who} className="ono-start-prep-row">
                  <div className="ono-start-prep-meta">
                    <span className="ono-start-prep-who">{b.who}</span>
                    <span className="ono-start-prep-pct">{b.pct}%</span>
                  </div>
                  <ProgressBar pct={b.pct} />
                </div>
              ))}
            </div>
          </div>

          {/* CTA bar */}
          {briefingExpanded ? (
            <div className="ono-start-cta is-done">
              <span className="ono-start-cta-left">
                <Icon src="/icons-solid/check-circle.svg" size={20} color="var(--utility-purple-500, #7a5af8)" baseUrl={baseUrl} />
                AI 초안 생성 완료 — {confirmedCount}/4 항목 확정됨
              </span>
              <span className="ono-start-cta-hint">검토 후 확정하세요</span>
            </div>
          ) : (
            <button type="button" className="ono-start-cta is-cta" onClick={generateAll}>
              <Icon src="/icons-solid/ai-chat-01.svg" size={20} color="var(--text-white)" baseUrl={baseUrl} />
              AI 브리핑 및 매니저 관점 초안 전체 생성
            </button>
          )}

          {/* AI 브리핑 카드 */}
          <div className="ono-start-briefing-card">
            <div className="ono-start-briefing-head">
              <span className="ono-start-briefing-title">
                <Icon src="/icons-solid/ai-chat-01.svg" size={14} color="#ad00fe" baseUrl={baseUrl} />
                AI 브리핑
              </span>
              {briefingOpen ? (
                <button type="button" className="ono-start-briefing-toggle" onClick={() => setBriefingOpen(false)}>접기</button>
              ) : briefingExpanded ? (
                <button type="button" className="ono-start-briefing-toggle" onClick={() => setBriefingOpen(true)}>펼치기</button>
              ) : (
                <button type="button" className="ono-start-briefing-toggle" onClick={generateAll}>브리핑 생성</button>
              )}
            </div>

            {briefingOpen && (
              <>
                <div className="ono-start-briefing-block">
                  <div className="ono-start-briefing-text-box">
                    <p className="ono-start-briefing-text">{BRIEFING_SUMMARY}</p>
                  </div>
                  <div className="ono-start-briefing-badges">
                    {BRIEFING_FLAGS.map((f) => (
                      <span key={f.label} className={`ono-start-flag ono-start-flag-${f.tone}`}>
                        <Icon src={f.icon} size={12} color="currentColor" baseUrl={baseUrl} />
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ono-start-briefing-block">
                  <span className="ono-start-briefing-subtitle">코칭 가이드</span>
                  {COACHING_GUIDE.map((g) => (
                    <div key={g.title} className="ono-start-coaching-card">
                      <p className="ono-start-coaching-title">{g.title}</p>
                      <p className="ono-start-coaching-body">{g.body}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="ono-start-briefing-block">
              <span className="ono-start-briefing-subtitle">멤버 AI 보고서 · 읽기 전용</span>
              <div className="ono-start-report">
                <p className="ono-start-report-text">{MEMBER_REPORT}</p>
                <p className="ono-start-report-source">{MEMBER_REPORT_SOURCE}</p>
              </div>
            </div>

            <div className="ono-start-briefing-block">
              <span className="ono-start-briefing-subtitle">OKR 자가 평가</span>
              <div className="ono-start-okr">
                {OKR_SELF.map((k) => (
                  <div key={k.kr} className="ono-start-okr-row">
                    <p className="ono-start-okr-kr">{k.kr}</p>
                    <div className="ono-start-okr-bars">
                      <div className="ono-start-okr-bar">
                        <span className="ono-start-okr-bar-label">실제</span>
                        <div className="ono-start-okr-bar-line">
                          <ProgressBar pct={k.actual} />
                          <span className="ono-start-okr-bar-pct">{k.actual}%</span>
                        </div>
                      </div>
                      <div className="ono-start-okr-bar">
                        <span className="ono-start-okr-bar-label">자가 평가</span>
                        <div className="ono-start-okr-bar-line">
                          <ProgressBar pct={k.self} />
                          <span className="ono-start-okr-bar-pct">{k.self}%</span>
                        </div>
                      </div>
                    </div>
                    {k.alert && (
                      <p className="ono-start-okr-alert">
                        <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textErrorPrimary, #d92d20)" baseUrl={baseUrl} />
                        {k.alert}
                      </p>
                    )}
                  </div>
                ))}
                <div className="ono-start-upward">
                  <span className="ono-start-upward-label">Upward Feedback</span>
                  <p className="ono-start-upward-text">{UPWARD_FEEDBACK}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 매니저 관점 */}
          <div className="ono-start-section">
            <span className="ono-start-section-title">
              매니저 관점{briefingExpanded ? ' (DONE 전까지 멤버 비공개)' : ''}
            </span>
            <div className="ono-start-mgr">
              {MGR_SECTIONS.map((sec) => (
                <div key={sec.key} className="ono-start-field">
                  <div className="ono-start-field-head">
                    <div className="ono-start-field-label-row">
                      <span className="ono-start-field-label">{sec.title}</span>
                      {sec.badges.map((b) => (
                        <span key={b} className="ono-start-source-badge">{b}</span>
                      ))}
                    </div>
                    <div className="ono-start-field-actions">
                      {!briefingExpanded ? (
                        <button type="button" className="ono-start-ai-draft-btn" onClick={generateAll}>
                          <Icon src="/icons-solid/ai-chat-01.svg" size={14} color="currentColor" baseUrl={baseUrl} />
                          <span>AI 초안</span>
                        </button>
                      ) : confirmed[sec.key] ? (
                        <button type="button" className="ono-start-edit-btn" onClick={() => toggleConfirm(sec.key)}>수정</button>
                      ) : (
                        <>
                          <button type="button" className="ono-start-regen-btn" onClick={generateAll}>재생성</button>
                          <button type="button" className="ono-start-confirm-btn" onClick={() => toggleConfirm(sec.key)}>확정</button>
                        </>
                      )}
                    </div>
                  </div>
                  {sec.hint && (
                    <div className="ono-start-hint-badges">
                      {sec.hint.map((h) => (
                        <span key={h} className="ono-start-topic-badge">{h}</span>
                      ))}
                    </div>
                  )}
                  {briefingExpanded && confirmed[sec.key] && (
                    <span className="ono-start-confirmed-label">✓ 확정됨</span>
                  )}
                  {sec.kind === 'textarea' ? (
                    <textarea
                      className={`ono-start-textarea ${briefingExpanded && !confirmed[sec.key] ? 'is-ai' : ''}`}
                      placeholder={TEXTAREA_PLACEHOLDER}
                      value={sectionValue(sec.key)}
                      onChange={(e) => setSectionValue(sec.key, e.target.value)}
                    />
                  ) : (
                    <>
                      <div className="ono-start-caps">
                        {CAPABILITIES.map((c) => (
                          <div key={c.key} className="ono-start-cap-row">
                            <span className="ono-start-cap-label">{c.label}</span>
                            <RatingBar value={caps[c.key]} ai={briefingExpanded} />
                          </div>
                        ))}
                      </div>
                      <p className="ono-start-cap-hint">멤버 자가진단 대비 차이가 표시됩니다. 클릭해서 수정 가능합니다.</p>
                    </>
                  )}
                  {briefingExpanded && (
                    <p className="ono-start-ai-warn">
                      <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textWarningPrimary, #dc6803)" baseUrl={baseUrl} />
                      {AI_WARN}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 아젠다 & 액션아이템 — 매니저 모드 전용 뷰. 멤버 제안·예상 액션은
              읽기 전용이며, 매니저는 "매니저 추가 아젠다"만 추가/삭제할 수 있다.
              일반 직원 뷰는 별도(미구현). */}
          <div className="ono-start-section">
            <span className="ono-start-section-title">아젠다 &amp; 액션아이템</span>
            <div className="ono-start-mgr">
              {/* 멤버 제안 아젠다 — 읽기 전용 */}
              <div className="ono-start-field">
                <span className="ono-start-field-label">멤버 제안 아젠다</span>
                <div className="ono-start-agenda-list">
                  {MEMBER_AGENDAS.map((a) => (
                    <div key={a} className="ono-start-agenda-item">
                      <span className="ono-start-agenda-role is-member">멤버</span>
                      <span className="ono-start-agenda-text">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* 매니저 추가 아젠다 — 매니저만 추가/삭제 */}
              <div className="ono-start-field">
                <span className="ono-start-field-label">매니저 추가 아젠다</span>
                <div className="ono-start-agenda-list">
                  {mgrAgendas.map((a) => (
                    <div key={a} className="ono-start-agenda-item is-mgr">
                      <span className="ono-start-agenda-role is-manager">매니저</span>
                      <span className="ono-start-agenda-text">{a}</span>
                      <button type="button" className="ono-start-agenda-x" aria-label="삭제" onClick={() => removeMgrAgenda(a)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="4" x2="4" y2="12" />
                          <line x1="4" y1="4" x2="12" y2="12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="ono-start-agenda-add">
                  <input
                    type="text"
                    placeholder="논의 주제 추가 (Enter)"
                    value={agendaInput}
                    onChange={(e) => setAgendaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMgrAgenda(); } }}
                  />
                  <button type="button" className="ono-start-agenda-add-btn" onClick={addMgrAgenda}>추가</button>
                </div>
              </div>
              {/* 확정 예상 액션아이템 */}
              <div className="ono-start-field">
                <span className="ono-start-field-label">이번 미팅에서 확정할 액션아이템 (예상)</span>
                <div className="ono-start-agenda-list">
                  {EXPECTED_ACTIONS.map((a) => (
                    <div key={a.text} className="ono-start-action-item">
                      <span className="ono-start-action-text">• {a.text}</span>
                      <span className="ono-start-action-meta">
                        <span className="ono-start-action-owner">{a.owner}</span>
                        <span className="ono-start-action-badge">{a.due}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ono-start-view-footer">
          <button type="button" className="ono-add-modal-btn ono-add-modal-btn-secondary" onClick={onBack}>저장</button>
          {recording ? (
            <button type="button" className="ono-add-modal-btn ono-start-footer-end" onClick={() => setRecording(false)}>1on1 종료</button>
          ) : allConfirmed ? (
            <button type="button" className="ono-add-modal-btn ono-add-modal-btn-primary" onClick={startMeeting}>시작하기</button>
          ) : (
            <button type="button" className="ono-add-modal-btn ono-start-footer-disabled" disabled>
              매니저 관점 확정 후 시작 가능({confirmedCount}/4)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

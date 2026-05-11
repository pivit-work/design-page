import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * "1on1 진행" 준비 모달 — Figma 16817:39186(준비1) / 16972:15514(준비2).
 *
 * 멤버 카드의 "1on1 진행" 버튼에서 호출. 720px 폭, 본문 스크롤. AI 브리핑을
 * "브리핑 생성"하면(briefingExpanded=true) 요약 + 토픽 배지 + 코칭 가이드가
 * 펼쳐지고, 매니저 관점 필드들이 AI 초안으로 채워진다. "접기"로 다시 닫힘.
 *
 * member shape: { name, role, avatar, badge? }
 */
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
const BRIEFING_BADGES = ['KR2 진행 지연', 'A팀 채널 블로커', 'PM 전환 논의', '몰입도 하락'];

const MEMBER_REPORT =
  '이번 기간(2026.03.06–04.08) 동안 온보딩 플로우 문서화를 기한 내 완료하고 팀 전체에 공유했습니다. 신규 고객 3사 온보딩을 성공적으로 진행했으며, A/B 테스트 결과를 분석해 전환율 개선안을 제안했습니다. KR1(신규 고객 전환율 15%)은 72%로 순항 중입니다. A/B 테스트 결과 적용이 주요 기여 요인이며 현재 속도 유지 시 기한 내 달성 가능합니다. KR2(NPS 45점)는 50%로, 고객 인터뷰 일정이 3주째 미확정 상태인 것이 현재 가장 큰 병목입니다. 현재 블로커는 ① A팀 협업 채널 미개설(회의록 3/19, 스니핏 2건 반복 언급) ② NPS 고객 인터뷰 일정 미확정입니다. 매니저의 A팀 리더 직접 연결 또는 채널 개설 개입과 고객 인터뷰 대상자 추천이 필요합니다. 인터뷰 진행을 위한 리서치 도구(Maze 또는 Typeform Pro) 접근 권한도 요청드립니다.';
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

const MEMBER_AGENDAS = [
  'A팀 협업 채널 개설 — 진행 상황과 매니저 지원이 필요한 부분',
  'KR2(NPS) 고객 인터뷰 일정 — 대상자 추천과 리서치 도구 권한',
  'PM 트랙 전환 가능성 — 구체적 로드맵 또는 HR 상담 연결',
];
const EXPECTED_ACTIONS = [
  { text: '매니저가 A팀 리더에게 직접 연락해 협업 채널 개설 — 이번 주 내', badge: '긴급' },
  { text: 'KR2 고객 인터뷰 일정 4/15까지 확정 (책임자: 김민준)', badge: '중요' },
];

const AI_DRAFTS = {
  strengths:
    '온보딩 플로우 문서화를 기한 내 완료하고 팀 전체에 공유한 점이 인상적입니다. A/B 테스트 결과를 분석해 전환율 개선안까지 제안한 주도성도 강점입니다. 어려운 상황(A팀 블로커)에서도 우회 경로를 찾아 KR1 진척을 유지했습니다.',
  sbi:
    '(Situation) 3/19 팀 회의에서 (Behavior) A팀 협업 채널 이슈를 공유했지만 후속 에스컬레이션 없이 2주간 같은 블로커가 반복되었고 (Impact) KR2 진행이 지연되었습니다. 다음엔 블로커 발견 즉시 매니저에게 에스컬레이션해 주세요.',
  support:
    '① A팀 리더에게 매니저가 직접 연결 — 이번 주 내. ② NPS 고객 인터뷰 대상자 3명 추천 + 리서치 도구(Maze/Typeform Pro) 권한 신청 대행. ③ PM 전환 관련 HR 상담 일정 주선.',
};

function ProgressBar({ pct }) {
  return (
    <div className="ono-start-progress-track">
      <div className="ono-start-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function RatingBar({ value }) {
  return (
    <div className="ono-start-rating">
      <div className="ono-start-rating-segs">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`ono-start-rating-seg ${n <= value ? 'is-on' : ''}`} />
        ))}
      </div>
      <span className="ono-start-rating-num">{value}</span>
    </div>
  );
}

function AiDraftBtn({ baseUrl }) {
  return (
    <button type="button" className="ono-start-ai-draft-btn">
      <Icon src="/icons-solid/ai-chat-01.svg" size={14} color="#ad00fe" baseUrl={baseUrl} />
      <span>AI 초안</span>
    </button>
  );
}

const TOPIC_BADGES = ['업무 전문성', 'OKR', '커리어', '협업'];

function SectionLabel({ title, badges = [], children }) {
  return (
    <div className="ono-start-field-head">
      <div className="ono-start-field-label-row">
        <span className="ono-start-field-label">{title}</span>
        {badges.map((b) => (
          <span key={b} className="ono-start-topic-badge">{b}</span>
        ))}
      </div>
      {children}
    </div>
  );
}

export default function StartOneOnOneModal({ open, member, onClose, onSubmit, baseUrl = '' }) {
  const [briefingExpanded, setBriefingExpanded] = useState(false);
  const [strengths, setStrengths] = useState('');
  const [sbi, setSbi] = useState('');
  const [support, setSupport] = useState('');
  const [caps, setCaps] = useState(() =>
    Object.fromEntries(CAPABILITIES.map((c) => [c.key, c.value])),
  );
  const [selectedAgenda, setSelectedAgenda] = useState([]);
  const [agendaInput, setAgendaInput] = useState('');
  const [extraAgendas, setExtraAgendas] = useState([]);
  const [memo, setMemo] = useState('');

  // 모달이 닫혔다 다시 열릴 때 폼 초기화 — "adjusting state during render" 패턴
  // (useEffect 안에서 setState 하면 cascading render 경고).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setBriefingExpanded(false);
      setStrengths('');
      setSbi('');
      setSupport('');
      setCaps(Object.fromEntries(CAPABILITIES.map((c) => [c.key, c.value])));
      setSelectedAgenda([]);
      setAgendaInput('');
      setExtraAgendas([]);
      setMemo('');
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const generateBriefing = () => {
    setBriefingExpanded(true);
    // AI 초안으로 매니저 관점 필드 채우기
    setStrengths(AI_DRAFTS.strengths);
    setSbi(AI_DRAFTS.sbi);
    setSupport(AI_DRAFTS.support);
  };

  const toggleAgenda = (a) =>
    setSelectedAgenda((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  const addAgenda = () => {
    const v = agendaInput.trim();
    if (!v) return;
    setExtraAgendas((prev) => [...prev, v]);
    setSelectedAgenda((prev) => [...prev, v]);
    setAgendaInput('');
  };

  if (typeof document === 'undefined') return null;

  const allAgendas = [...MEMBER_AGENDAS, ...extraAgendas];

  const node = (
    <>
      <div className="ono-add-modal-overlay" onClick={onClose} style={{ display: open ? '' : 'none' }} />
      <div className="ono-add-modal-scroll-wrap" onClick={onClose} style={{ display: open ? '' : 'none' }}>
        <div className="ono-add-modal-card ono-start-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="ono-add-modal-topbar">
            <button type="button" className="ono-add-modal-close" onClick={onClose} aria-label="닫기">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="ono-add-modal-body ono-start-modal-body">
            <p className="ono-start-modal-title">1on1 • 2026.04.12</p>

            {/* 멤버 */}
            <div className="ono-add-modal-member">
              <div className="ono-add-modal-member-avatar">
                {member?.avatar && <img src={member.avatar} alt="" />}
              </div>
              <div className="ono-add-modal-member-info">
                <div className="ono-add-modal-member-name-row">
                  <span className="ono-add-modal-member-name">{member?.name ?? '김민준'}</span>
                  {member?.badge && <span className="ono-add-modal-member-badge">{member.badge}</span>}
                </div>
                {member?.role && <span className="ono-add-modal-member-role">{member.role}</span>}
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
                  <Icon src="/icons-solid/check-circle.svg" size={20} color="var(--colors-foreground-fgBrandPrimary, #2dbd82)" baseUrl={baseUrl} />
                  AI 브리핑이 생성되었습니다
                </span>
                <span className="ono-start-cta-hint">검토 후 확정하세요</span>
              </div>
            ) : (
              <button type="button" className="ono-start-cta is-cta" onClick={generateBriefing}>
                <Icon src="/icons-solid/ai-chat-01.svg" size={20} color="var(--text-white)" baseUrl={baseUrl} />
                AI 브리핑 생성
              </button>
            )}

            {/* AI 브리핑 카드 */}
            <div className="ono-start-briefing-card">
              <div className="ono-start-briefing-head">
                <span className="ono-start-briefing-title">
                  <Icon src="/icons-solid/ai-chat-01.svg" size={14} color="#ad00fe" baseUrl={baseUrl} />
                  AI 브리핑
                </span>
                {briefingExpanded ? (
                  <button type="button" className="ono-start-briefing-toggle" onClick={() => setBriefingExpanded(false)}>접기</button>
                ) : (
                  <button type="button" className="ono-start-briefing-toggle" onClick={generateBriefing}>브리핑 생성</button>
                )}
              </div>

              {briefingExpanded && (
                <>
                  <div className="ono-start-briefing-block">
                    <p className="ono-start-briefing-text">{BRIEFING_SUMMARY}</p>
                    <div className="ono-start-briefing-badges">
                      {BRIEFING_BADGES.map((b) => (
                        <span key={b} className="ono-start-topic-badge">{b}</span>
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

              {/* 멤버 AI 보고서 (항상 표시, 읽기 전용) */}
              <div className="ono-start-briefing-block">
                <span className="ono-start-briefing-subtitle">멤버 AI 보고서 · 읽기 전용</span>
                <div className="ono-start-report">
                  <p className="ono-start-report-text">{MEMBER_REPORT}</p>
                  <p className="ono-start-report-source">{MEMBER_REPORT_SOURCE}</p>
                </div>
              </div>

              {/* OKR 자가 평가 */}
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
                          <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textWarningPrimary, #dc6803)" baseUrl={baseUrl} />
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
                <div className="ono-start-field">
                  <SectionLabel title="관찰한 강점" badges={TOPIC_BADGES}><AiDraftBtn baseUrl={baseUrl} /></SectionLabel>
                  <textarea className="ono-start-textarea" placeholder="멤버의 관찰된 강점을 적어주세요." value={strengths} onChange={(e) => setStrengths(e.target.value)} />
                  {briefingExpanded && (
                    <p className="ono-start-ai-warn">
                      <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textWarningPrimary, #dc6803)" baseUrl={baseUrl} />
                      AI 초안 — 반드시 검토 후 확정해주세요. 미확정 내용은 DONE 피드백에 반영되지 않습니다.
                    </p>
                  )}
                </div>
                <div className="ono-start-field">
                  <SectionLabel title="개선 피드백 (SBI 형식)" badges={TOPIC_BADGES}><AiDraftBtn baseUrl={baseUrl} /></SectionLabel>
                  <textarea className="ono-start-textarea" placeholder="Situation-Behavior-Impact 형식으로 작성해주세요." value={sbi} onChange={(e) => setSbi(e.target.value)} />
                  {briefingExpanded && (
                    <p className="ono-start-ai-warn">
                      <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textWarningPrimary, #dc6803)" baseUrl={baseUrl} />
                      AI 초안 — 반드시 검토 후 확정해주세요. 미확정 내용은 DONE 피드백에 반영되지 않습니다.
                    </p>
                  )}
                </div>
                <div className="ono-start-field">
                  <SectionLabel title="지원 계획" badges={TOPIC_BADGES}><AiDraftBtn baseUrl={baseUrl} /></SectionLabel>
                  <textarea className="ono-start-textarea" placeholder="매니저로서 어떤 지원을 할지 계획을 적어주세요." value={support} onChange={(e) => setSupport(e.target.value)} />
                  {briefingExpanded && (
                    <p className="ono-start-ai-warn">
                      <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textWarningPrimary, #dc6803)" baseUrl={baseUrl} />
                      AI 초안 — 반드시 검토 후 확정해주세요. 미확정 내용은 DONE 피드백에 반영되지 않습니다.
                    </p>
                  )}
                </div>
                <div className="ono-start-field">
                  <SectionLabel title="역량 매니저 평가" badges={TOPIC_BADGES}><AiDraftBtn baseUrl={baseUrl} /></SectionLabel>
                  <div className="ono-start-caps">
                    {CAPABILITIES.map((c) => (
                      <div key={c.key} className="ono-start-cap-row">
                        <span className="ono-start-cap-label">{c.label}</span>
                        <RatingBar value={caps[c.key]} />
                      </div>
                    ))}
                  </div>
                  <p className="ono-start-cap-hint">멤버 자가진단 대비 차이가 표시됩니다. 클릭해서 수정 가능합니다.</p>
                  {briefingExpanded && (
                    <p className="ono-start-ai-warn">
                      <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textWarningPrimary, #dc6803)" baseUrl={baseUrl} />
                      AI 초안 — 반드시 검토 후 확정해주세요. 미확정 내용은 DONE 피드백에 반영되지 않습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Recognition & 피드백 */}
            <div className="ono-start-section">
              <span className="ono-start-section-title">Recognition & 피드백</span>
              <div className="ono-start-mgr">
                <div className="ono-start-field">
                  <SectionLabel title="멤버 제안 아젠다" />
                  <div className="ono-start-agenda-list">
                    {allAgendas.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={`ono-start-agenda-item ${selectedAgenda.includes(a) ? 'is-on' : ''}`}
                        onClick={() => toggleAgenda(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="ono-start-agenda-add">
                    <input
                      type="text"
                      placeholder="아젠다를 추가하세요"
                      value={agendaInput}
                      onChange={(e) => setAgendaInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAgenda(); } }}
                    />
                    <button type="button" className="ono-start-agenda-add-btn" onClick={addAgenda}>추가</button>
                  </div>
                </div>
                <div className="ono-start-field">
                  <SectionLabel title="이번 미팅에서 확정할 액션아이템 (예상)" />
                  <div className="ono-start-agenda-list">
                    {EXPECTED_ACTIONS.map((a) => (
                      <div key={a.text} className="ono-start-action-item">
                        <span className="ono-start-action-text">{a.text}</span>
                        <span className="ono-start-action-badge">{a.badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ono-add-modal-footer">
            <button type="button" className="ono-add-modal-btn ono-add-modal-btn-secondary" onClick={onClose}>취소</button>
            <button
              type="button"
              className="ono-add-modal-btn ono-add-modal-btn-primary"
              onClick={() => onSubmit?.({ member, briefingExpanded, strengths, sbi, support, caps, selectedAgenda, memo })}
            >
              1on1 시작
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(node, document.body);
}

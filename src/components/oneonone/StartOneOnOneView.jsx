import { useEffect, useMemo, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * "1on1 진행" 준비 뷰 — Figma 16817:39186(준비1) / 16972:15514(준비2).
 *
 * 이전에는 모든 데이터(브리핑·OKR·역량·아젠다·AI 초안)를 컴포넌트 내부 상수로
 * 하드코딩했지만, 실제 제품에서는 매니저-팀원 페어 별로 백엔드에서 가져와야 한다.
 * 0.1.127+ 부터는 컴포넌트가 prop 기반으로 동작:
 *   - `data`        : 멤버 사전 입력(브리핑/보고서/OKR/피드백/역량/아젠다/액션)
 *   - `aiDrafts`    : 매니저 관점 AI 초안 3개 (없으면 textarea 비어있음)
 *   - `onGenerateDrafts`/`generatingDrafts` : "AI 초안 전체 생성" 버튼 콜백
 *
 * design-page 데모 wrapper(OneOnOnePage.jsx) 가 이 props 를 채워 기존 데모 화면을
 * 유지하고, pivit-work 등 실제 사용처는 prepareSession 결과를 변환해 넣는다.
 *
 * member shape: { name, role, avatar, badge? }
 */

const SOURCE_BADGES = ['Daily Snippet', '회의록', '피드백', '기존1on1'];
const MGR_SECTIONS = [
  { key: 'strengths', title: '관찰한 강점', badges: SOURCE_BADGES, kind: 'textarea' },
  { key: 'sbi', title: '개선 피드백 (SBI 형식)', badges: SOURCE_BADGES, hint: ['Situation', 'Behavior', 'Impact'], kind: 'textarea' },
  { key: 'support', title: '지원 계획', badges: SOURCE_BADGES, kind: 'textarea' },
  { key: 'caps', title: '역량 매니저 평가', badges: SOURCE_BADGES, kind: 'caps' },
];
const TEXTAREA_PLACEHOLDER = 'AI 초안 생성 또는 직접 입력';
const AI_WARN =
  'AI 초안 — 반드시 검토 후 확정해주세요. 미확정 내용은 DONE 피드백에 반영되지 않습니다.';
const EMPTY_HINT = '아직 수집된 데이터가 없습니다.';

function ProgressBar({ pct, color }) {
  const safePct = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="ono-start-progress-track">
      <div
        className="ono-start-progress-fill"
        style={{ width: `${safePct}%`, background: color }}
      />
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

export default function StartOneOnOneView({
  member,
  data,
  aiDrafts,
  onGenerateDrafts,
  generatingDrafts = false,
  onBack,
  baseUrl = '',
}) {
  const briefing = data?.briefing ?? null;
  const memberReport = data?.memberReport ?? null;
  const okrSelf = data?.okrSelf ?? [];
  const upwardFeedback = data?.upwardFeedback ?? null;
  const capabilities = useMemo(() => data?.capabilities ?? [], [data?.capabilities]);
  const memberAgendas = data?.memberAgendas ?? [];
  const initialMgrAgendas = useMemo(() => data?.initialMgrAgendas ?? [], [data?.initialMgrAgendas]);
  // 멤버 준비도: 멤버 READY 화면(별도) 의 7 섹션 진행도. 백엔드에서 계산해 props 로
  // 전달. null/undefined 면 "—" 로 표시. (spec §4.1.1 / §4.2.3)
  const memberReadyPct = data?.memberReadyPct ?? null;
  const expectedActions = data?.expectedActions ?? [];
  const meetingTime = data?.meetingTime ?? '';
  const recordingMeta = data?.recordingMeta ?? null;
  const meetingTitle = data?.meetingTitle ?? '1on1';

  // briefingExpanded: AI 초안이 채워졌는지(되돌리지 않음). aiDrafts prop 으로
  // 외부 제어 가능 — drafts 있으면 즉시 expanded.
  const [briefingExpanded, setBriefingExpanded] = useState(!!aiDrafts);
  const [briefingOpen, setBriefingOpen] = useState(!!aiDrafts);
  useEffect(() => {
    if (aiDrafts) {
      setBriefingExpanded(true);
      setBriefingOpen(true);
    }
  }, [aiDrafts]);

  const [strengths, setStrengths] = useState('');
  const [sbi, setSbi] = useState('');
  const [support, setSupport] = useState('');
  useEffect(() => {
    if (aiDrafts) {
      setStrengths(aiDrafts.strengths ?? '');
      setSbi(aiDrafts.sbi ?? '');
      setSupport(aiDrafts.support ?? '');
    }
  }, [aiDrafts]);

  const [caps, setCaps] = useState({});
  useEffect(() => {
    setCaps(Object.fromEntries(capabilities.map((c) => [c.key, c.value])));
  }, [capabilities]);

  // 매니저 관점 4개 항목 확정 상태.
  const [confirmed, setConfirmed] = useState({ strengths: false, sbi: false, support: false, caps: false });
  // 아젠다: 매니저만 추가/삭제할 수 있다.
  const [mgrAgendas, setMgrAgendas] = useState([]);
  useEffect(() => { setMgrAgendas(initialMgrAgendas); }, [initialMgrAgendas]);
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

  const handleGenerate = () => {
    if (!onGenerateDrafts || generatingDrafts) return;
    onGenerateDrafts();
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
        {recording && recordingMeta && (
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
                      <span className="ono-start-rec-name">{member?.name ?? ''}</span>
                      {member?.badge && (
                        <span className="ono-start-rec-badge">{member.badge}</span>
                      )}
                    </div>
                    <span className="ono-start-rec-time">{recordingMeta.time}</span>
                  </div>
                </div>
              </div>
              <div className="ono-start-rec-bar">
                <div className="ono-start-rec-timer">
                  <span className="ono-start-rec-elapsed">{recordingMeta.elapsed}</span>
                  <div className="ono-start-rec-wave">
                    {(recordingMeta.wave ?? []).map((h, i) => (
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
          <p className="ono-start-modal-title">{meetingTitle}</p>

          {/* 멤버 */}
          <div className="ono-add-modal-member">
            <div className="ono-add-modal-member-avatar">
              {member?.avatar && <img src={member.avatar} alt="" />}
            </div>
            <div className="ono-add-modal-member-info">
              <div className="ono-add-modal-member-name-row">
                <span className="ono-add-modal-member-name">{member?.name ?? ''}</span>
                {member?.badge && (
                  <span className="ono-add-modal-member-badge">{member.badge}</span>
                )}
              </div>
              {meetingTime && (
                <span className="ono-add-modal-member-role">{meetingTime}</span>
              )}
            </div>
          </div>

          {/* 준비도 — spec §4.1.1
              · 멤버: 멤버 READY view 7섹션 완료율 (외부 prop)
              · 매니저: 매니저 관점 4섹션 확정 비율 (내부 confirmedCount 자동) */}
          {(() => {
            const managerReadyPct = Math.round((confirmedCount / 4) * 100);
            const managerColor =
              managerReadyPct === 100
                ? 'var(--utility-green-600, #16A34A)'
                : managerReadyPct > 0
                  ? 'var(--colors-text-textWarningPrimary, #d97706)'
                  : 'var(--text-tertiary, #888)';
            const memberColor = 'var(--text-brand-primary, #2563EB)';
            const rows = [
              {
                who: member?.name ?? '팀원',
                pct: memberReadyPct,
                color: memberColor,
              },
              {
                who: '나 (매니저)',
                pct: managerReadyPct,
                color: managerColor,
              },
            ];
            return (
              <div className="ono-start-section">
                <span className="ono-start-section-title">준비도</span>
                <div className="ono-start-prep">
                  {rows.map((b) => (
                    <div key={b.who} className="ono-start-prep-row">
                      <div className="ono-start-prep-meta">
                        <span className="ono-start-prep-who">{b.who}</span>
                        <span
                          className="ono-start-prep-pct"
                          style={{ color: b.color }}
                        >
                          {b.pct == null ? '—' : `${b.pct}%`}
                        </span>
                      </div>
                      <ProgressBar pct={b.pct} color={b.color} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

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
            <button
              type="button"
              className="ono-start-cta is-cta"
              onClick={handleGenerate}
              disabled={!onGenerateDrafts || generatingDrafts}
            >
              <Icon src="/icons-solid/ai-chat-01.svg" size={20} color="var(--text-white)" baseUrl={baseUrl} />
              {generatingDrafts ? 'AI 초안 생성 중...' : 'AI 브리핑 및 매니저 관점 초안 전체 생성'}
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
                <button
                  type="button"
                  className="ono-start-briefing-toggle"
                  onClick={handleGenerate}
                  disabled={!onGenerateDrafts || generatingDrafts}
                >
                  {generatingDrafts ? '생성 중...' : '브리핑 생성'}
                </button>
              )}
            </div>

            {briefingOpen && briefing && (
              <>
                <div className="ono-start-briefing-block">
                  <div className="ono-start-briefing-text-box">
                    <p className="ono-start-briefing-text">{briefing.summary}</p>
                  </div>
                  {(briefing.flags ?? []).length > 0 && (
                    <div className="ono-start-briefing-badges">
                      {briefing.flags.map((f) => (
                        <span key={f.label} className={`ono-start-flag ono-start-flag-${f.tone ?? 'warning'}`}>
                          {f.icon && (
                            <Icon src={f.icon} size={12} color="currentColor" baseUrl={baseUrl} />
                          )}
                          {f.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {(briefing.coachingGuide ?? []).length > 0 && (
                  <div className="ono-start-briefing-block">
                    <span className="ono-start-briefing-subtitle">코칭 가이드</span>
                    {briefing.coachingGuide.map((g) => (
                      <div key={g.title} className="ono-start-coaching-card">
                        <p className="ono-start-coaching-title">{g.title}</p>
                        <p className="ono-start-coaching-body">{g.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="ono-start-briefing-block">
              <span className="ono-start-briefing-subtitle">멤버 AI 보고서 · 읽기 전용</span>
              {memberReport ? (
                <div className="ono-start-report">
                  <p className="ono-start-report-text">{memberReport.text}</p>
                  {memberReport.source && (
                    <p className="ono-start-report-source">{memberReport.source}</p>
                  )}
                </div>
              ) : (
                <p className="ono-start-empty-hint">{EMPTY_HINT}</p>
              )}
            </div>

            <div className="ono-start-briefing-block">
              <span className="ono-start-briefing-subtitle">OKR 자가 평가</span>
              {okrSelf.length > 0 ? (
                <div className="ono-start-okr">
                  {okrSelf.map((k) => (
                    <div key={k.kr} className="ono-start-okr-row">
                      <p className="ono-start-okr-kr">{k.kr}</p>
                      <div className="ono-start-okr-bars">
                        <div className="ono-start-okr-bar">
                          <span className="ono-start-okr-bar-label">실제</span>
                          <div className="ono-start-okr-bar-line">
                            <ProgressBar pct={k.actual ?? 0} />
                            <span className="ono-start-okr-bar-pct">{k.actual ?? 0}%</span>
                          </div>
                        </div>
                        {k.self != null && (
                          <div className="ono-start-okr-bar">
                            <span className="ono-start-okr-bar-label">자가 평가</span>
                            <div className="ono-start-okr-bar-line">
                              <ProgressBar pct={k.self} />
                              <span className="ono-start-okr-bar-pct">{k.self}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {k.alert && (
                        <p className="ono-start-okr-alert">
                          <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textErrorPrimary, #d92d20)" baseUrl={baseUrl} />
                          {k.alert}
                        </p>
                      )}
                    </div>
                  ))}
                  {upwardFeedback && (
                    <div className="ono-start-upward">
                      <span className="ono-start-upward-label">Upward Feedback</span>
                      <p className="ono-start-upward-text">{upwardFeedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="ono-start-empty-hint">{EMPTY_HINT}</p>
              )}
            </div>
          </div>

          {/* 매니저 관점 */}
          <div className="ono-start-section">
            <span className="ono-start-section-title">
              매니저 관점{briefingExpanded ? ' (DONE 전까지 멤버 비공개)' : ''}
            </span>
            <div className="ono-start-mgr">
              {MGR_SECTIONS.map((sec) => {
                if (sec.kind === 'caps' && capabilities.length === 0) return null;
                return (
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
                          <button
                            type="button"
                            className="ono-start-ai-draft-btn"
                            onClick={handleGenerate}
                            disabled={!onGenerateDrafts || generatingDrafts}
                          >
                            <Icon src="/icons-solid/ai-chat-01.svg" size={14} color="currentColor" baseUrl={baseUrl} />
                            <span>{generatingDrafts ? '생성 중' : 'AI 초안'}</span>
                          </button>
                        ) : confirmed[sec.key] ? (
                          <button type="button" className="ono-start-edit-btn" onClick={() => toggleConfirm(sec.key)}>수정</button>
                        ) : (
                          <>
                            <button type="button" className="ono-start-regen-btn" onClick={handleGenerate}>재생성</button>
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
                          {capabilities.map((c) => (
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
                );
              })}
            </div>
          </div>

          {/* 아젠다 & 액션아이템 — 매니저 모드 전용 뷰. 멤버 제안·예상 액션은
              읽기 전용이며, 매니저는 "매니저 추가 아젠다"만 추가/삭제할 수 있다. */}
          <div className="ono-start-section">
            <span className="ono-start-section-title">아젠다 &amp; 액션아이템</span>
            <div className="ono-start-mgr">
              {/* 멤버 제안 아젠다 — 읽기 전용 */}
              <div className="ono-start-field">
                <span className="ono-start-field-label">멤버 제안 아젠다</span>
                {memberAgendas.length > 0 ? (
                  <div className="ono-start-agenda-list">
                    {memberAgendas.map((a) => (
                      <div key={a} className="ono-start-agenda-item">
                        <span className="ono-start-agenda-role is-member">멤버</span>
                        <span className="ono-start-agenda-text">{a}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ono-start-empty-hint">{EMPTY_HINT}</p>
                )}
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
                {expectedActions.length > 0 ? (
                  <div className="ono-start-agenda-list">
                    {expectedActions.map((a) => (
                      <div key={a.text} className="ono-start-action-item">
                        <span className="ono-start-action-text">• {a.text}</span>
                        <span className="ono-start-action-meta">
                          {a.owner && (
                            <span className="ono-start-action-owner">{a.owner}</span>
                          )}
                          {a.due && (
                            <span className="ono-start-action-badge">{a.due}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ono-start-empty-hint">{EMPTY_HINT}</p>
                )}
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

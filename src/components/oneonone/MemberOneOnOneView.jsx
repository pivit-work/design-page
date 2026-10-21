import { useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import Select from '../shared/Select.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { CloseGlyph } from '../shared/lineIcons.jsx';
import { RatingBar } from './StartOneOnOneView.jsx';
import MemberAiButton from './MemberAiButton.jsx';
import MemberField from './MemberField.jsx';
import MemberReportCard from './MemberReportCard.jsx';

/**
 * 「내 원온원」 — 내가 1on1 **대상자(guest · 팀원)** 일 때 보는 준비 화면.
 *
 * Figma 17416:27949(작성 중 · 준비도 1/4) · 17556:23830(준비 완료 · 매니저가 녹음 중 · 4/4).
 * 매니저 진행 준비 화면(`StartOneOnOneView`)과 같은 카드·같은 토큰을 쓰고, 멤버에게만 있는 조각
 * (준비 완료 띠 · 녹음 고지 · 사유/코멘트 · 자가 평가 슬라이더 · 아젠다 추가)만 `.ono-my-*` 로 더했다.
 *
 * ## 멤버가 할 수 있는 것 — policy `screen-oneonone-session.policy.md`
 *  - READY 에서 적고, 「준비 완료 → 매니저에게 알림」 으로 매니저에게 보낸다(§2.2 · §4.2.12). 그 뒤는 읽기 전용.
 *  - 녹음의 시작·일시정지·종료는 **매니저만** 한다(§11.1). 이 화면은 녹음 상태를 보여 주는 위젯(`widget`)과
 *    「녹음 시작과 종료는 매니저 화면에서 진행됩니다」 고지(`notice`)만 그린다(§5.3). 종료 버튼은 받지 않는다.
 *  - AI 는 눌러야만 돈다(§7.3). 「AI 보고서 생성」·사유/코멘트 「AI 생성」·아젠다 「AI 제안」 이 그 자리다.
 *  - AI 대화 내비게이터·발화 비율·헬스 지표는 매니저 코칭 지표라 멤버 화면에 **없다**(§5.3 · §10.7.2).
 *
 * ## 호스트가 소유하는 것
 *  - `readiness` — 네 항목(팀원이 적은 주제 · 이전 액션아이템 · AI 브리핑 요약 · OKR 현황 · §4.2.3)을 세어
 *    `{ done, total }` 로 넘긴다. 이 컴포넌트는 세지 않는다.
 *  - `statusOptions` — 이전 액션아이템 상태 선택지. 시안(17416:28657)은 완료·진행 중·미완료 셋이고,
 *    policy §4.2.4 는 `done` 불리언이라 둘(완료·미완료)이다 — 어느 쪽을 쓸지는 데이터를 아는 호스트가 정한다.
 *  - 날짜·기간·경과 시계는 완성된 글자로 받는다. 라벨은 `labels` 로 덮어쓴다.
 *
 * ## 입력 상태
 *  작성 중(`phase === 'prep'`)의 글·점수·주제는 이 컴포넌트가 들고 있고(초기값은 props), 바뀔 때마다
 *  `onChange(section, next)` 로 알린다. 「저장」은 `onSave(draft)`, 「준비 완료」는 `onReady(draft)` 다.
 *  phase 가 바뀌면 소비처가 `key` 로 다시 세운다 — 제출 뒤 화면은 props 가 곧 값이다.
 */
export const DEFAULT_LABELS = {
  aiFailTimeout: "생성이 30초를 넘겨 중단됐습니다. 잠시 후 다시 시도해 주세요.",
  aiFailModel: "AI 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.",
  aiFailQuota: "AI 사용 한도를 모두 썼습니다. 워크스페이스 관리자에게 문의해 주세요.",
  aiFailExhausted: "여러 번 시도했지만 생성하지 못했습니다. 직접 입력해 주세요.",
  aiFailManual: "직접 입력해도 됩니다 — AI 없이 저장·제출할 수 있습니다.",
  aiRetry: "다시 시도",
  actionIncomplete: "미완료",
  readyTitle: '준비완료',
  readyText: '작성한 내용이 매니저에게 공유되었습니다. 미팅 중 내용을 참고하세요.',
  readiness: '내 준비도',
  readinessUnit: '섹션',
  readinessDoneNote: '✓ 모든 항목이 작성·확정되어 매니저에게 공유되었습니다.',
  ctaReport: 'AI 보고서 생성 - Daily Snippet, 회의록, 피드백 기반',
  ctaReportBusy: 'AI 보고서를 만드는 중…',
  prevActions: '이전 액션아이템 점검',
  autoLoaded: '시스템 자동 로드',
  reasonComment: '사유/코멘트',
  commentPlaceholder: 'AI 초안 생성 또는 직접 입력',
  aiGenerate: '생성',
  aiSuggest: '제안',
  manual: '직접 입력',
  aiGenerated: 'AI 생성됨',
  fullContext: '전체 컨텍스트',
  reportTitle: 'AI 보고서 - 업무 OKR 블로커 통합',
  summaryTitle: '이 기간 업무 요약',
  wins: '잘 된 것',
  hard: '어려웠던 것',
  focus: '현재 포커스',
  needsTitle: '앞으로 필요한 것',
  blockers: '현재 블로커 / 장애물',
  support: '매니저에게 필요한 지원',
  resources: '필요한 리소스 / 권한',
  okrTitle: 'OKR 자가 평가',
  okrActual: '실제',
  okrActualLinked: '실제 (OKR 시스템 연동)',
  okrSelf: '자가 평가',
  comment: '코멘트',
  upward: 'Upward Feedback',
  growthTitle: '성장 & 커리어 목표',
  skills: '개발하고 싶은 역량',
  projects: '도전해보고 싶은 프로젝트 / 기획',
  career: '중장기 커리어 방향 (선택)',
  capsTitle: '역량 자기진단',
  capsAux: '직접 선택',
  capsDone: '작성됨',
  freeComment: '자유 코멘트',
  recognitionTitle: 'Recognition & 양방향 피드백',
  myWins: '이번 기간 내가 잘한 것',
  upwardTitle: '매니저에게 피드백 (Upward Feedback)',
  peers: '동료에게 전하고 싶은 것 (선택)',
  agendaTitle: '아젠다 & 액션아이템',
  topics: '논의하고 싶은 주제',
  topicPlaceholder: '논의 주제 추가 (Enter)',
  actionsTitle: '확정된 액션아이템',
  actionPlaceholder: '액션 아이템 추가',
  add: '추가',
  remove: '삭제',
  save: '저장',
  ready: '준비 완료 → 매니저에게 알림',
  saving: '저장 중…',
  saved: '저장됨',
  saveFailed: '저장하지 못했습니다. 입력한 내용은 그대로 남아 있습니다.',
  readyFailed: '준비 완료를 보내지 못했습니다. 입력한 내용은 그대로 남아 있습니다.',
  status: '상태',
  myActionOwner: '나',
  capabilityPoint: '{n}점',
};


export default function MemberOneOnOneView({
  phase = 'prep',
  meetingTitle,
  meetingTime,
  manager,
  notice = null,
  readiness = { done: 0, total: 4 },
  prevSession,
  statusOptions = [],
  report,
  reportBusy = false,
  onGenerateReport,
  okr = [],
  upwardFeedbackPrev,
  growth = {},
  capabilities = [],
  recognition = {},
  agenda = { topics: [], actions: [] },
  onGenerateComment,
  suggestionStates = {},
  onSuggestTopics,
  onChange,
  onSave,
  onReady,
  readyDisabled = false,
  showReadyNotice = true,
  footerNotice = null,
  reportEditor = null,
  widget = null,
  labels: providedLabels,
  baseUrl = '',
}) {
  const L = { ...DEFAULT_LABELS, ...(providedLabels ?? {}) };
  const editable = phase === 'prep';
  const saveLock = useRef(false);
  const editRevision = useRef(0);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState(null);
  const submit = async (ready) => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setSaveState(null);
    const submittedRevision = editRevision.current;
    try {
      await (ready ? onReady?.(draft()) : onSave?.(draft()));
      setSaveState(editRevision.current === submittedRevision ? 'saved' : null);
    } catch {
      setSaveState(ready ? 'readyFailed' : 'saveFailed');
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  /* ── 작성 중 입력 상태 — 초기값은 props, 제출 뒤에는 props 가 곧 값 ── */
  const [actions, setActions] = useState(() => prevSession?.actions ?? []);
  const [selfEval, setSelfEval] = useState(() => okr.map((k) => k.self ?? 0));
  const [growthDraft, setGrowthDraft] = useState(() => mapValues(growth));
  const [caps, setCaps] = useState(() => capabilities.map((c) => c.value ?? 0));
  const [recogDraft, setRecogDraft] = useState(() => mapValues(recognition));
  const [topics, setTopics] = useState(() => agenda.topics ?? []);
  const [topicInput, setTopicInput] = useState('');
  const [actionItems, setActionItems] = useState(() => agenda.actions ?? []);
  const [actionInput, setActionInput] = useState('');

  const draft = () => ({
    prevActions: actions,
    okrSelf: selfEval,
    growth: growthDraft,
    capabilities: capabilities.map((c, i) => ({ key: c.key, value: caps[i] })),
    recognition: recogDraft,
    topics,
    actions: actionItems,
  });
  const notify = (section, next) => {
    editRevision.current += 1;
    setSaveState(null);
    onChange?.(section, next, { ...draft(), [section]: next });
  };

  const okrRows = okr.map((k, i) => ({ ...k, self: editable ? selfEval[i] : k.self }));
  const actionRows = editable ? actions : prevSession?.actions ?? [];
  const topicRows = editable ? topics : agenda.topics ?? [];
  const actionItemRows = editable ? actionItems : agenda.actions ?? [];
  const field = (key, src) => (editable ? { ...src[key], value: growthDraft[key] ?? '' } : src[key] ?? {});

  const updateAction = (id, patch) => {
    setActions((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      notify('prevActions', next);
      return next;
    });
  };
  const addTopic = () => {
    const text = topicInput.trim();
    if (!text) return;
    setTopics((prev) => {
      const next = [...prev, { id: `topic-${Date.now()}`, text }];
      notify('topics', next);
      return next;
    });
    setTopicInput('');
  };
  const removeTopic = (id) => {
    setTopics((prev) => {
      const next = prev.filter((t) => t.id !== id);
      notify('topics', next);
      return next;
    });
  };
  const addActionItem = () => {
    const text = actionInput.trim();
    if (!text) return;
    setActionItems((prev) => {
      const next = [...prev, { id: `action-${Date.now()}`, text, owner: L.myActionOwner }];
      notify('actions', next);
      return next;
    });
    setActionInput('');
  };
  const onEnter = (fn) => (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      fn();
    }
  };

  const pct = readiness.total ? Math.round(((readiness.done ?? 0) / readiness.total) * 100) : 0;
  const allDone = readiness.total > 0 && readiness.done >= readiness.total;
  const suggestionBlocked = (key) => suggestionStates[key]?.busy || suggestionStates[key]?.failure?.reason === 'quota_exceeded' || suggestionStates[key]?.failure?.retryLeft === 0;
  const suggestionFailure = (key, retry) => {
    const failure = suggestionStates[key]?.failure;
    if (!failure || suggestionStates[key]?.busy) return null;
    const exhausted = failure.reason !== 'quota_exceeded' && failure.retryLeft === 0;
    const message = exhausted ? L.aiFailExhausted : failure.reason === 'quota_exceeded' ? L.aiFailQuota : failure.reason === 'timeout' ? L.aiFailTimeout : L.aiFailModel;
    return <div className="ono-start-failbox" role="alert" data-testid={`ono-my-suggestion-error-${key}`}>
      <span className="ono-start-failbox-title">{message}</span>
      <p className="ono-start-failbox-msg">{L.aiFailManual}</p>
      <div className="ono-start-failbox-actions"><button type="button" className="ono-start-failbox-retry" onClick={retry} disabled={suggestionBlocked(key)}>{L.aiRetry}</button></div>
    </div>;
  };

  const growthSrc = editable ? { ...growth } : growth;
  const recogSrc = recognition;

  return (
    <div className="ono-my-view" data-testid="ono-my-view" data-phase={phase}>
      {/* 녹음 상태 위젯 — 카드 오른쪽 위에 겹쳐 뜨고(Figma 17556:25155 · x 895 / y 12) 스크롤해도 위에 붙어
          있다. 매니저 화면의 오른쪽 기둥과 달리 본문 폭을 나누지 않는다 — 기둥에 세울 네비게이터가 없다. */}
      {widget}
      {notice && (
        <p className="ono-my-notice" role="status">
          {notice}
        </p>
      )}
      <div className="ono-start-view">
        <div className="ono-start-view-card">
          <div className="ono-start-view-body">
            {/* 머리 — 회차 제목 · 매니저 */}
            <div className="ono-start-section">
              <p className="ono-start-modal-title">{meetingTitle}</p>
              <div className="ono-add-modal-member">
                <div className="ono-add-modal-member-avatar">{manager?.avatar && <img src={manager.avatar} alt="" />}</div>
                <div className="ono-add-modal-member-info">
                  <div className="ono-add-modal-member-name-row">
                    <span className="ono-add-modal-member-name">{manager?.name ?? ''}</span>
                    {manager?.badge && <StatusBadge className="ono-add-modal-member-badge">{manager.badge}</StatusBadge>}
                  </div>
                  {meetingTime && <span className="ono-add-modal-member-role">{meetingTime}</span>}
                </div>
              </div>
            </div>

            {/* 준비 완료 띠 (Figma 17556:23843) — 제출 뒤에만 */}
            {!editable && showReadyNotice && (
              <div className="ono-my-ready-banner" role="status" data-testid="ono-my-ready-banner">
                <Icon src="/icons-solid/check.svg" size={18} color="var(--text-brand-secondary)" baseUrl={baseUrl} />
                <span className="ono-my-ready-banner-title">{L.readyTitle}</span>
                <span>{L.readyText}</span>
              </div>
            )}

            {/* 내 준비도 (Figma 17416:27962 · 17556:24396) */}
            <div className="ono-start-section" data-testid="ono-my-readiness">
              <div className="ono-my-head">
                <h3 className="ono-my-h3">{L.readiness}</h3>
                <span className={`ono-my-readiness-count${allDone ? ' is-done' : ''}`}>
                  {readiness.done} / {readiness.total} {L.readinessUnit}
                </span>
              </div>
              <div className="ono-my-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={L.readiness}>
                <div className={`ono-my-fill${allDone ? ' is-done' : ''}`} style={{ width: `${pct}%` }} />
              </div>
              {allDone && <p className="ono-my-readiness-note">{L.readinessDoneNote}</p>}
            </div>

            {/* AI 보고서 생성 — 작성 중 · 아직 없을 때 (Figma 17416:27976) */}
            {editable && !reportEditor && !report?.generated && (
              <button type="button" className="ono-start-cta is-cta" onClick={onGenerateReport} disabled={reportBusy} data-testid="ono-my-cta-report">
                <Icon src="/icons-solid/ai-chat-01.svg" size={20} color="var(--text-white)" baseUrl={baseUrl} />
                {reportBusy ? L.ctaReportBusy : L.ctaReport}
              </button>
            )}

            {/* 이전 액션아이템 점검 (Figma 17416:28473) */}
            <div className="ono-start-section" data-testid="ono-my-prev-actions">
              <div className="ono-my-section-head">
                <span className="ono-start-section-title">{L.prevActions}</span>
                <span className="ono-my-section-aux">{L.autoLoaded}</span>
              </div>
              <div className="ono-start-mgr">
                {actionRows.map((a, i) => {
                  const open = a.status !== 'done';
                  const statusLabel = statusOptions.find((o) => o.value === a.status)?.label ?? a.status;
                  return (
                    <div key={a.id ?? i} className="ono-start-field">
                      {i === 0 && prevSession?.dateLabel && <h3 className="ono-my-h3">{prevSession.dateLabel}</h3>}
                      <div className="ono-my-action-row">
                        <p className="ono-my-action-title">{a.title}</p>
                        <div className="ono-my-action-meta">
                          <span className="ono-my-action-due">
                            {a.owner} · {a.due}
                          </span>
                          {editable && a.editable !== false && statusOptions.length > 0 ? (
                            <Select
                              className="ono-my-state-select"
                              value={a.status}
                              options={statusOptions}
                              onChange={(e) => updateAction(a.id, { status: e.target.value })}
                              aria-label={`${a.title} ${L.status}`}
                            />
                          ) : (
                            <span className="ono-my-state-select is-static">{statusLabel}</span>
                          )}
                        </div>
                      </div>
                      {open && (
                        <div className="ono-my-comment">
                          <div className="ono-my-field-head">
                            <div className="ono-my-field-label-row">
                              <span className="ono-my-label-sm">{L.reasonComment}</span>
                              {editable && !a.commentAi
                                ? (prevSession?.sources ?? []).map((s) => (
                                    <StatusBadge key={s} className="ono-start-source-badge">{s}</StatusBadge>
                                  ))
                                : a.commentAi && <StatusBadge tone="ai" className="ono-done-badge">{L.aiGenerated}</StatusBadge>}
                            </div>
                            {editable && a.editable !== false && onGenerateComment && (
                              <MemberAiButton
                                label={L.aiGenerate}
                                disabled={suggestionBlocked(`comment:${a.id}`)}
                                baseUrl={baseUrl}
                                ariaLabel={`${a.title} ${L.reasonComment} AI ${L.aiGenerate}`}
                                onClick={() => onGenerateComment?.(a.id, (text) => updateAction(a.id, { comment: text, commentAi: true }))}
                              />
                            )}
                          </div>
                          {editable && a.editable !== false ? (
                            <textarea
                              className={`ono-my-textarea${a.commentAi ? ' is-ai' : ''}`}
                              value={a.comment ?? ''}
                              placeholder={L.commentPlaceholder}
                              onChange={(e) => updateAction(a.id, { comment: e.target.value, commentAi: false })}
                              aria-label={`${a.title} ${L.reasonComment}`}
                            />
                          ) : (
                            <p className={`ono-my-readbox${a.commentAi ? ' is-ai' : ''}${a.comment ? '' : ' is-empty'}`}>
                              {a.comment || L.commentPlaceholder}
                            </p>
                          )}
                          {suggestionFailure(`comment:${a.id}`, () => onGenerateComment?.(a.id, (text) => updateAction(a.id, { comment: text, commentAi: true })))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI 보고서 · OKR 자가 평가 */}
            <MemberReportCard
              phase={phase}
              reportContent={reportEditor}
              report={report}
              okr={okrRows}
              onSelfChange={(i, v) => {
                setSelfEval((prev) => {
                  const next = prev.map((x, j) => (j === i ? v : x));
                  notify('okrSelf', next);
                  return next;
                });
              }}
              upwardFeedbackPrev={upwardFeedbackPrev}
              L={L}
              baseUrl={baseUrl}
            />

            {/* 성장 & 커리어 목표 (Figma 17416:28032) */}
            <div className="ono-start-section" data-testid="ono-my-growth">
              <span className="ono-start-section-title">{L.growthTitle}</span>
              <div className="ono-start-mgr">
                {['skills', 'projects', 'career'].map((key) => {
                  const f = field(key, growthSrc);
                  return (
                    <MemberField
                      key={key}
                      title={L[key]}
                      badge={f.ai ? 'ai' : 'manual'}
                      badgeLabels={L}
                      editable={editable}
                      ai={!!f.ai}
                      value={f.value ?? ''}
                      placeholder={f.placeholder ?? ''}
                      onChange={(v) => {
                        setGrowthDraft((prev) => {
                          const next = { ...prev, [key]: v };
                          notify('growth', next);
                          return next;
                        });
                      }}
                      testId={`ono-my-growth-${key}`}
                    />
                  );
                })}
                <MemberField
                  title={L.capsTitle}
                  badgeLabels={L}
                  aux={
                    editable ? (
                      <span className="ono-my-field-aux">{L.capsAux}</span>
                    ) : (
                      <span className="ono-my-field-done">
                        <Icon src="/icons-solid/check.svg" size={14} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
                        {L.capsDone}
                      </span>
                    )
                  }
                >
                  <div className="ono-start-caps ono-my-caps" data-testid="ono-my-caps">
                    {capabilities.map((c, i) => (
                      <div key={c.key} className="ono-start-cap-row">
                        <span className="ono-start-cap-label">{c.label}</span>
                        <RatingBar
                          value={editable ? caps[i] : c.value ?? 0}
                          labelOf={(n) => L.capabilityPoint.replace('{n}', String(n))}
                          onChange={
                            editable
                              ? (n) => {
                                  setCaps((prev) => {
                                    const next = prev.map((x, j) => (j === i ? n : x));
                                    notify('capabilities', next);
                                    return next;
                                  });
                                }
                              : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                </MemberField>
                <MemberField
                  title={L.freeComment}
                  size="sm"
                  badge="manual"
                  badgeLabels={L}
                  editable={editable}
                  value={editable ? growthDraft.comment ?? '' : growth.comment?.value ?? ''}
                  placeholder={growth.comment?.placeholder ?? ''}
                  onChange={(v) => {
                    setGrowthDraft((prev) => {
                      const next = { ...prev, comment: v };
                      notify('growth', next);
                      return next;
                    });
                  }}
                  testId="ono-my-growth-comment"
                />
              </div>
            </div>

            {/* Recognition & 양방향 피드백 (Figma 17556:24952 · 24663) */}
            <div className="ono-start-section" data-testid="ono-my-recognition">
              <span className="ono-start-section-title">{L.recognitionTitle}</span>
              <div className="ono-start-mgr">
                {recogSrc.wins && (
                  <MemberField title={L.myWins} badge="ai" badgeLabels={L} ai value={recogSrc.wins.value ?? ''} testId="ono-my-recog-wins" />
                )}
                {['upward', 'peers'].map((key) => {
                  const f = recogSrc[key] ?? {};
                  return (
                    <MemberField
                      key={key}
                      title={key === 'upward' ? L.upwardTitle : L.peers}
                      badge="manual"
                      badgeLabels={L}
                      editable={editable}
                      value={editable ? recogDraft[key] ?? '' : f.value ?? ''}
                      placeholder={f.placeholder ?? ''}
                      onChange={(v) => {
                        setRecogDraft((prev) => {
                          const next = { ...prev, [key]: v };
                          notify('recognition', next);
                          return next;
                        });
                      }}
                      testId={`ono-my-recog-${key}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* 아젠다 & 액션아이템 (Figma 17416:28166 · 17556:24050) */}
            <div className="ono-start-section" data-testid="ono-my-agenda">
              <span className="ono-start-section-title">{L.agendaTitle}</span>
              <div className="ono-start-mgr">
                <MemberField
                  title={L.topics}
                  badge="context"
                  badgeLabels={L}
                  aux={
                    editable && onSuggestTopics ? (
                      <MemberAiButton disabled={suggestionBlocked('agenda')} label={L.aiSuggest} baseUrl={baseUrl} onClick={() => onSuggestTopics?.((items) => {
                        setTopics((prev) => {
                          const next = [...prev, ...items.filter((t) => !prev.some((p) => p.id === t.id))];
                          notify('topics', next);
                          return next;
                        });
                      })} />
                    ) : agenda.topicsAi ? (
                      <StatusBadge tone="ai" className="ono-done-badge">{L.aiGenerated}</StatusBadge>
                    ) : null
                  }
                >
                  <div className="ono-start-agenda-list">
                    {topicRows.map((t) => (
                      <div key={t.id ?? t.text} className="ono-start-agenda-item ono-my-topic">
                        <span className="ono-start-agenda-text">{t.text}</span>
                        {editable && (
                          <button type="button" className="ono-start-agenda-x" aria-label={`${t.text} ${L.remove}`} onClick={() => removeTopic(t.id)}>
                            <CloseGlyph size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                    {editable && (
                      <div className="ono-start-agenda-add">
                        <input
                          value={topicInput}
                          placeholder={L.topicPlaceholder}
                          onChange={(e) => setTopicInput(e.target.value)}
                          onKeyDown={onEnter(addTopic)}
                          aria-label={L.topics}
                        />
                        <button type="button" className="ono-start-agenda-add-btn" onClick={addTopic}>{L.add}</button>
                      </div>
                    )}
                  </div>
                  {suggestionFailure('agenda', () => onSuggestTopics?.((items) => {
                    setTopics((prev) => {
                      const next = [...prev, ...items.filter((t) => !prev.some((p) => p.id === t.id))];
                      notify('topics', next);
                      return next;
                    });
                  }))}
                </MemberField>
                <MemberField title={L.actionsTitle} badge="manual" badgeLabels={L}>
                  <div className="ono-start-agenda-list">
                    {actionItemRows.map((a) => (
                      <div key={a.id ?? a.text} className="ono-start-action-item">
                        <span className="ono-start-action-text">• {a.text}</span>
                        <span className="ono-start-action-meta">
                          {a.owner && <span className="ono-start-action-owner">{a.owner}</span>}
                          {a.due && <StatusBadge className="ono-start-action-badge">{a.due}</StatusBadge>}
                        </span>
                      </div>
                    ))}
                    {editable && (
                      <div className="ono-start-agenda-add">
                        <input
                          value={actionInput}
                          placeholder={L.actionPlaceholder}
                          onChange={(e) => setActionInput(e.target.value)}
                          onKeyDown={onEnter(addActionItem)}
                          aria-label={L.actionsTitle}
                        />
                        <button type="button" className="ono-start-agenda-add-btn" onClick={addActionItem}>{L.add}</button>
                      </div>
                    )}
                  </div>
                </MemberField>
              </div>
            </div>
          </div>

          {saveState && (
            <p className={saveState === 'saved' ? 'ono-my-readiness-note' : 'ono-done-inline-error'} role={saveState === 'saved' ? 'status' : 'alert'} data-testid="ono-my-save-state">{L[saveState]}</p>
          )}
          {footerNotice}

          {/* 바닥 (Figma 17416:28224) — 작성 중에만. 제출 뒤에는 돌이킬 것이 없다 */}
          {editable && (
            <div className="ono-start-view-footer">
              <button type="button" className="ono-add-modal-btn ono-add-modal-btn-secondary" onClick={() => void submit(false)} disabled={saving || !onSave} data-testid="ono-my-save-btn">
                {saving ? L.saving : L.save}
              </button>
              <button
                type="button"
                className={`ono-add-modal-btn ${readyDisabled ? 'ono-start-footer-disabled' : 'ono-add-modal-btn-primary'}`}
                disabled={readyDisabled || saving || !onReady}
                onClick={() => void submit(true)}
                data-testid="ono-my-ready-btn"
              >
                {L.ready}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function mapValues(obj) {
  return Object.fromEntries(Object.entries(obj ?? {}).map(([k, v]) => [k, v?.value ?? '']));
}

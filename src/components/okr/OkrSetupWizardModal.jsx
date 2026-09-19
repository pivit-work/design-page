import { useEffect, useMemo, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * OkrSetupWizardModal — OKR 설정 마법사 (Backward Looking).
 *
 * 시안 pivit-specs okr-setup-wizard.jsx 를 정본에 포팅.
 * 단계: ① 미래 구술 → ② AI Objective 도출·확인 → ③ AI KR 추출·검토 → ④ 정합성 확인(조직 단위) → 저장.
 * (정책서 v2.1 · PW-734 — 구술에서 Objective 를 먼저 확정하고, 그 문장을 재료로 KR 을 뽑는다.)
 *
 * 🔴 단위는 마법사 안에서 고르지 않는다 — **연 화면이 단위다** (정책서
 * screen-okr-setup-wizard §2A · 시안 okr-app.jsx `ScopeContext`/`BlockedBody`).
 *  - scope      — 진입 단위(고정). 구술 예시·저장 level 에 쓴다.
 *  - scopeCard  — 1단계 「단위 고정」 카드 문구 { label, desc, badge } (§2A.3).
 *  - targets    — 같은 계층 안의 대상 조직 [{ id, name }]. 1개면 이름만, 2개 이상이면 셀렉트.
 *  - blocked    — 쓸 수 없는 진입이면 { title, desc } — 본문 대신 사유 카드 + [닫기] (§2A.4).
 *  - showAlignment — 정합성 단계를 그릴지. 개인 단위·구성원은 3단계다(§2 · §7).
 *
 * AI/저장은 소비자 콜백으로 배선한다 — 전부 고른 대상 조직(targetId)을 함께 받는다:
 *  - onDeriveObjective(scope, narrative, targetId) → Promise<{ objective: { title } }>
 *  - onExtractKrs(scope, narrative, objective, targetId) → Promise<{ keyResults: [{title,type,targetValue,unit}] }>
 *  - onFetchAlignment(scope, targetId) → Promise<{ members, emptyMessage? }>
 *      members[].note — 미정렬 사유 문구(소비자가 번역·조합해 넘긴다. 예: 「상위 OKR 미연결 · 플랫폼팀」)
 *      members[].canBookOneOnOne — false 면 그 사람에게 [1:1 예약] 을 두지 않는다. 조치할 사람이
 *        본인이 아닌 사유(「상위 OKR 미연결」)가 그렇다 (pivit-specs 마법사 정책서 §3-4 · PW-729).
 *      emptyMessage — 판정할 수 없을 때(그 단위에 저장된 KR 이 없음) 사람 목록 대신 보일 문구.
 *  - onSubmit({ level, objective, krs, targetId }) → OKR 생성
 */
const DEFAULT_SCOPE_CARD = {
  individual: { label: '개인 OKR', desc: '내 OKR을 직접 설계', badge: '단위 고정' },
  team: { label: '팀 OKR', desc: '팀 단위 OKR — 팀장 권한', badge: '단위 고정' },
  company: { label: '전사 OKR', desc: '회사 전체 OKR — 어드민', badge: '단위 고정' },
};

const NARRATIVE_PLACEHOLDER = {
  individual: '12월 31일, 나는 피빗 프론트엔드의 메인 컨트리뷰터로 자리잡았고,\n주요 화면 12개의 성능 점수를 90점 이상으로 끌어올렸다.',
  team: '12월 31일, 우리 팀은 고객 …개사·매출 …억을 달성했고, NRR …%를 유지한다.',
  company: '12월 31일, 우리 회사는 ARR …억·고객 …개사를 확보하고 시리즈 A 를 마무리했다.',
};

const NARRATIVE_MAX = 2000;

// 순서는 정책서 v2.1 §1 — 미래 구술 → Objective → KR 추출 (PW-734).
const BASE_STEPS = [
  { key: 'narrative', label: '미래 구술', desc: '12/31 모습' },
  { key: 'objective', label: 'Objective', desc: '한 문장 도출' },
  { key: 'krs', label: 'KR 추출', desc: '측정 결과' },
];
const ALIGNMENT_STEP = { key: 'alignment', label: '정합성 확인', desc: '팀장' };

let seq = 0;
const nextId = () => { seq += 1; return `wz-${seq}`; };

export default function OkrSetupWizardModal({
  icons,
  baseUrl = '',
  onClose,
  scope = 'individual',
  scopeCard,
  targets = [],
  targetId,
  onTargetChange,
  targetLabel = '대상 조직',
  blocked = null,
  closeLabel = '닫기',
  showAlignment = scope !== 'individual',
  onExtractKrs,
  onDeriveObjective,
  onSubmit,
  onFetchAlignment,
  onBookOneOnOne,
  // 비전 이미지 생성 (선택): (scope, narrative) → Promise<{ imageUrl }>.
  // 안 넘기면 버튼은 표시만 되고 placeholder 박스가 유지된다 (데모).
  onGenerateVision,
}) {
  const [step, setStep] = useState(1);
  const card = scopeCard ?? DEFAULT_SCOPE_CARD[scope] ?? DEFAULT_SCOPE_CARD.team;
  const [narrative, setNarrative] = useState('');
  const [krs, setKrs] = useState([]);
  const [krsConfirmed, setKrsConfirmed] = useState(false);
  const [krsLoading, setKrsLoading] = useState(false);
  const [objective, setObjective] = useState('');
  const [objConfirmed, setObjConfirmed] = useState(false);
  const [objLoading, setObjLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [alignment, setAlignment] = useState(null);
  const [visionImage, setVisionImage] = useState(null);
  const [visionLoading, setVisionLoading] = useState(false);

  // 정합성 확인은 조직 단위 전용 — 개인 단위·구성원은 스텝 칩 자체를 그리지 않는다(§2).
  const steps = useMemo(
    () => (showAlignment ? [...BASE_STEPS, ALIGNMENT_STEP] : BASE_STEPS),
    [showAlignment],
  );
  const stepKey = steps[step - 1]?.key;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 정합성 단계 진입 시 팀 정렬도 조회 (동기 setState 회피 — 콜백에서만 갱신).
  useEffect(() => {
    if (stepKey !== 'alignment' || !onFetchAlignment || blocked) return;
    let alive = true;
    onFetchAlignment(scope, targetId)
      .then((res) => { if (alive) setAlignment(res); })
      .catch(() => { if (alive) setError('정합성 조회에 실패했습니다.'); });
    return () => { alive = false; };
  }, [stepKey, scope, targetId, onFetchAlignment, blocked]);

  // 대상 조직을 바꾸면 그 조직 기준으로 다시 확인해야 한다 — 초안은 남기되 미확인으로
  // 되돌리고, 앞 조직의 정렬도는 버린다(정책서 §8 「대상 조직 변경 후」).
  const changeTarget = (id) => {
    setKrsConfirmed(false);
    setObjConfirmed(false);
    setAlignment(null);
    onTargetChange?.(id);
  };
  // 콜백이 없으면(데모) '조회 중' 에 갇히지 않게 빈 목록을 파생값으로 쓴다 —
  // effect 안 동기 setState 는 캐스케이드 렌더라 lint 가 막는다.
  const alignmentView = alignment ?? (!onFetchAlignment ? { members: [] } : null);

  const genKrs = async () => {
    setKrsLoading(true); setError(null);
    try {
      // KR 은 확정 Objective 를 재는 것이다 — 구술과 함께 싣는다(§6 · PW-734).
      const res = await onExtractKrs?.(scope, narrative, objective.trim(), targetId);
      const list = (res?.keyResults ?? []).map((k) => ({
        id: nextId(), title: k.title, type: k.type ?? 'number',
        target: k.targetValue ?? 0, current: 0, unit: k.unit ?? '',
      }));
      setKrs(list); setKrsConfirmed(false);
    } catch {
      setError('KR 추출에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setKrsLoading(false); }
  };

  // Objective 가 바뀌면 미확인으로 되돌린다. 이미 뽑은 KR 은 남기되 옛 Objective 를
  // 기준으로 확인한 것이므로 함께 미확인으로 되돌린다(정책서 §8 · PW-734).
  const changeObjective = (text) => {
    setObjective(text);
    setObjConfirmed(false);
    setKrsConfirmed(false);
  };

  const genObjective = async () => {
    setObjLoading(true); setError(null);
    try {
      // 이 시점엔 KR 이 없다 — 재료는 구술뿐이다(§6 · PW-734).
      const res = await onDeriveObjective?.(scope, narrative, targetId);
      changeObjective(res?.objective?.title ?? '');
    } catch {
      setError('Objective 작성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setObjLoading(false); }
  };

  const patchKr = (id, patch) => { setKrs((p) => p.map((k) => (k.id === id ? { ...k, ...patch } : k))); setKrsConfirmed(false); };
  const removeKr = (id) => { setKrs((p) => p.filter((k) => k.id !== id)); setKrsConfirmed(false); };
  const addKr = () => { setKrs((p) => [...p, { id: nextId(), title: '', type: 'number', target: 0, current: 0, unit: '' }]); setKrsConfirmed(false); };

  const canNext =
    stepKey === 'narrative' ? narrative.trim().length >= 30
      : stepKey === 'krs' ? krs.length > 0 && krs.every((k) => k.title.trim()) && krsConfirmed
        : stepKey === 'objective' ? !!objective.trim() && objConfirmed
          : true;

  const nextHint =
    canNext ? ''
      : stepKey === 'narrative' ? `미래 모습을 ${Math.max(0, 30 - narrative.trim().length)}자 더 입력하세요 (최소 30자)`
        : stepKey === 'objective' ? (!objective.trim() ? 'AI로 Objective 초안을 생성하세요' : 'Objective 초안을 확인(✓)해야 다음으로 진행됩니다')
          : (krs.length === 0 ? 'AI로 KR 초안을 생성하세요' : 'KR 초안을 확인(✓)해야 다음으로 진행됩니다');

  const isLast = step === steps.length;

  const handleNext = async () => {
    if (!canNext) return;
    if (!isLast) { setStep(step + 1); return; }
    setSaving(true); setError(null);
    try {
      await onSubmit?.({
        level: scope,
        targetId,
        objective: objective.trim(),
        krs: krs.map((k) => ({
          title: k.title.trim(), type: k.type,
          target: Number(k.target) || 0, current: Number(k.current) || 0, unit: k.unit,
        })),
      });
      onClose();
    } catch {
      setError('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
      setSaving(false);
    }
  };

  const aiBtn = (label, onClick, loading) => (
    <button className="okr-wz-ai-btn" onClick={onClick} disabled={loading}>
      {loading ? '생성 중…' : `✦ ${label}`}
    </button>
  );

  const genVision = async () => {
    if (!onGenerateVision || visionLoading) return;
    setVisionLoading(true); setError(null);
    try {
      const res = await onGenerateVision(scope, narrative);
      setVisionImage(res?.imageUrl ?? null);
    } catch {
      setError('비전 이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setVisionLoading(false); }
  };

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-wz-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
        <div className="okr-wz-body">
          <h2 className="okr-wz-title">OKR 설정</h2>

          {blocked ? (
            <div className="okr-wz-blocked" role="alert">
              <p className="okr-wz-blocked-title">{blocked.title}</p>
              {blocked.desc && <p className="okr-wz-blocked-desc">{blocked.desc}</p>}
            </div>
          ) : (<>
          <div className="okr-wz-steps">
            {steps.map((s, i) => (
              <div
                className={`okr-wz-step${i + 1 === step ? ' is-active' : ''}`}
                key={s.key}
                onClick={() => setStep(i + 1)}
              >
                <p className="okr-wz-step-label">{s.label}</p>
                <p className="okr-wz-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="okr-wz-stepblock">
                <div className="okr-wz-section">
                  <p className="okr-wz-step-eyebrow">STEP1 - Backward Looking</p>
                  <p className="okr-wz-question">12월 31일, 어떤 모습이 되어 있을까요?</p>
                  <p className="okr-wz-desc">숫자·고객·팀·매출 무엇이든 좋아요. 12월의 자신을 인터뷰한다고 생각하고 과거형으로 적어주세요. 이 문장이 KR 초안과 Objective 요약의 재료가 됩니다.</p>
                </div>
                {/* 단위 고정 카드 — 구 3택 자리. 클릭 대상이 아니다(§2A.3). */}
                <div className="okr-wz-scope-fixed" data-testid="okr-wz-scope-fixed">
                  <div className="okr-wz-scope-fixed-text">
                    <p className="okr-wz-scope-label">
                      {card.label}
                      <span className="okr-wz-scope-badge">{card.badge}</span>
                    </p>
                    <p className="okr-wz-scope-desc">{card.desc}</p>
                  </div>
                  {targets.length > 1 ? (
                    <select
                      className="okr-wz-target-select"
                      value={targetId ?? ''}
                      aria-label={targetLabel}
                      onChange={(e) => changeTarget(e.target.value)}
                    >
                      {targets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  ) : targets.length === 1 ? (
                    <span className="okr-wz-target-name">{targets[0].name}</span>
                  ) : null}
                </div>
                <textarea
                  className="okr-textarea okr-wz-textarea"
                  value={narrative}
                  maxLength={NARRATIVE_MAX}
                  onChange={(e) => setNarrative(e.target.value)}
                  placeholder={NARRATIVE_PLACEHOLDER[scope] ?? NARRATIVE_PLACEHOLDER.team}
                  aria-label="미래 구술"
                />
                <p className="okr-wz-tip">
                  팁: 과거형으로 작성할수록 KR 추출이 더 정확해집니다. ({narrative.length} / {NARRATIVE_MAX}자)
                </p>
              </div>

              <div className="okr-wz-vision">
                <div className="okr-wz-vision-head">
                  <div className="okr-wz-section">
                    <p className="okr-wz-vision-title">비전 이미지 (선택)</p>
                    <p className="okr-wz-desc">구술 내용을 시각화한 비전 이미지를 생성합니다.</p>
                  </div>
                  <button className="okr-wz-ai-btn" onClick={genVision} disabled={visionLoading}>
                    {visionLoading ? '생성 중…' : 'AI 비전 이미지 생성'}
                  </button>
                </div>
                <div className="okr-wz-vision-card">
                  {visionImage ? (
                    <img className="okr-wz-vision-img" src={visionImage} alt="AI 비전 이미지" />
                  ) : (
                    <div className="okr-wz-vision-box" />
                  )}
                </div>
              </div>
            </>
          )}

          {stepKey === 'objective' && (
            <div className="okr-wz-section">
              <div className="okr-wz-head">
                <div>
                  <p className="okr-wz-step-eyebrow">STEP2 - Objective</p>
                  <p className="okr-wz-question">구술을 한 문장 Objective로 정리합니다</p>
                </div>
                {aiBtn(objective ? '다시 작성' : 'AI로 Objective 작성', genObjective, objLoading)}
              </div>
              <div className={`okr-wz-draft${objConfirmed ? ' is-confirmed' : ''}`}>
                <div className="okr-wz-draft-head">
                  <span className="okr-wz-badge">
                    {objConfirmed ? '✓ 확인됨' : objective ? 'AI 초안 (미확인)' : '직접 입력'}
                  </span>
                  {!objConfirmed && objective.trim() && (
                    <button className="okr-btn is-brand is-sm" onClick={() => setObjConfirmed(true)}>확인</button>
                  )}
                </div>
                <textarea
                  className="okr-textarea"
                  value={objective}
                  rows={2}
                  aria-label="Objective"
                  placeholder="Objective 를 직접 입력하거나 위 버튼으로 AI 생성하세요."
                  onChange={(e) => changeObjective(e.target.value)}
                />
              </div>
              {/* 근거가 된 미래 구술 — 이 문장에서 Objective 를 뽑았다는 근거(§3-2 · PW-734). */}
              <div className="okr-wz-source" data-testid="okr-wz-narrative-source">
                <p className="okr-wz-source-title">근거가 된 미래 구술</p>
                <p className="okr-wz-source-body">{narrative.trim() || '(구술 미입력)'}</p>
              </div>
            </div>
          )}

          {stepKey === 'krs' && (
            <div className="okr-wz-section">
              <div className="okr-wz-head">
                <div>
                  <p className="okr-wz-step-eyebrow">STEP3 - Key Results</p>
                  <p className="okr-wz-question">Objective를 무엇으로 측정할지 정합니다</p>
                </div>
                {aiBtn(krs.length ? 'AI로 다시 추출' : 'AI로 KR 추출', genKrs, krsLoading)}
              </div>
              {/* 확정 Objective — KR 이 무엇을 재는지 늘 보이게 둔다(§3-3 · PW-734). */}
              <div className="okr-wz-objective-banner" data-testid="okr-wz-objective-banner">
                <span className="okr-wz-objective-banner-tag">OBJECTIVE</span>
                <span className="okr-wz-objective-banner-text">{objective.trim() || '(Objective 미확정)'}</span>
              </div>
              {krs.length === 0 && !krsLoading && (
                <div className="okr-wz-empty">
                  <p>위 버튼을 눌러 AI 추천 KR 을 받아보세요. Objective 가 구체적일수록 더 정확한 KR 이 추출됩니다.</p>
                  <button className="okr-wz-addkr" onClick={addKr}>+ KR 직접 추가</button>
                </div>
              )}
              {krs.length > 0 && (
                <div className={`okr-wz-draft${krsConfirmed ? ' is-confirmed' : ''}`}>
                  <div className="okr-wz-draft-head">
                    <span className="okr-wz-badge">{krsConfirmed ? '✓ 확인됨' : `AI 초안 (미확인) · ${krs.length}개`}</span>
                    {!krsConfirmed && (
                      <button className="okr-btn is-brand is-sm" onClick={() => setKrsConfirmed(true)}>전체 확인</button>
                    )}
                  </div>
                  {krs.map((k, i) => (
                    <div className="okr-wz-krrow" key={k.id}>
                      <span className="okr-wz-krno">{i + 1}</span>
                      <input className="okr-wz-krcell" value={k.title} placeholder="지표명" aria-label="KR 지표명"
                        onChange={(e) => patchKr(k.id, { title: e.target.value })} />
                      <input className="okr-wz-krcell is-num" type="number" value={k.current} placeholder="현재" aria-label="현재값"
                        onChange={(e) => patchKr(k.id, { current: e.target.value })} />
                      <input className="okr-wz-krcell is-num" type="number" value={k.target} placeholder="목표" aria-label="목표값"
                        onChange={(e) => patchKr(k.id, { target: e.target.value })} />
                      <input className="okr-wz-krcell is-unit" value={k.unit} placeholder="단위" aria-label="단위"
                        onChange={(e) => patchKr(k.id, { unit: e.target.value })} />
                      <button className="okr-cf-x" onClick={() => removeKr(k.id)} aria-label="KR 삭제">
                        <Icon src={icons.xClose} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                      </button>
                    </div>
                  ))}
                  <button className="okr-wz-addkr" onClick={addKr}>+ KR 직접 추가</button>
                </div>
              )}
            </div>
          )}

          {stepKey === 'alignment' && (
            <div className="okr-wz-section">
              <p className="okr-wz-step-eyebrow">STEP4 - Alignment</p>
              <p className="okr-wz-question">팀원들의 OKR 정렬도를 확인합니다</p>
              <p className="okr-wz-desc">미정렬 팀원에게는 1:1을 예약할 수 있습니다. (정렬 = 팀 OKR 을 상위로 연결한 개인 OKR)</p>
              {!alignmentView && !error && <p className="okr-wz-empty">정합성 조회 중…</p>}
              {alignmentView && (
                <div className="okr-wz-align">
                  {alignmentView.emptyMessage ? (
                    <p className="okr-wz-empty">{alignmentView.emptyMessage}</p>
                  ) : alignmentView.members.length === 0 && (
                    <p className="okr-wz-empty">팀원이 없습니다.</p>
                  )}
                  {!alignmentView.emptyMessage && alignmentView.members.map((m) => (
                    <div className={`okr-wz-align-row${m.aligned ? '' : ' is-warn'}`} key={m.userId}>
                      <div className="okr-wz-align-info">
                        <span className="okr-wz-align-name">{m.name}<span className="okr-wz-align-role"> · {m.role}</span></span>
                        <span className="okr-wz-align-note">{m.aligned ? '정합성 정상' : m.note}</span>
                      </div>
                      <span className={`okr-wz-align-status${m.aligned ? ' is-ok' : ''}`}>{m.aligned ? '정렬됨' : '미정렬'}</span>
                      {!m.aligned && m.canBookOneOnOne !== false && onBookOneOnOne && (
                        <button className="okr-btn is-brand is-sm" onClick={() => onBookOneOnOne(m.userId)}>1:1 예약</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="okr-wz-error" role="alert">{error}</p>}
          </>)}
        </div>

        <div className="okr-modal-footer okr-wz-footer">
          {blocked ? (
            <>
              <span className="okr-wz-footer-hint" />
              <button className="okr-btn is-outline" onClick={onClose}>{closeLabel}</button>
            </>
          ) : (
            <>
              <span className="okr-wz-footer-hint">
                {nextHint || `STEP ${step} / ${steps.length}`}
              </span>
              {step > 1 && (
                <button className="okr-btn is-outline is-sm" onClick={() => setStep(step - 1)}>이전</button>
              )}
              <button className="okr-btn is-brand" disabled={!canNext || saving} onClick={handleNext}>
                {saving ? '저장 중…' : isLast ? 'OKR 확정 저장' : '다음'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

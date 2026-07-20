import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * OkrSetupWizardModal — OKR 설정 마법사 (Backward Looking).
 *
 * 시안 pivit-specs okr-setup-wizard.jsx 를 정본에 포팅.
 * 3단계: ① 미래 구술 → ② AI KR 추출·검토 → ③ AI Objective 역도출 → 저장.
 * (시안 STEP4 정합성 확인은 팀원 정렬 데이터·1on1 연동 필요 → 후속.)
 *
 * AI/저장은 소비자 콜백으로 배선한다:
 *  - onExtractKrs(scope, narrative) → Promise<{ keyResults: [{title,type,targetValue,unit}] }>
 *  - onDeriveObjective(scope, krs) → Promise<{ objective: { title } }>
 *  - onSubmit({ level, objective, krs }) → OKR 생성
 */
const DEFAULT_SCOPES = [
  { key: 'individual', label: '개인', desc: '내 OKR을 직접 설계' },
  { key: 'team', label: '팀', desc: '팀 단위 OKR — 팀장 권한' },
  { key: 'company', label: '전사', desc: '회사 전체 OKR — 어드민' },
];

const NARRATIVE_PLACEHOLDER = {
  individual: '12월 31일, 나는 … 을 이뤘고, 주요 지표를 … 까지 끌어올렸다.',
  team: '12월 31일, 우리 팀은 고객 …개사·매출 …억을 달성했고, NRR …%를 유지한다.',
  company: '12월 31일, 우리 회사는 ARR …억·고객 …개사를 확보하고 시리즈 A 를 마무리했다.',
};

const STEPS = [
  { key: 'narrative', label: '미래 구술', desc: '12/31 모습' },
  { key: 'krs', label: 'KR 추출', desc: '측정 결과' },
  { key: 'objective', label: 'Objective', desc: '한 문장 도출' },
];

let seq = 0;
const nextId = () => { seq += 1; return `wz-${seq}`; };

export default function OkrSetupWizardModal({
  icons,
  baseUrl = '',
  onClose,
  scopeOptions = DEFAULT_SCOPES,
  onExtractKrs,
  onDeriveObjective,
  onSubmit,
}) {
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState(scopeOptions[0]?.key ?? 'individual');
  const [narrative, setNarrative] = useState('');
  const [krs, setKrs] = useState([]);
  const [krsConfirmed, setKrsConfirmed] = useState(false);
  const [krsLoading, setKrsLoading] = useState(false);
  const [objective, setObjective] = useState('');
  const [objConfirmed, setObjConfirmed] = useState(false);
  const [objLoading, setObjLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const genKrs = async () => {
    setKrsLoading(true); setError(null);
    try {
      const res = await onExtractKrs?.(scope, narrative);
      const list = (res?.keyResults ?? []).map((k) => ({
        id: nextId(), title: k.title, type: k.type ?? 'number',
        target: k.targetValue ?? 0, current: 0, unit: k.unit ?? '',
      }));
      setKrs(list); setKrsConfirmed(false);
    } catch {
      setError('KR 추출에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setKrsLoading(false); }
  };

  const genObjective = async () => {
    setObjLoading(true); setError(null);
    try {
      const res = await onDeriveObjective?.(scope, krs.map((k) => ({ title: k.title, targetValue: Number(k.target) || 0, unit: k.unit })));
      setObjective(res?.objective?.title ?? ''); setObjConfirmed(false);
    } catch {
      setError('Objective 역도출에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setObjLoading(false); }
  };

  const patchKr = (id, patch) => { setKrs((p) => p.map((k) => (k.id === id ? { ...k, ...patch } : k))); setKrsConfirmed(false); };
  const removeKr = (id) => { setKrs((p) => p.filter((k) => k.id !== id)); setKrsConfirmed(false); };
  const addKr = () => { setKrs((p) => [...p, { id: nextId(), title: '', type: 'number', target: 0, current: 0, unit: '' }]); setKrsConfirmed(false); };

  const canNext =
    step === 1 ? narrative.trim().length >= 30
      : step === 2 ? krs.length > 0 && krs.every((k) => k.title.trim()) && krsConfirmed
        : !!objective.trim() && objConfirmed;

  const nextHint =
    canNext ? ''
      : step === 1 ? `미래 모습을 ${Math.max(0, 30 - narrative.trim().length)}자 더 입력하세요 (최소 30자)`
        : step === 2 ? (krs.length === 0 ? 'AI로 KR 초안을 생성하세요' : 'KR 초안을 확인(✓)해야 진행됩니다')
          : (!objective ? 'AI로 Objective 초안을 생성하세요' : 'Objective 초안을 확인(✓)해야 저장할 수 있습니다');

  const isLast = step === STEPS.length;

  const handleNext = async () => {
    if (!canNext) return;
    if (!isLast) { setStep(step + 1); return; }
    setSaving(true); setError(null);
    try {
      await onSubmit?.({
        level: scope,
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

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-wz-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
        <div className="okr-wz-body">
          <h2 className="okr-wz-title">OKR 설정 마법사 · KR 우선주의</h2>

          <div className="okr-wz-steps">
            {STEPS.map((s, i) => (
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
              <div className="okr-wz-section">
                <p className="okr-wz-step-eyebrow">STEP1 · Backward Looking</p>
                <p className="okr-wz-question">12월 31일, 어떤 모습이 되어 있을까요?</p>
                <p className="okr-wz-desc">한 해가 끝나는 시점의 이상적인 모습을 구체적으로 상상해 보세요. 이 문장이 KR 초안과 Objective 요약의 재료가 됩니다.</p>
              </div>
              <div className="okr-wz-scopes">
                {scopeOptions.map((s) => (
                  <div
                    className={`okr-wz-scope${scope === s.key ? ' is-active' : ''}`}
                    key={s.key}
                    onClick={() => setScope(s.key)}
                  >
                    <p className="okr-wz-scope-label">{s.label}</p>
                    <p className="okr-wz-scope-desc">{s.desc}</p>
                  </div>
                ))}
              </div>
              <textarea
                className="okr-textarea okr-wz-textarea"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder={NARRATIVE_PLACEHOLDER[scope] ?? NARRATIVE_PLACEHOLDER.team}
                aria-label="미래 구술"
              />
            </>
          )}

          {step === 2 && (
            <div className="okr-wz-section">
              <div className="okr-wz-head">
                <div>
                  <p className="okr-wz-step-eyebrow">STEP2 · KR 우선주의</p>
                  <p className="okr-wz-question">구술에서 측정 가능한 결과를 뽑아냅니다</p>
                </div>
                {aiBtn(krs.length ? 'AI로 다시 추출' : 'AI로 KR 추출', genKrs, krsLoading)}
              </div>
              {krs.length === 0 && !krsLoading && (
                <div className="okr-wz-empty">
                  <p>위 버튼을 눌러 AI 추천 KR 을 받아보세요. 구술이 길수록 정확해집니다.</p>
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

          {step === 3 && (
            <div className="okr-wz-section">
              <div className="okr-wz-head">
                <div>
                  <p className="okr-wz-step-eyebrow">STEP3 · Objective 역도출</p>
                  <p className="okr-wz-question">확인된 KR 로 Objective 를 한 문장으로 정리합니다</p>
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
                  onChange={(e) => { setObjective(e.target.value); setObjConfirmed(false); }}
                />
              </div>
              <div className="okr-wz-krpreview">
                <p className="okr-wz-krpreview-title">연결되는 KR ({krs.length}개)</p>
                {krs.map((k, i) => (
                  <div className="okr-wz-krpreview-row" key={k.id}>
                    <span className="okr-wz-krno">KR {i + 1}</span>
                    <span className="okr-wz-krpreview-name">{k.title || '(지표명 미입력)'}</span>
                    <span className="okr-wz-krpreview-val">{k.current} → {k.target} {k.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="okr-wz-error" role="alert">{error}</p>}
        </div>

        <div className="okr-modal-footer okr-wz-footer">
          <button className="okr-btn is-outline is-sm" disabled={step === 1} onClick={() => setStep(Math.max(1, step - 1))}>이전</button>
          <span className="okr-wz-footer-hint">
            {nextHint ? `⚠ ${nextHint}` : `STEP ${step} / ${STEPS.length}`}
          </span>
          <button className="okr-btn is-brand is-sm" disabled={!canNext || saving} onClick={handleNext}>
            {saving ? '저장 중…' : isLast ? 'OKR 확정 저장' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}

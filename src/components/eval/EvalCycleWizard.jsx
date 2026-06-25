import { useState } from 'react';

/**
 * EvalCycleWizard — 새 평가 사이클 생성 마법사.
 *
 * 이번 슬라이스: 3 스텝(기본 정보 / 단계별 일정 / 확인·생성). prop 으로 받은 labels(L)와
 * onSubmit/onCancel 로 동작하는 순수 컴포넌트. 생성은 draft 로만 만들고, 오픈은 목록에서
 * 별도 수행(생성/오픈 분리). 템플릿·등급·대상자 스텝은 후속 슬라이스에서 확장.
 */

const REVIEW_TYPE_KEYS = {
  self: 'reviewSelf',
  peer: 'reviewPeer',
  leader: 'reviewLeader',
};

const PEER_MODES = [
  { key: 'ai_recommend', label: 'modeAiRecommend', badge: 'recommendedBadge' },
  { key: 'self_select', label: 'modeSelfSelect' },
  { key: 'leader_assign', label: 'modeLeaderAssign' },
  { key: 'hr_assign', label: 'modeHrAssign', badge: 'exceptionBadge' },
];

/** reviewTypes 에 따라 일정이 필요한 단계 목록을 도출. */
function phasesForSchedule(reviewTypes) {
  const has = (t) => reviewTypes.includes(t);
  const phases = [];
  if (has('peer')) phases.push({ key: 'peerAssignDue', statusKey: 'statusPeerAssign' });
  if (has('self')) phases.push({ key: 'selfReviewDue', statusKey: 'statusSelfReview' });
  if (has('peer')) phases.push({ key: 'peerReviewDue', statusKey: 'statusPeerReview' });
  phases.push({ key: 'calibrationDue', statusKey: 'statusCalibration' });
  return phases;
}

function StepBar({ steps, current, labels: L, onJump }) {
  return (
    <div className="evc-wiz-steps">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'future';
        return (
          <button
            type="button"
            key={s.titleKey}
            className={`evc-wiz-step is-${state}`}
            onClick={() => state === 'done' && onJump(i)}
            disabled={state === 'future'}
          >
            <span className="evc-wiz-step-num">{state === 'done' ? '✓' : i + 1}</span>
            <span className="evc-wiz-step-label">{L[s.titleKey]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function EvalCycleWizard({ labels: L, onCancel, onSubmit }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reviewTypes, setReviewTypes] = useState(['self', 'leader']);
  const [peerAssignMode, setPeerAssignMode] = useState('ai_recommend');
  const [dues, setDues] = useState({});

  const steps = [
    { titleKey: 'wizardStep1' },
    { titleKey: 'wizardStep2' },
    { titleKey: 'wizardStep3' },
  ];

  const hasPeer = reviewTypes.includes('peer');
  const schedulePhases = phasesForSchedule(reviewTypes);

  const toggleType = (t) =>
    setReviewTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  const step1Valid = name.trim() && startDate && endDate && reviewTypes.length > 0;

  const submit = () => {
    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      reviewTypes,
      peerAssignMode: hasPeer ? peerAssignMode : undefined,
      peerAssignDue: dues.peerAssignDue ?? null,
      selfReviewDue: dues.selfReviewDue ?? null,
      peerReviewDue: dues.peerReviewDue ?? null,
      calibrationDue: dues.calibrationDue ?? null,
    };
    onSubmit(payload);
  };

  return (
    <div className="evc-modal-overlay" onClick={onCancel}>
      <div className="evc-wiz" onClick={(e) => e.stopPropagation()}>
        <div className="evc-wiz-header">
          <h3 className="evc-modal-title">{L.createTitle}</h3>
          <button type="button" className="evc-wiz-close" onClick={onCancel} aria-label={L.cancel}>
            ✕
          </button>
        </div>

        <StepBar steps={steps} current={step} labels={L} onJump={setStep} />

        <div className="evc-wiz-body">
          {step === 0 && (
            <div className="evc-wiz-panel">
              <label className="evc-field-label" htmlFor="evc-wiz-name">{L.cycleName}</label>
              <input
                id="evc-wiz-name"
                className="evc-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={L.cycleNamePlaceholder}
                autoFocus
                data-testid="evc-wiz-name"
              />
              <div className="evc-field-grid">
                <div>
                  <label className="evc-field-label" htmlFor="evc-wiz-start">{L.startDate}</label>
                  <input id="evc-wiz-start" type="date" className="evc-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="evc-wiz-start" />
                </div>
                <div>
                  <label className="evc-field-label" htmlFor="evc-wiz-end">{L.endDate}</label>
                  <input id="evc-wiz-end" type="date" className="evc-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="evc-wiz-end" />
                </div>
              </div>

              <span className="evc-field-label">{L.reviewTypes}</span>
              <div className="evc-type-row">
                {['self', 'peer', 'leader'].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`evc-type-chip${reviewTypes.includes(t) ? ' is-on' : ''}`}
                    onClick={() => toggleType(t)}
                    data-testid={`evc-wiz-type-${t}`}
                  >
                    {L[REVIEW_TYPE_KEYS[t]]}
                  </button>
                ))}
              </div>

              {hasPeer && (
                <>
                  <span className="evc-field-label">{L.peerAssignModeLabel}</span>
                  <div className="evc-mode-list">
                    {PEER_MODES.map((m) => (
                      <button
                        type="button"
                        key={m.key}
                        className={`evc-mode-item${peerAssignMode === m.key ? ' is-on' : ''}`}
                        onClick={() => setPeerAssignMode(m.key)}
                        data-testid={`evc-wiz-mode-${m.key}`}
                      >
                        <span className="evc-mode-radio" />
                        <span className="evc-mode-name">{L[m.label]}</span>
                        {m.badge && (
                          <span className={`evc-mode-badge${m.badge === 'exceptionBadge' ? ' is-warn' : ''}`}>
                            {L[m.badge]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="evc-wiz-panel">
              <p className="evc-wiz-hint">{L.scheduleHint}</p>
              {schedulePhases.map((p, i) => (
                <div key={p.key} className="evc-sched-row">
                  <span className="evc-sched-num">{i + 1}</span>
                  <span className="evc-sched-name">{L[p.statusKey]}</span>
                  <input
                    type="date"
                    className="evc-input evc-sched-date"
                    value={dues[p.key] ?? ''}
                    min={startDate || undefined}
                    max={endDate || undefined}
                    onChange={(e) => setDues((d) => ({ ...d, [p.key]: e.target.value }))}
                    data-testid={`evc-wiz-due-${p.key}`}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="evc-wiz-panel">
              <div className="evc-summary-card">
                <div className="evc-summary-row"><span>{L.cycleName}</span><b>{name}</b></div>
                <div className="evc-summary-row"><span>{L.period}</span><b>{startDate} ~ {endDate}</b></div>
                <div className="evc-summary-row">
                  <span>{L.reviewTypes}</span>
                  <b>{reviewTypes.map((t) => L[REVIEW_TYPE_KEYS[t]]).join(' · ')}</b>
                </div>
                {hasPeer && (
                  <div className="evc-summary-row">
                    <span>{L.peerAssignModeLabel}</span>
                    <b>{L[PEER_MODES.find((m) => m.key === peerAssignMode)?.label]}</b>
                  </div>
                )}
                {schedulePhases.map((p) =>
                  dues[p.key] ? (
                    <div key={p.key} className="evc-summary-row">
                      <span>{L[p.statusKey]} {L.dueLabel}</span>
                      <b>{dues[p.key]}</b>
                    </div>
                  ) : null,
                )}
              </div>
              <p className="evc-wiz-hint">{L.createDraftHint}</p>
            </div>
          )}
        </div>

        <div className="evc-wiz-footer">
          <button type="button" className="evc-btn is-ghost" onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
            {step === 0 ? L.cancel : L.prev}
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              className="evc-btn is-primary"
              disabled={step === 0 && !step1Valid}
              onClick={() => setStep(step + 1)}
              data-testid="evc-wiz-next"
            >
              {L.next}
            </button>
          ) : (
            <button type="button" className="evc-btn is-primary" onClick={submit} data-testid="evc-wiz-submit">
              {L.create}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * OkrSetupWizardModal — OKR 설정 마법사 (Backward Looking).
 *
 * 4단계 스텝(미래구상/KR 초안/Objective/정합성 확인) 중 STEP1 을 구현.
 * 스코프(개인/팀/전사) 선택 카드 + 미래 구상 입력 + 비전 이미지(선택).
 * 다음/이전으로 스텝을 오가며, 나머지 스텝은 placeholder 를 보여준다.
 */
const STEPS = [
  { label: '미래구상', desc: '12/31 시점' },
  { label: 'KR 초안', desc: '몇 문장으로' },
  { label: 'Objective', desc: '한 문장 요약' },
  { label: '정합성 확인', desc: '최종 검토' },
];

const SCOPES = [
  { key: 'personal', label: '개인', desc: '내 OKR을 직접 설계' },
  { key: 'team', label: '팀', desc: '팀 단위 OKR - 팀장 권한' },
  { key: 'company', label: '전사', desc: '회사 전체 OKR - 어드민' },
];

const DRAFT = '12월 31일, 우리는 Phase 1 제품을 완성해 얼리 액세스 500팀이 실제로 쓰고 있고, 주요 지표 데이터를 바탕으로 Series A 라운드를 준비하고 있다.';

export default function OkrSetupWizardModal({ icons, baseUrl = '', onClose }) {
  const [step, setStep] = useState(0);
  const [scope, setScope] = useState('personal');
  const [text, setText] = useState(DRAFT);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-wz-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
        <div className="okr-wz-body">
          <h2 className="okr-wz-title">OKR 설정</h2>

          <div className="okr-wz-steps">
            {STEPS.map((s, i) => (
              <div
                className={`okr-wz-step${i === step ? ' is-active' : ''}`}
                key={s.label}
                onClick={() => setStep(i)}
              >
                <p className="okr-wz-step-label">{s.label}</p>
                <p className="okr-wz-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>

          {step === 0 ? (
            <>
              <div className="okr-wz-section">
                <p className="okr-wz-step-eyebrow">STEP1 - Backward Looking</p>
                <p className="okr-wz-question">12월 31일, 어떤 모습이 되어 있을까요?</p>
                <p className="okr-wz-desc">한 해가 끝나는 시점의 이상적인 모습을 구체적으로 상상해 보세요. 여기서 쓴 문장이 KR 초안과 Objective 요약의 재료가 됩니다.</p>
              </div>

              <div className="okr-wz-scopes">
                {SCOPES.map((s) => (
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

              <textarea className="okr-textarea okr-wz-textarea" value={text} onChange={(e) => setText(e.target.value)} />

              <div className="okr-wz-vision">
                <div className="okr-wz-vision-head">
                  <span>비전 이미지 (선택)</span>
                  <button className="okr-wz-ai-btn">AI 비전 이미지 생성</button>
                </div>
                <div className="okr-wz-vision-box" />
              </div>
            </>
          ) : (
            <div className="okr-s-placeholder">STEP{step + 1} — {STEPS[step].label} (준비 중인 화면입니다)</div>
          )}
        </div>

        <div className="okr-modal-footer okr-wz-footer">
          <button className="okr-btn is-outline is-sm" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>이전</button>
          <span className="okr-wz-footer-hint">미래 모습을 30자 이상 입력해주세요 (최소 30자)</span>
          <button className="okr-btn is-brand is-sm" onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : onClose())}>다음</button>
        </div>
      </div>
    </div>
  );
}

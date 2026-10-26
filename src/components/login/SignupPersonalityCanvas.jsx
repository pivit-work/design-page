import { useState } from 'react';
import TextArea from '../shared/TextArea.jsx';
import { SignupFrame, SignupCard, SignupField, SignupSubmit, SignupChoices, SignupCheck, SignupNotice, SignupLink, SignupBack } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS } from './signupLabels.js';

/**
 * SignupPersonalityCanvas — 9단계 「나의 성향 설정」. 스타일 고르기(복수) · 성장시키고 싶은 것(200자) ·
 * 선호·성향 정보 동의(선택 · 보기/접기) · [계속하기] · 「건너뛰기」.
 *
 * Props: baseUrl · mode · onModeChange · traits(고른 key 목록) · onToggleTrait · growth · onGrowthChange
 *        consent · onConsentChange · onSubmit · onSkip · onBack · steps · currentStep(기본 8) · labels · testIds { submit, skip }
 */
export default function SignupPersonalityCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  traits = [],
  onToggleTrait,
  growth = '',
  onGrowthChange,
  consent = false,
  onConsentChange,
  onSubmit,
  onSkip,
  onBack,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 8,
  labels: labelsProp,
  testIds = {},
}) {
  const l = { ...SIGNUP_LABELS, ...labelsProp };
  const [consentOpen, setConsentOpen] = useState(false);
  const options = [
    { value: 'executor', label: l.traitExecutor, desc: l.traitExecutorDesc },
    { value: 'analyst', label: l.traitAnalyst, desc: l.traitAnalystDesc },
    { value: 'empathizer', label: l.traitEmpathizer, desc: l.traitEmpathizerDesc },
    { value: 'strategist', label: l.traitStrategist, desc: l.traitStrategistDesc },
  ];
  return (
    <SignupFrame
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={onModeChange}
      modeLabels={{ login: l.modeLogin, signup: l.modeSignup }}
      title={l.personalityTitle}
      subtitle={l.personalityDescription}
      steps={steps}
      currentStep={currentStep}
      foot={<SignupBack label={l.back} onClick={onBack} testId="signup-back" />}
    >
      <SignupCard onSubmit={onSubmit}>
        <SignupField label={l.personalityTraits} labelExtra={<span className="login-hint">{l.personalityTraitsHint}</span>}>
          <SignupChoices options={options} multiple values={traits} onToggle={onToggleTrait} testId="signup-traits" />
        </SignupField>
        <SignupField label={l.growthPoint} labelExtra={<span className="login-hint">{l.growthPointHint}</span>}>
          <TextArea className="login-input login-textarea" maxLength={200} rows={3} placeholder={l.growthPointPlaceholder} value={growth} onChange={onGrowthChange} />
        </SignupField>
        <SignupNotice
          title={`${l.prefConsentTitle} ${l.prefConsentOptional}`}
          open={consentOpen}
          onToggle={() => setConsentOpen((o) => !o)}
          showLabel={l.prefConsentView}
          hideLabel={l.prefConsentHide}
        >
          <p>{l.prefConsentBody}</p>
        </SignupNotice>
        <SignupCheck checked={consent} onChange={onConsentChange}>{l.prefConsentCheckbox}</SignupCheck>
        <SignupSubmit testId={testIds.submit}>{l.continue}</SignupSubmit>
        <div className="login-center">
          <SignupLink className="is-muted" onClick={onSkip} data-testid={testIds.skip}>{l.personalitySkip}</SignupLink>
        </div>
      </SignupCard>
    </SignupFrame>
  );
}

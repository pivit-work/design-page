import TextInput from '../shared/TextInput.jsx';
import { SignupFrame, SignupCard, SignupField, SignupSubmit, SignupCheck, SignupChoices, SignupNotice, SignupBack } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS, fill } from './signupLabels.js';

/**
 * SignupCompanyCanvas — 4단계 「회사 정보」. 회사명 · 회사 이메일 도메인 · 규모 · 업종 · 예상 인원 ·
 * 관심 있는 요금제 · 처리위탁계약 필수 동의 · 바로 열린다는 안내 · [신청하기].
 *
 * company: { name, domain, size, industry, headcount, plan, dpaAgreed }
 * onChange(patch) 로 한 칸씩 돌려준다. sizeOptions·planOptions 는 안 넘기면 앱 기본값.
 *
 * Props: baseUrl · mode · onModeChange · company · onChange · errors { name?, domain?, size?, headcount? }
 *        onSubmit · onBack · steps · currentStep(기본 3) · pending · labels · testIds { name, domain, submit }
 */
export default function SignupCompanyCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  company = {},
  onChange,
  errors = {},
  sizeOptions,
  planOptions,
  onSubmit,
  onBack,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 3,
  pending = false,
  labels: labelsProp,
  testIds = {},
}) {
  const l = { ...SIGNUP_LABELS, ...labelsProp };
  const set = (k) => (e) => onChange?.({ [k]: e.target.value });
  const sizes = sizeOptions ?? [
    { value: '1-10', label: `1–10${l.sizeUnit}` },
    { value: '11-50', label: `11–50${l.sizeUnit}` },
    { value: '51-200', label: `51–200${l.sizeUnit}` },
    { value: '200+', label: l.size200Plus },
  ];
  const plans = planOptions ?? [
    { value: 'starter', label: l.planStarter },
    { value: 'growth', label: l.planGrowth },
    { value: 'pro', label: l.planPro },
    { value: 'undecided', label: l.planUndecided },
  ];
  return (
    <SignupFrame
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={onModeChange}
      modeLabels={{ login: l.modeLogin, signup: l.modeSignup }}
      title={l.companyTitle}
      subtitle={l.companyDescription}
      steps={steps}
      currentStep={currentStep}
      foot={<SignupBack label={l.back} onClick={onBack} testId="signup-back" />}
    >
      <SignupCard onSubmit={onSubmit}>
        <SignupField label={l.companyName} error={errors.name}>
          <TextInput className="login-input" autoFocus placeholder={l.companyNamePlaceholder} value={company.name ?? ''} onChange={set('name')} data-testid={testIds.name} />
        </SignupField>
        <SignupField label={l.companyDomain} error={errors.domain} hint={l.companyDomainHint}>
          <TextInput className="login-input" placeholder={l.companyDomainPlaceholder} value={company.domain ?? ''} onChange={set('domain')} data-testid={testIds.domain} />
        </SignupField>
        <SignupField label={l.companySize} error={errors.size}>
          <SignupChoices options={sizes} value={company.size} onChange={(v) => onChange?.({ size: v })} testId="signup-company-size" />
        </SignupField>
        <SignupField label={l.industry}>
          <TextInput className="login-input" placeholder={l.industryPlaceholder} value={company.industry ?? ''} onChange={set('industry')} />
        </SignupField>
        <SignupField label={l.expectedHeadcount} error={errors.headcount}>
          <TextInput className="login-input" inputMode="numeric" placeholder={l.expectedHeadcountPlaceholder} value={company.headcount ?? ''} onChange={set('headcount')} />
        </SignupField>
        <SignupField label={l.requestedPlan}>
          <SignupChoices options={plans} value={company.plan} onChange={(v) => onChange?.({ plan: v })} testId="signup-company-plan" />
        </SignupField>
        <SignupCheck checked={!!company.dpaAgreed} onChange={(v) => onChange?.({ dpaAgreed: v })}>
          {fill(l.consentDpa, { company: company.name || l.dpaCompanyFallback })}
        </SignupCheck>
        <SignupNotice>
          <p>{l.approvalNotice}</p>
        </SignupNotice>
        <SignupSubmit pending={pending} testId={testIds.submit} disabled={!company.dpaAgreed}>{l.submitRequest}</SignupSubmit>
      </SignupCard>
    </SignupFrame>
  );
}

import TextInput from '../shared/TextInput.jsx';
import { SignupFrame, SignupCard, SignupField, SignupSubmit, SignupCheck, SignupBack } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS } from './signupLabels.js';

/**
 * SignupAccountCanvas — 3단계 「이름 입력」(관리자 시나리오는 비밀번호를 승인 뒤 결과 화면에서 정한다).
 * 인증 이메일(읽기만) · 이름 · 이용약관 필수 동의 · [계속하기].
 *
 * Props: baseUrl · mode · onModeChange · email · name · onNameChange · nameError · termsAgreed · onTermsChange
 *        onSubmit · onBack · steps · currentStep(기본 2) · pending · labels · testIds { name, terms, submit }
 */
export default function SignupAccountCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  email = '',
  name = '',
  onNameChange,
  nameError,
  termsAgreed = false,
  onTermsChange,
  onSubmit,
  onBack,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 2,
  pending = false,
  labels: labelsProp,
  testIds = {},
}) {
  const l = { ...SIGNUP_LABELS, ...labelsProp };
  return (
    <SignupFrame
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={onModeChange}
      modeLabels={{ login: l.modeLogin, signup: l.modeSignup }}
      title={l.nameOnlyTitle}
      subtitle={l.nameOnlyDescription}
      steps={steps}
      currentStep={currentStep}
      foot={<SignupBack label={l.back} onClick={onBack} testId="signup-back" />}
    >
      <SignupCard onSubmit={onSubmit}>
        <SignupField label={l.verifiedEmailLabel}>
          <TextInput className="login-input is-readonly" type="email" value={email} readOnly tabIndex={-1} />
        </SignupField>
        <SignupField label={l.nameLabel} error={nameError} hint={l.passwordDeferredHint}>
          <TextInput
            className="login-input"
            name="name"
            autoComplete="name"
            autoFocus
            placeholder={l.namePlaceholder}
            value={name}
            onChange={onNameChange}
            data-testid={testIds.name}
          />
        </SignupField>
        <SignupCheck checked={termsAgreed} onChange={onTermsChange} testId={testIds.terms}>{l.consentTerms}</SignupCheck>
        <SignupSubmit pending={pending} testId={testIds.submit} disabled={!termsAgreed}>{l.continue}</SignupSubmit>
      </SignupCard>
    </SignupFrame>
  );
}

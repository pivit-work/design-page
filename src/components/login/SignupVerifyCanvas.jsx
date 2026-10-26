import TextInput from '../shared/TextInput.jsx';
import { SignupFrame, SignupCard, SignupField, SignupSubmit, SignupLink, SignupFootRow } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS, fill } from './signupLabels.js';

/**
 * SignupVerifyCanvas — 2단계 「이메일 인증」. 6자리 인증 코드 칸 · 유효 시간 안내 · [코드 재전송] · [계속하기].
 * 아래 「이메일이 틀렸나요? 이메일 변경」은 1단계로 돌아간다.
 *
 * Props: baseUrl · mode · onModeChange · email(안내 문구에 들어간다) · code · onCodeChange · codeError
 *        onSubmit · onResend · onChangeEmail · steps · currentStep(기본 1) · pending · labels · testIds { code, submit }
 */
export default function SignupVerifyCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  email = '',
  code = '',
  onCodeChange,
  codeError,
  onSubmit,
  onResend,
  onChangeEmail,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 1,
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
      title={l.verifyTitle}
      subtitle={fill(l.verifySent, { email })}
      steps={steps}
      currentStep={currentStep}
      foot={<SignupFootRow text={l.wrongEmail} actionLabel={l.changeEmail} onAction={onChangeEmail} />}
    >
      <SignupCard onSubmit={onSubmit}>
        <SignupField
          label={l.codeLabel}
          error={codeError}
          hint={l.verifyExpiry}
          labelExtra={<SignupLink onClick={onResend}>{l.resendCode}</SignupLink>}
        >
          <TextInput
            className="login-input login-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder={l.codePlaceholder}
            value={code}
            onChange={onCodeChange}
            data-testid={testIds.code}
          />
        </SignupField>
        <SignupSubmit pending={pending} testId={testIds.submit}>{l.continue}</SignupSubmit>
      </SignupCard>
    </SignupFrame>
  );
}

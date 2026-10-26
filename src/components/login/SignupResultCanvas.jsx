import TextInput from '../shared/TextInput.jsx';
import { SignupFrame, SignupCard, SignupField, SignupSubmit, SignupNotice } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS, fill } from './signupLabels.js';

/**
 * SignupResultCanvas — 6단계 「결과」(승인). 계정 이메일(읽기만) · 비밀번호 · 비밀번호 확인 ·
 * 허용 도메인 안내 · [워크스페이스 시작하기] · 다음 단계 안내.
 *
 * Props: baseUrl · mode · onModeChange · email · domain · password · confirm · onPasswordChange · onConfirmChange
 *        errors { password?, confirm? } · onSubmit · steps · currentStep(기본 5) · pending · labels · testIds { password, confirm, submit }
 */
export default function SignupResultCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  email = '',
  domain = '',
  password = '',
  confirm = '',
  onPasswordChange,
  onConfirmChange,
  errors = {},
  onSubmit,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 5,
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
      title={l.resultApprovedTitle}
      subtitle={l.resultApprovedDesc}
      steps={steps}
      currentStep={currentStep}
      foot={<p className="login-foot-note">{l.resultNextSteps}</p>}
    >
      <SignupCard onSubmit={onSubmit}>
        <SignupField label={l.resultAccountEmailLabel} hint={l.resultAccountEmailHint}>
          <TextInput className="login-input is-readonly" type="email" value={email} readOnly tabIndex={-1} />
        </SignupField>
        <SignupField label={l.passwordLabel} error={errors.password} hint={l.pwHint}>
          <TextInput className="login-input" type="password" autoComplete="new-password" autoFocus placeholder={l.passwordPlaceholder} value={password} onChange={onPasswordChange} data-testid={testIds.password} />
        </SignupField>
        <SignupField label={l.confirmPwLabel} error={errors.confirm}>
          <TextInput className="login-input" type="password" autoComplete="new-password" placeholder={l.confirmPwPlaceholder} value={confirm} onChange={onConfirmChange} data-testid={testIds.confirm} />
        </SignupField>
        {domain && (
          <SignupNotice>
            <p>{fill(l.resultAllowedDomain, { domain })}</p>
          </SignupNotice>
        )}
        <SignupSubmit pending={pending} testId={testIds.submit}>{l.resultStart}</SignupSubmit>
      </SignupCard>
    </SignupFrame>
  );
}

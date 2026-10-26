import TextInput from '../shared/TextInput.jsx';
import LoginShell from './LoginShell.jsx';
import { CheckGlyph } from '../shared/lineIcons.jsx';
import { FieldError } from '../shared/FormField.jsx';
import { SignupCard, SignupField, SignupSubmit, SignupFootRow, SignupNotice } from './SignupPieces.jsx';
import { fill } from './signupLabels.js';

/**
 * PasswordResetCanvas — 「비밀번호를 잊으셨나요?」가 여는 비밀번호 재설정 흐름. 로그인 시안(Figma 17767:40732) 틀에
 * 실제 앱(/forgot-password · /reset-password/:token)의 문구를 그대로 썼다. 네 장면을 `stage` 로 고른다:
 *
 *   forgot  비밀번호 재설정 — 이메일 칸 · [재설정 링크 받기] · 「로그인으로 돌아가기」
 *   sent    메일을 확인해 주세요 — 도착·유효 시간·스팸함 안내 · [로그인으로 돌아가기]
 *   reset   새 비밀번호 설정(메일 링크로 들어온 화면) — 새 비밀번호 · 확인 · [비밀번호 변경] · 「재설정 링크 다시 받기」
 *   done    비밀번호가 변경되었습니다 — [로그인으로 돌아가기]
 *
 * Props: baseUrl · onModeChange(위 전환 컨트롤) · stage · email · onEmailChange · emailError
 *        password · confirm · onPasswordChange · onConfirmChange · errors { password?, confirm? }
 *        onSubmit(장면의 큰 버튼) · onBackToLogin · onRequestAgain · onAdvance(데모 — sent 에서 reset 으로 미리 보기)
 *        pending · labels · testIds { email, password, confirm, submit, formError }
 *
 * 앱이 기능을 잇는 자리(시안에 없는 상태 — 안 넘기면 시안 그대로다, pivit-work PW-2243):
 *   formError       칸 하나에 묶이지 않는 오류(요청 실패 · 만료되거나 이미 쓴 링크) — 큰 버튼 바로 위, 칸 오류와 같은 글씨
 *   submitDisabled  큰 버튼을 끈다(forgot 에서 이메일이 비었을 때)
 */
const DEFAULT_LABELS = {
  modeLogin: '로그인',
  modeSignup: '회원가입',
  title: '비밀번호 재설정',
  subtitle: '가입한 이메일로 재설정 링크를 보내드립니다.',
  email: '이메일',
  emailPlaceholder: '이메일 주소를 입력해 주세요',
  submit: '재설정 링크 받기',
  backToLogin: '로그인으로 돌아가기',
  sentTitle: '메일을 확인해 주세요',
  sentSubtitle: '{{email}} 로 재설정 링크를 보냈습니다.',
  sentHintDelivery: '해당 이메일로 가입된 계정이 있다면 링크가 도착합니다.',
  sentHintExpiry: '링크는 30분간 유효합니다.',
  sentHintSpam: '메일이 보이지 않으면 스팸함도 확인해주세요.',
  resetTitle: '새 비밀번호 설정',
  resetSubtitle: '앞으로 로그인에 사용할 비밀번호를 입력해주세요.',
  newPassword: '새 비밀번호',
  confirmPassword: '새 비밀번호 확인',
  policy: '8자 이상, 영문과 숫자를 모두 포함해야 합니다.',
  resetSubmit: '비밀번호 변경',
  requestAgain: '재설정 링크 다시 받기',
  doneTitle: '비밀번호가 변경되었습니다',
  doneSubtitle: '보안을 위해 기존 로그인 세션이 모두 종료되었습니다. 새 비밀번호로 다시 로그인해주세요.',
  demoAdvance: '메일 링크로 들어온 화면 미리 보기 (데모)',
};

export default function PasswordResetCanvas({
  baseUrl = '',
  onModeChange,
  stage = 'forgot',
  email = '',
  onEmailChange,
  emailError,
  password = '',
  confirm = '',
  onPasswordChange,
  onConfirmChange,
  errors = {},
  onSubmit,
  onBackToLogin,
  onRequestAgain,
  onAdvance,
  pending = false,
  labels: labelsProp,
  testIds = {},
  formError,
  submitDisabled = false,
}) {
  const l = { ...DEFAULT_LABELS, ...labelsProp };
  const heading = {
    forgot: [l.title, l.subtitle],
    sent: [l.sentTitle, fill(l.sentSubtitle, { email })],
    reset: [l.resetTitle, l.resetSubtitle],
    done: [l.doneTitle, l.doneSubtitle],
  }[stage] ?? [l.title, l.subtitle];

  let foot = null;
  if (stage === 'forgot') foot = <SignupFootRow actionLabel={l.backToLogin} onAction={onBackToLogin} />;
  if (stage === 'sent' && onAdvance) foot = <SignupFootRow actionLabel={l.demoAdvance} onAction={onAdvance} testId="reset-demo-advance" />;
  if (stage === 'reset') foot = <SignupFootRow actionLabel={l.requestAgain} onAction={onRequestAgain} />;
  const formErrorLine = formError ? <FieldError data-testid={testIds.formError}>{formError}</FieldError> : null;

  return (
    <LoginShell
      baseUrl={baseUrl}
      mode="login"
      onModeChange={onModeChange}
      modeLabels={{ login: l.modeLogin, signup: l.modeSignup }}
      title={heading[0]}
      subtitle={heading[1]}
      foot={foot}
    >
      {/* 칸 검사는 앱이 칸 아래 오류로 한다(한글 섞인 주소 등) — 브라우저 기본 말풍선이 먼저 막지 않게 (pivit-work PW-2243) */}
      <SignupCard onSubmit={onSubmit} testId={`reset-${stage}`} noValidate>
        {stage === 'forgot' && (
          <>
            <SignupField label={l.email} error={emailError}>
              <TextInput className="login-input" type="email" name="email" autoComplete="username" autoFocus placeholder={l.emailPlaceholder} value={email} onChange={onEmailChange} data-testid={testIds.email} />
            </SignupField>
            {formErrorLine}
            <SignupSubmit pending={pending} disabled={submitDisabled} testId={testIds.submit}>{l.submit}</SignupSubmit>
          </>
        )}
        {stage === 'sent' && (
          <>
            <SignupNotice>
              <p>{l.sentHintDelivery}</p>
              <p>{l.sentHintExpiry}</p>
              <p>{l.sentHintSpam}</p>
            </SignupNotice>
            <SignupSubmit testId={testIds.submit}>{l.backToLogin}</SignupSubmit>
          </>
        )}
        {stage === 'reset' && (
          <>
            <SignupField label={l.newPassword} error={errors.password} hint={l.policy}>
              <TextInput className="login-input" type="password" autoComplete="new-password" autoFocus value={password} onChange={onPasswordChange} data-testid={testIds.password} />
            </SignupField>
            <SignupField label={l.confirmPassword} error={errors.confirm}>
              <TextInput className="login-input" type="password" autoComplete="new-password" value={confirm} onChange={onConfirmChange} data-testid={testIds.confirm} />
            </SignupField>
            {formErrorLine}
            <SignupSubmit pending={pending} disabled={submitDisabled} testId={testIds.submit}>{l.resetSubmit}</SignupSubmit>
          </>
        )}
        {stage === 'done' && (
          <>
            <div className="login-done" aria-hidden="true">
              <CheckGlyph size={28} />
            </div>
            <SignupSubmit testId={testIds.submit}>{l.backToLogin}</SignupSubmit>
          </>
        )}
      </SignupCard>
    </LoginShell>
  );
}

import { CheckGlyph } from '../shared/lineIcons.jsx';
import { SignupFrame, SignupCard, SignupSubmit, SignupNotice } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS, fill } from './signupLabels.js';

/**
 * SignupCompleteCanvas — 10단계 「준비 완료!」. 큰 체크 · 요약(초대 N명 · 연동 N개) · [Pivit 시작하기].
 *
 * Props: baseUrl · mode · onModeChange · invitedCount · connectedCount · onStart · steps · currentStep(기본 9) · labels · testIds { start }
 */
export default function SignupCompleteCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  invitedCount = 0,
  connectedCount = 0,
  onStart,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 9,
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
      title={l.completeTitle}
      subtitle={l.completeDescription}
      steps={steps}
      currentStep={currentStep}
    >
      <SignupCard onSubmit={onStart}>
        <div className="login-done" aria-hidden="true">
          <CheckGlyph size={28} />
        </div>
        <SignupNotice testId="signup-complete-summary">
          <p>{fill(l.completeSummaryInvited, { count: invitedCount })}</p>
          <p>{fill(l.completeSummaryConnected, { count: connectedCount })}</p>
        </SignupNotice>
        <SignupSubmit testId={testIds.start}>{l.startPivit}</SignupSubmit>
      </SignupCard>
    </SignupFrame>
  );
}

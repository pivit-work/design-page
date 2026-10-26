import StatusBadge from '../shared/StatusBadge.jsx';
import Button from '../shared/Button.jsx';
import { SignupFrame, SignupCard, SignupSummary, SignupNotice, SignupLink, SignupFootRow } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS, fill } from './signupLabels.js';

/**
 * SignupPendingCanvas — 5단계 「승인 대기」. 상태 딱지(신청됨) · 신청 요약 · 안내 메일 문구 ·
 * [신청 내용 수정] [신청 취소]. 실제 앱은 결과를 폴링해 넘어가므로 버튼이 없다 — 데모는 onAdvance 를 주면
 * 아래에 「다음 단계 미리 보기 (데모)」 링크를 그린다.
 *
 * Props: baseUrl · mode · onModeChange · email · submittedAt · rows [{ label, value }](요약; 없으면 신청일만)
 *        onEdit · onCancel · onAdvance · steps · currentStep(기본 4) · labels · testIds { edit, cancel }
 */
export default function SignupPendingCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  email = '',
  submittedAt = '',
  rows,
  onEdit,
  onCancel,
  onAdvance,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 4,
  labels: labelsProp,
  testIds = {},
}) {
  const l = { ...SIGNUP_LABELS, ...labelsProp };
  const summary = rows ?? [{ label: l.requestSubmittedAt, value: submittedAt }];
  return (
    <SignupFrame
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={onModeChange}
      modeLabels={{ login: l.modeLogin, signup: l.modeSignup }}
      title={l.requestPendingTitle}
      subtitle={l.requestPendingEta}
      steps={steps}
      currentStep={currentStep}
      foot={onAdvance ? <SignupFootRow actionLabel={l.demoAdvance} onAction={onAdvance} testId="signup-demo-advance" /> : null}
    >
      <SignupCard>
        <div className="login-status-row">
          <StatusBadge tone="progress">{l.requestStatusSubmitted}</StatusBadge>
        </div>
        <SignupSummary rows={summary} />
        <SignupNotice>
          <p>{fill(l.requestNotifyEmail, { email })}</p>
        </SignupNotice>
        <div className="login-actions">
          <Button className="login-google" onClick={onEdit} data-testid={testIds.edit}>{l.requestEdit}</Button>
          <SignupLink className="is-muted" onClick={onCancel} data-testid={testIds.cancel}>{l.requestCancel}</SignupLink>
        </div>
      </SignupCard>
    </SignupFrame>
  );
}

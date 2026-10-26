import { useState } from 'react';
import TextInput from '../shared/TextInput.jsx';
import { SignupFrame, SignupCard, SignupField, SignupSubmit, SignupDivider, SignupGoogle, SignupLink, SignupFootRow, SignupNotice } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS } from './signupLabels.js';

/**
 * SignupEntryCanvas — 회원가입(온보딩 A-1) 1단계 「시작하기」. 로그인 시안(Figma 17767:40732) 틀에
 * 실제 앱(app.dev.pivit.work/onboarding) 첫 단계의 내용: 이메일 칸 · 개인정보 처리 안내(접기/펼치기) ·
 * 약관 링크 줄 · [계속하기] · 또는 · [Google로 시작하기] · 「이미 계정이 있으신가요? 로그인하기」.
 *
 * Props:
 *   baseUrl · mode · onModeChange   LoginShell 과 같다
 *   email · onEmailChange · emailError
 *   onSubmit        [계속하기] · Enter
 *   onGoogle        [Google로 시작하기]
 *   onLogin         아래 「로그인하기」
 *   onLegal         (key: 'terms'|'privacy'|'operationPolicy') => void
 *   steps · currentStep   진행 표시(기본 관리자 10단계 · 0)
 *   noticeOpen      개인정보 안내를 처음에 펼쳐 둘지(기본 true — 처음 보이는 고지는 펼친다)
 *   pending · labels · testIds { email, submit, google }
 */
export default function SignupEntryCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  email = '',
  onEmailChange,
  emailError,
  onSubmit,
  onGoogle,
  onLogin,
  onLegal,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 0,
  noticeOpen = true,
  pending = false,
  labels: labelsProp,
  testIds = {},
}) {
  const l = { ...SIGNUP_LABELS, ...labelsProp };
  const [open, setOpen] = useState(noticeOpen);
  const legalKeys = ['terms', 'privacy', 'operationPolicy'];

  return (
    <SignupFrame
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={onModeChange}
      modeLabels={{ login: l.modeLogin, signup: l.modeSignup }}
      title={l.emailTitle}
      subtitle={l.emailDescription}
      steps={steps}
      currentStep={currentStep}
      foot={<SignupFootRow text={l.alreadyHaveAccount} actionLabel={l.goToLogin} onAction={onLogin} />}
    >
      <SignupCard onSubmit={onSubmit}>
        <SignupField label={l.email} error={emailError}>
          <TextInput
            className="login-input"
            type="email"
            name="email"
            autoComplete="email"
            autoFocus
            placeholder={l.emailPlaceholder}
            value={email}
            onChange={onEmailChange}
            data-testid={testIds.email}
          />
        </SignupField>

        {/* 개인정보 처리 «고지» — 체크박스 없음. 수집이 일어나는 첫 화면이라 [계속하기] 위에 둔다 */}
        <SignupNotice
          title={l.noticeTitle}
          open={open}
          onToggle={() => setOpen((o) => !o)}
          showLabel={l.noticeShow}
          hideLabel={l.noticeHide}
          testId="signup-privacy-notice"
        >
          <p>{l.noticeLead}</p>
          <p>{l.noticeBasis}</p>
          <p>{l.noticeItems}</p>
          <p>{l.noticePurpose}</p>
          <p className="login-notice-strong">{l.noticeRetention}</p>
          <p>{l.noticeMore}</p>
        </SignupNotice>
        <p className="login-legal">
          {legalKeys.map((key, i) => (
            <span key={key}>
              {i > 0 && <span className="login-legal-dot" aria-hidden="true">·</span>}
              <SignupLink className="is-legal" onClick={() => onLegal?.(key)}>{l[key]}</SignupLink>
            </span>
          ))}
        </p>

        <SignupSubmit pending={pending} testId={testIds.submit}>{l.continue}</SignupSubmit>
        <SignupDivider label={l.or} />
        <SignupGoogle baseUrl={baseUrl} onClick={onGoogle} testId={testIds.google}>{l.googleSSO}</SignupGoogle>
      </SignupCard>
    </SignupFrame>
  );
}

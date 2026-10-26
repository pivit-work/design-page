import { useState } from 'react';
import {
  LoginCanvas,
  SignupEntryCanvas,
  SignupVerifyCanvas,
  SignupAccountCanvas,
  SignupCompanyCanvas,
  SignupPendingCanvas,
  SignupResultCanvas,
  SignupInviteCanvas,
  SignupIntegrationsCanvas,
  SignupPersonalityCanvas,
  SignupCompleteCanvas,
} from './components/login';

/**
 * LoginPage — 로그인 화면 page wrapper (Figma 17767:40732).
 *
 * 위 전환 컨트롤이나 「회원가입」을 고르면 같은 틀에서 온보딩(관리자 시나리오 A) 열 단계가 차례로 선다 —
 * 이메일 → 인증 → 이름 → 회사 정보 → 승인 대기 → 결과(비밀번호) → 구성원 초대 → 연동 → 성향 설정 → 완료.
 * 내용은 실제 앱(app.dev.pivit.work/onboarding)의 단계와 문구를 따르고, 아직 시안이 없어 로그인 시안 값으로 조립했다.
 *
 * 데모라 검증 없이 넘어간다: [로그인]·[Google로 로그인] 과 마지막 [Pivit 시작하기] 는 바로 `onLoggedIn` 으로 첫 메뉴에 내린다.
 * 승인 대기는 실제로는 폴링으로 넘어가므로 「다음 단계 미리 보기 (데모)」 링크를 둔다.
 * 실제 앱(pivit-work)은 자기 Page 에서 같은 부품에 인증·가입 요청을 건다.
 */
const SIGNUP_STEPS = ['email', 'verify', 'account', 'company', 'pending', 'result', 'invite', 'integrations', 'personality', 'complete'];

export default function LoginPage({ baseUrl = '', onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 회원가입 진행 상태 — 단계 인덱스와 각 단계 입력값
  const [step, setStep] = useState(0);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [company, setCompany] = useState({ name: '', domain: '', size: undefined, industry: '', headcount: '', plan: undefined, dpaAgreed: false });
  const [confirm, setConfirm] = useState('');
  const [inviteMode, setInviteMode] = useState('email');
  const [emails, setEmails] = useState(['']);
  const [link, setLink] = useState(null);
  const [linkExpiry, setLinkExpiry] = useState('30d');
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState([]);
  const [traits, setTraits] = useState([]);
  const [growth, setGrowth] = useState('');
  const [prefConsent, setPrefConsent] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, SIGNUP_STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const changeMode = (m) => {
    setMode(m);
    if (m === 'signup') setStep(0);
  };
  const toggle = (list, setList) => (key) => setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  if (mode !== 'signup') {
    return (
      <LoginCanvas
        baseUrl={baseUrl}
        mode={mode}
        onModeChange={changeMode}
        email={email}
        password={password}
        onEmailChange={(e) => setEmail(e.target.value)}
        onPasswordChange={(e) => setPassword(e.target.value)}
        onSubmit={() => onLoggedIn?.()}
        onGoogle={() => onLoggedIn?.()}
        onForgotPassword={() => {}}
        onSignup={() => changeMode('signup')}
        testIds={{ email: 'login-email', password: 'login-password', submit: 'login-submit', google: 'login-google' }}
      />
    );
  }

  const common = { baseUrl, mode, onModeChange: changeMode, currentStep: step };
  const key = SIGNUP_STEPS[step];
  const domain = company.domain || (email.includes('@') ? email.split('@')[1] : '');

  if (key === 'email') {
    return (
      <SignupEntryCanvas
        {...common}
        email={email}
        onEmailChange={(e) => setEmail(e.target.value)}
        onSubmit={next}
        onGoogle={next}
        onLogin={() => changeMode('login')}
        onLegal={() => {}}
        testIds={{ email: 'signup-email', submit: 'signup-continue', google: 'signup-google' }}
      />
    );
  }
  if (key === 'verify') {
    return (
      <SignupVerifyCanvas
        {...common}
        email={email || 'name@company.com'}
        code={code}
        onCodeChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onSubmit={next}
        onResend={() => {}}
        onChangeEmail={() => setStep(0)}
        testIds={{ code: 'signup-code', submit: 'signup-continue' }}
      />
    );
  }
  if (key === 'account') {
    return (
      <SignupAccountCanvas
        {...common}
        email={email || 'name@company.com'}
        name={name}
        onNameChange={(e) => setName(e.target.value)}
        termsAgreed={termsAgreed}
        onTermsChange={setTermsAgreed}
        onSubmit={next}
        onBack={back}
        testIds={{ name: 'signup-name', terms: 'signup-terms', submit: 'signup-continue' }}
      />
    );
  }
  if (key === 'company') {
    return (
      <SignupCompanyCanvas
        {...common}
        company={company}
        onChange={(patch) => setCompany((c) => ({ ...c, ...patch }))}
        onSubmit={next}
        onBack={back}
        testIds={{ name: 'signup-company-name', domain: 'signup-company-domain', submit: 'signup-continue' }}
      />
    );
  }
  if (key === 'pending') {
    return (
      <SignupPendingCanvas
        {...common}
        email={email || 'name@company.com'}
        rows={[
          { label: '신청일', value: '2026.10.27' },
          { label: '회사명', value: company.name || '—' },
          { label: '회사 이메일 도메인', value: domain || '—' },
          { label: '관심 있는 요금제', value: company.plan ? { starter: 'Starter', growth: 'Growth', pro: 'Pro', undecided: '아직 모르겠어요' }[company.plan] : '—' },
        ]}
        onEdit={back}
        onCancel={() => changeMode('login')}
        onAdvance={next}
        testIds={{ edit: 'signup-request-edit', cancel: 'signup-request-cancel' }}
      />
    );
  }
  if (key === 'result') {
    return (
      <SignupResultCanvas
        {...common}
        email={email || 'name@company.com'}
        domain={domain}
        password={password}
        confirm={confirm}
        onPasswordChange={(e) => setPassword(e.target.value)}
        onConfirmChange={(e) => setConfirm(e.target.value)}
        onSubmit={next}
        testIds={{ password: 'signup-password', confirm: 'signup-password-confirm', submit: 'signup-continue' }}
      />
    );
  }
  if (key === 'invite') {
    return (
      <SignupInviteCanvas
        {...common}
        inviteMode={inviteMode}
        onInviteModeChange={setInviteMode}
        emails={emails}
        onEmailsChange={setEmails}
        link={link}
        linkExpiry={linkExpiry}
        onLinkExpiryChange={setLinkExpiry}
        onCreateLink={() => setLink(`https://app.pivit.work/invite/${domain || 'company'}-x7k2q9`)}
        onCopyLink={() => setCopied(true)}
        copied={copied}
        onSubmit={next}
        onSkip={next}
        onBack={back}
        testIds={{ submit: 'signup-continue', skip: 'signup-skip' }}
      />
    );
  }
  if (key === 'integrations') {
    return (
      <SignupIntegrationsCanvas
        {...common}
        connected={connected}
        onToggle={toggle(connected, setConnected)}
        onSubmit={next}
        onSkip={next}
        onBack={back}
        testIds={{ submit: 'signup-continue', skip: 'signup-skip' }}
      />
    );
  }
  if (key === 'personality') {
    return (
      <SignupPersonalityCanvas
        {...common}
        traits={traits}
        onToggleTrait={toggle(traits, setTraits)}
        growth={growth}
        onGrowthChange={(e) => setGrowth(e.target.value)}
        consent={prefConsent}
        onConsentChange={setPrefConsent}
        onSubmit={next}
        onSkip={next}
        onBack={back}
        testIds={{ submit: 'signup-continue', skip: 'signup-skip' }}
      />
    );
  }
  return (
    <SignupCompleteCanvas
      {...common}
      invitedCount={emails.filter((e) => e.trim()).length}
      connectedCount={connected.length}
      onStart={() => onLoggedIn?.()}
      testIds={{ start: 'signup-start' }}
    />
  );
}

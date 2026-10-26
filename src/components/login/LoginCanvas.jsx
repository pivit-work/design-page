import LoginShell from './LoginShell.jsx';
import FormField from '../shared/FormField.jsx';
import TextInput from '../shared/TextInput.jsx';
import Button from '../shared/Button.jsx';
import assetUrl from '../shared/assetUrl.js';

/**
 * LoginCanvas — 회사 홈페이지의 [로그인] 을 누르면 나오는 로그인 화면.
 * Figma 17767:40732. 틀은 LoginShell, 여기는 카드(이메일 · 비밀번호 · [로그인] · 또는 · [Google로 로그인])와
 * 아래 안내(비밀번호 찾기 · 회원가입 · 초기 관리자 안내).
 *
 * 입력값·모드는 밖(page wrapper · 앱)이 들고 있다 — 여기서는 그리기만 한다.
 *
 * Props:
 *   baseUrl           정적 에셋 base ('/' 로 끝남). 로고·Google 아이콘에 쓴다
 *   mode              'login' | 'signup' — 위 전환 컨트롤의 선택값
 *   onModeChange      (next) => void
 *   email · password  칸 값
 *   onEmailChange · onPasswordChange  (e) => void
 *   onSubmit          [로그인] · Enter. 폼 submit 이벤트는 여기서 막는다
 *   onGoogle          [Google로 로그인]
 *   onForgotPassword  「비밀번호를 잊으셨나요?」
 *   onSignup          아래 「회원가입」
 *   emailError · passwordError  칸 아래 오류 문구(없으면 안 그린다)
 *   pending           [로그인] 요청 중 잠금
 *   labels            문구 덮어쓰기 — 안 넘기면 한국어 기본값
 *   testIds           { email, password, submit, google } — 소비자 테스트가 잡는 자리
 */
const DEFAULT_LABELS = {
  modeLogin: '로그인',
  modeSignup: '회원가입',
  title: 'Login',
  subtitle: '당신의 회사, 팀을 위한 생산성 플랫폼',
  email: '이메일',
  emailPlaceholder: '이메일 주소를 입력해 주세요',
  password: '비밀번호',
  passwordPlaceholder: '비밀번호를 입력해 주세요',
  submit: '로그인',
  or: '또는',
  google: 'Google로 로그인',
  forgot: '비밀번호를 잊으셨나요?',
  noAccount: '계정이 없으신가요?',
  signup: '회원가입',
  adminNote: '초기 관리자 계정 정보는 관리자에게 문의하세요.',
};

export default function LoginCanvas({
  baseUrl = '',
  mode = 'login',
  onModeChange,
  email = '',
  password = '',
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogle,
  onForgotPassword,
  onSignup,
  emailError,
  passwordError,
  pending = false,
  labels: labelsProp,
  testIds = {},
}) {
  const l = { ...DEFAULT_LABELS, ...labelsProp };

  return (
    <LoginShell
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={onModeChange}
      modeLabels={{ login: l.modeLogin, signup: l.modeSignup }}
      title={l.title}
      subtitle={l.subtitle}
      foot={
        <>
          <Button className="login-link" onClick={onForgotPassword}>{l.forgot}</Button>
          <p className="login-foot-row">
            <span className="login-foot-text">{l.noAccount}</span>
            <Button className="login-link" onClick={onSignup}>{l.signup}</Button>
          </p>
          <p className="login-foot-note">{l.adminNote}</p>
        </>
      }
    >
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        <FormField label={l.email} error={emailError} className="login-field" labelClassName="login-label">
          <TextInput
            className="login-input"
            type="email"
            name="email"
            autoComplete="username"
            placeholder={l.emailPlaceholder}
            value={email}
            onChange={onEmailChange}
            data-testid={testIds.email}
          />
        </FormField>
        <FormField label={l.password} error={passwordError} className="login-field" labelClassName="login-label">
          <TextInput
            className="login-input"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder={l.passwordPlaceholder}
            value={password}
            onChange={onPasswordChange}
            data-testid={testIds.password}
          />
        </FormField>

        <Button type="submit" className="login-submit" pending={pending} data-testid={testIds.submit}>
          {l.submit}
        </Button>

        <div className="login-divider" aria-hidden="true">
          <span className="login-divider-line" />
          <span className="login-divider-text">{l.or}</span>
          <span className="login-divider-line" />
        </div>

        <Button className="login-google" onClick={onGoogle} data-testid={testIds.google}>
          <img className="login-google-icon" src={assetUrl(baseUrl, '/icons-brand/google.svg')} alt="" draggable={false} />
          {l.google}
        </Button>
      </form>
    </LoginShell>
  );
}

import { useState } from 'react';
import { LoginCanvas } from './components/login';

/**
 * LoginPage — 로그인 화면 page wrapper (Figma 17767:40732).
 *
 * 데모라 검증 없이 [로그인]·[Google로 로그인] 을 누르면 바로 `onLoggedIn` 으로 첫 메뉴에 내린다.
 * 실제 앱(pivit-work)은 자기 Page 에서 같은 <LoginCanvas> 에 인증 요청을 건다.
 * 회원가입 화면은 아직 시안이 없어 전환 컨트롤만 바뀌고 같은 칸을 보인다.
 */
export default function LoginPage({ baseUrl = '', onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <LoginCanvas
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={setMode}
      email={email}
      password={password}
      onEmailChange={(e) => setEmail(e.target.value)}
      onPasswordChange={(e) => setPassword(e.target.value)}
      onSubmit={() => onLoggedIn?.()}
      onGoogle={() => onLoggedIn?.()}
      onForgotPassword={() => {}}
      onSignup={() => setMode('signup')}
      testIds={{ email: 'login-email', password: 'login-password', submit: 'login-submit', google: 'login-google' }}
    />
  );
}

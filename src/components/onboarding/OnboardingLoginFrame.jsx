import { useCallback, useMemo, useRef, useState } from 'react';
import LoginShell from '../login/LoginShell.jsx';
import { SignupBack, SignupProgress } from '../login/SignupPieces.jsx';
import { OnbLoginLookContext } from './onboardingLook.js';

/**
 * 회원가입 단계를 디자이너 로그인 틀로 — 디자이너 «온보딩 기본 틀»(Figma 17770:23654, stesslee 0d20f531 `SignupFrame`)과
 * 같은 배치: 위 띠(로고 · 로그인/회원가입 전환) · 제목 묶음 · 진행 띠 · 흰 카드 · 바닥 가운데 [뒤로].
 *
 * `SignupFrame` 과 다른 점은 둘뿐이다(앱이 기능을 잇는 자리 · pivit-work PW-1815):
 *   - 제목 묶음을 카드 안 `OnbStepHeader` 가 채운다(단계 화면이 저마다 제목을 정한다)
 *   - 카드가 <form> 이 아니다(단계 화면이 저마다 버튼을 단다)
 *
 * Props:
 *   baseUrl · mode · onModeChange · modeLabels   LoginShell 과 같다
 *   steps        진행 띠 칸 이름(string[]) · current 지금 칸
 *   showProgress 진행 띠를 보일지(완료 화면은 숨긴다)
 *   backLabel · onBack   바닥 [뒤로] — backLabel 이 없으면 숨긴다(승인 대기 구간 등)
 *   footExtra    [뒤로] 아래 더 붙일 줄(「이미 계정이 있으신가요? 로그인하기」)
 *   before       카드 맨 위에 끼우는 것(단계를 넘지 못한 오류 띠)
 *   cardTestId · testId
 */
export function OnboardingLoginFrame({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  modeLabels,
  steps = [],
  current = 0,
  showProgress = true,
  backLabel,
  onBack,
  footExtra,
  before,
  cardTestId = 'onboarding-card',
  testId = 'onboarding-login-frame',
  children,
}) {
  const look = useHeadingSlot(baseUrl);
  const foot = (
    <>
      {backLabel && <SignupBack label={backLabel} onClick={onBack} testId="onboarding-back" />}
      {look.footSlot}
      {footExtra}
    </>
  );
  return (
    <OnbLoginLookContext.Provider value={look.value}>
      <div data-testid={testId}>
        <LoginShell
          layout="top"
          baseUrl={baseUrl}
          mode={mode}
          onModeChange={onModeChange}
          modeLabels={modeLabels}
          title={look.title}
          subtitle={look.subtitle}
          above={showProgress && steps.length > 0 ? <SignupProgress steps={steps} current={current} /> : null}
          foot={foot}
        >
          <div className="login-card onb-scope" data-testid={cardTestId}>
            {before}
            {children}
          </div>
        </LoginShell>
      </div>
    </OnbLoginLookContext.Provider>
  );
}

/**
 * 진행 띠 없이 가운데 서는 한 장짜리 화면(초대 만료·베타 링크 안내·불러오는 중) — 로그인 화면과 같은 배치
 * (LoginShell layout center). 제목 묶음은 카드 안 `OnbStepHeader` 가 채운다. bare 면 카드 없이 내용만.
 */
export function OnboardingLoginCenter({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  modeLabels,
  bare = false,
  foot,
  testId,
  bodyTestId,
  children,
}) {
  const look = useHeadingSlot(baseUrl);
  return (
    <OnbLoginLookContext.Provider value={look.value}>
      <div data-testid={testId}>
        <LoginShell
          layout="center"
          baseUrl={baseUrl}
          mode={mode}
          onModeChange={onModeChange}
          modeLabels={modeLabels}
          title={look.title}
          subtitle={look.subtitle}
          foot={
            <>
              {look.footSlot}
              {foot}
            </>
          }
        >
          {bare ? (
            <div className="onb-scope" data-testid={bodyTestId}>{children}</div>
          ) : (
            <div className="login-card onb-scope" data-testid={bodyTestId}>{children}</div>
          )}
        </LoginShell>
      </div>
    </OnbLoginLookContext.Provider>
  );
}

/**
 * 제목 묶음 자리 — 카드 안 첫 `OnbStepHeader` 가 제목·설명을 이 자리(LoginShell 의 h1·p)로 옮겨 그린다.
 * 한 화면에 머리가 둘이면(초대의 Slack 탭 안내) 먼저 잡은 쪽만 옮기고 나머지는 카드 안에 그대로 선다.
 */
function useHeadingSlot(baseUrl) {
  const [titleEl, setTitleEl] = useState(null);
  const [subtitleEl, setSubtitleEl] = useState(null);
  const [hasSubtitle, setHasSubtitle] = useState(false);
  const [footEl, setFootEl] = useState(null);
  // 같은 커밋에 머리 둘이 잡으러 오면 상태가 아직 안 바뀌어 있다 — 먼저 온 쪽을 ref 로 곧장 가린다.
  const owner = useRef(null);
  const [ownerId, setOwnerId] = useState(null);
  const claimHeading = useCallback((id, withSubtitle) => {
    if (owner.current && owner.current !== id) return null;
    owner.current = id;
    setOwnerId(id);
    setHasSubtitle(withSubtitle);
    return () => {
      if (owner.current === id) {
        owner.current = null;
        setOwnerId(null);
        setHasSubtitle(false);
      }
    };
  }, []);
  const value = useMemo(
    () => ({ baseUrl, claimHeading, ownerId, titleEl, subtitleEl, footEl }),
    [baseUrl, claimHeading, ownerId, titleEl, subtitleEl, footEl],
  );
  return {
    value,
    title: <span ref={setTitleEl} data-testid="onboarding-title" />,
    subtitle: hasSubtitle ? <span ref={setSubtitleEl} data-testid="onboarding-subtitle" /> : null,
    // 화면 아래 안내 줄 자리 — 단계 화면의 OnbStepFoot 이 이리 옮겨 그린다(「이미 계정이 있으신가요? 로그인하기」)
    footSlot: <div ref={setFootEl} data-testid="onboarding-foot" />,
  };
}

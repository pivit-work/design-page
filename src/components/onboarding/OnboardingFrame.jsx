import { OnbArrowLeftIcon, OnbCheckIcon, OnbLockIcon } from './onboardingIcons.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import assetUrl from '../shared/assetUrl.js';

/**
 * 온보딩 화면 틀 — 시안 `8. onboarding/onboarding-app.jsx` 의 `Onboarding()` 레이아웃.
 * 스타일은 `onboarding.css`(onb-*). 문구는 전부 호출부가 준다(i18n 은 소비처 몫).
 *
 *   <OnboardingShell>
 *     <OnboardingBrandPanel … />          ← 1024px 미만에서는 호출부가 빼고 그린다
 *     <OnboardingScrollPane onScroll>
 *       <OnboardingTopBar scrolled back progress />
 *       <OnboardingContent> <OnboardingCard>…단계…</OnboardingCard> </OnboardingContent>
 *     </OnboardingScrollPane>
 *   </OnboardingShell>
 *
 * 시안과 다르게 둔 것(앱에서 이미 쓰던 동작):
 *   · 진행 표시를 스크롤해도 보이게 위쪽 머리에 고정하고, 그 왼쪽에 뒤로가기를 둔다.
 *   · 승인 대기 중 잠긴 단계는 시안에 없어 회색 원 + 자물쇠로 그린다.
 */

/**
 * 정식 로고(logo.svg · 아이콘+글자 · 원래 색) — 위쪽 머리 왼쪽 끝 자리.
 * 높이 24(진행 표시 원과 같음) · 폭 약 68(기획서 entry §1 «폭 100 이하»).
 * `ghost` 는 가운데 정렬용 보이지 않는 짝이다.
 */
function OnbLogo({ baseUrl, ghost = false }) {
  return ghost ? (
    <span className="onb-logo is-ghost" aria-hidden />
  ) : (
    <img className="onb-logo" src={assetUrl(baseUrl, 'logo.svg')} alt="Pivit" data-testid="onboarding-logo" />
  );
}

export function OnboardingShell({ children, testId }) {
  return (
    <div className="onb-shell" data-testid={testId}>
      {children}
    </div>
  );
}

/**
 * 가운데 한 덩어리만 보이는 전체 화면 — 불러오는 중 · 초대 만료/무효 · 계정 불일치.
 * `bare` 면 흰 카드 없이 글만 둔다(불러오는 중).
 * `logo` 면 위쪽 머리와 같은 자리(왼쪽 위)에 정식 로고를 둔다 — 진행 표시가 없는 화면에도
 * 로고는 남는다(기획서 entry §3 «항상» · PW-2222).
 */
export function OnboardingCenter({ children, testId, bodyTestId, bare = false, logo = false, baseUrl = '' }) {
  return (
    <div className={`onb-center${logo ? ' has-logo' : ''}`} data-testid={testId}>
      {logo && (
        <div className="onb-center-logo">
          <OnbLogo baseUrl={baseUrl} />
        </div>
      )}
      <div className="onb-center-body" data-testid={bodyTestId}>
        {bare ? children : <div className="onb-card">{children}</div>}
      </div>
    </div>
  );
}

/**
 * 왼쪽 안내 패널 (시안 LeftPanel).
 *
 * Props: eyebrow? · title · subtitle · pills: string[] · baseUrl(로고 경로)
 * title·subtitle 의 줄바꿈 문자(\n)는 그대로 줄을 나눈다.
 */
export function OnboardingBrandPanel({ eyebrow, title, subtitle, pills = [], testId, baseUrl = '' }) {
  return (
    <aside className="onb-panel" data-testid={testId}>
      <div className="onb-panel-grid" aria-hidden />
      <div className="onb-panel-glow" aria-hidden />
      <div className="onb-panel-body">
        {/* 정식 로고를 흰색으로 — 로그인 화면 왼쪽 패널 로고와 같은 처리(PW-2222) */}
        <div className="onb-panel-logo">
          <img src={assetUrl(baseUrl, 'logo.svg')} alt="Pivit" data-testid="onboarding-panel-logo" />
        </div>
        <div className="onb-panel-copy">
          {eyebrow && <p className="onb-panel-eyebrow">{eyebrow}</p>}
          <h2 className="onb-panel-title">{title}</h2>
          {subtitle && <p className="onb-panel-sub">{subtitle}</p>}
          {pills.length > 0 && (
            <div className="onb-panel-pills">
              {pills.map((p) => (
                <StatusBadge key={p} className="onb-panel-pill">
                  {p}
                </StatusBadge>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/** 오른쪽 스크롤 칸 — 이 칸이 스크롤 컨테이너다(body 는 스크롤되지 않는다). */
export function OnboardingScrollPane({ children, onScroll, testId = 'onboarding-scroll-pane' }) {
  return (
    <div className="onb-scroll" data-testid={testId} onScroll={onScroll}>
      {children}
    </div>
  );
}

/**
 * 위쪽 머리 — [로고] + 뒤로가기(좌) + 진행 표시(가운데).
 *
 * Props:
 *   logo       true 면 왼쪽 끝에 정식 로고, 뒤로가기는 그 오른쪽(PW-2222). 좁은 창에서는 로고가 한 줄 위로 간다
 *   baseUrl    로고 경로의 base
 *   progress   진행 표시 노드
 *   backLabel  뒤로가기 글자. 없으면 뒤로가기 자리를 비운다
 *   onBack
 *   scrolled   true 면 아래 구분선을 긋는다(내용이 밑에 깔릴 때만)
 */
export function OnboardingTopBar({ progress, backLabel, onBack, scrolled = false, logo = false, baseUrl = '' }) {
  const back = backLabel ? (
    <button type="button" className="onb-back" onClick={onBack}>
      <OnbArrowLeftIcon size={14} />
      {backLabel}
    </button>
  ) : (
    <div />
  );
  // 오른쪽은 뒤로가기와 같은 폭의 보이지 않는 짝 — 좌우 레일 폭이 같아야 가운데가 정중앙이다.
  const mirror = backLabel ? (
    <span className="onb-back is-ghost" aria-hidden>
      <OnbArrowLeftIcon size={14} />
      {backLabel}
    </span>
  ) : (
    // 뒤로가기가 없어도 짝 자리는 is-ghost 로 둔다 — 좁은 창에서 짝을 숨기는 규칙이 이 자리도 잡게.
    <span className="onb-back is-ghost" aria-hidden />
  );
  return (
    <div
      className={`onb-topbar${scrolled ? ' is-scrolled' : ''}`}
      data-testid="onboarding-sticky-header"
    >
      <div className={`onb-topbar-row${logo ? ' has-logo' : ''}`} data-testid="onboarding-top-chrome">
        {logo && <OnbLogo baseUrl={baseUrl} />}
        {back}
        <div className="onb-topbar-center">{progress}</div>
        {mirror}
        {logo && <OnbLogo ghost />}
      </div>
    </div>
  );
}

/**
 * 내용 칸 + 가운데 480px 기둥. 기둥 안에 단계 카드를 둔다.
 *
 * `wide` 면 기둥이 남은 폭을 쓴다(최대 1440px) — 넓은 표를 보여 주는 동안만 켠다
 * (「구성원 초대」 CSV 미리보기, PW-1233). 480px 기둥에서는 65칸 표의 두 칸만 보였다.
 */
export function OnboardingContent({ children, before, wide = false }) {
  return (
    <div className="onb-content" data-testid="onboarding-content-area">
      <div
        className={`onb-column${wide ? ' is-wide' : ''}`}
        data-testid="onboarding-step-content"
        data-wide={wide ? 'true' : undefined}
      >
        {before}
        {children}
      </div>
    </div>
  );
}

/** 단계 카드 (시안 Step card) — 흰 바탕 · 둥근 모서리 · 그림자. */
export function OnboardingCard({ children, testId }) {
  return (
    <div className="onb-card" data-testid={testId}>
      {children}
    </div>
  );
}

/**
 * 진행 표시 (시안 ProgressBar).
 *
 * Props:
 *   steps      [{ key, label }] — label 은 원에 마우스를 올리면 보인다(title)
 *   current    지금 단계 인덱스
 *   lockedFrom 이 인덱스부터 잠금(회색 원 + 자물쇠) — 승인 전 「승인 후 계속됨」
 */
export function OnboardingProgress({ steps = [], current = 0, lockedFrom }) {
  return (
    <div className="onb-progress" data-testid="onboarding-progress">
      {steps.map((step, i) => {
        const locked = lockedFrom !== undefined && lockedFrom !== null && i >= lockedFrom;
        const done = !locked && i < current;
        const isCurrent = !locked && i === current;
        const last = i === steps.length - 1;
        return (
          <div key={step.key} className={`onb-progress-step${last ? '' : ' is-stretch'}`}>
            <div
              className={`onb-progress-dot${done ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
              title={step.label}
              aria-label={step.label}
              aria-current={isCurrent ? 'step' : undefined}
              data-testid={locked ? 'onboarding-step-locked' : undefined}
            >
              {locked ? <OnbLockIcon size={11} /> : done ? <OnbCheckIcon size={12} /> : i + 1}
            </div>
            {!last && <div className={`onb-progress-line${i < current && !locked ? ' is-done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

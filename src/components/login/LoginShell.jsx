import SegmentedControl from '../shared/SegmentedControl.jsx';
import assetUrl from '../shared/assetUrl.js';

/**
 * LoginShell — 로그인 화면(Figma 17767:40732)의 틀. 로그인·회원가입(온보딩 진입)이 같이 쓴다.
 *
 * 사이드바·상단 메뉴 없이 화면 전체: 왼쪽 위 로고, 위 가운데 로그인·회원가입 전환, 가운데 제목 묶음 + 흰 카드,
 * 아래 안내. 카드 안(children)과 아래 안내(foot), 카드 위에 끼우는 것(above — 온보딩 진행 표시)은 호출부가 준다.
 *
 * Props:
 *   layout         'center'(로그인 — 카드가 화면 세로 중심) | 'top'(온보딩 — 위 띠 바로 아래부터 제목·진행 띠·카드)
 *   baseUrl        정적 에셋 base ('/' 로 끝남) — 로고
 *   mode           'login' | 'signup'
 *   onModeChange   (next) => void
 *   modeLabels     { login, signup } — 전환 컨트롤 글자
 *   title · subtitle   제목 묶음
 *   above          카드 바로 위에 두는 것(선택)
 *   children       카드 — 호출부가 <form className="login-card"> 를 넘긴다
 *   foot           아래 안내(선택)
 */
export default function LoginShell({
  layout = 'center',
  baseUrl = '',
  mode = 'login',
  onModeChange,
  modeLabels = { login: '로그인', signup: '회원가입' },
  title,
  subtitle,
  above,
  children,
  foot,
}) {
  return (
    <div className="login-page" data-mode={mode}>
      {/* 위 띠 — 로고 · 전환 컨트롤 · 로고 폭 빈칸(컨트롤이 정중앙에 오게). 스크롤해도 위에 붙고 뒤가 흐려진다 */}
      <div className="login-topbar">
        <img className="login-logo" src={assetUrl(baseUrl, 'logo.svg')} alt="Pivit" draggable={false} />
        <div className="login-mode">
          <SegmentedControl
            ariaLabel={`${modeLabels.login} · ${modeLabels.signup}`}
            items={[
              { value: 'login', label: modeLabels.login },
              { value: 'signup', label: modeLabels.signup },
            ]}
            value={mode}
            onChange={(next) => onModeChange?.(next)}
          />
        </div>
        <div className="login-topbar-spacer" aria-hidden="true" />
      </div>

      <div className={`login-body is-${layout}`}>
      <div className="login-main">
        <div className="login-heading">
          <h1 className="login-title">{title}</h1>
          {subtitle && <p className="login-subtitle">{subtitle}</p>}
        </div>
        {above}
        {children}
      </div>

      {foot && <div className="login-foot">{foot}</div>}
      </div>
    </div>
  );
}

/**
 * ImpersonationBanner — 대신 로그인(Log in As) 중임을 알리는 전역 상단 띠.
 *
 * 기획서 어드민 시안(`admin-app.jsx` 의 「전역 임퍼소네이션 배너」)을 옮겼다 — 왼쪽
 * 메뉴 오른쪽부터 화면 끝까지, 화면 맨 위, 보라→브랜드색 띠, 반투명 흰 테두리 버튼.
 * 스타일은 `app-overlays.css` 의 `.pw-impersonation-banner`.
 *
 * 전역 상단 배너 자리 규칙(기획서 `arch-nav-routing-policy.md` §1-배너): 서비스 공지와
 * 함께 뜨면 이 띠가 **위**다. 본문을 밀어 내리는 것은 호스트(셸)가 한다 — 이 띠는
 * 자기 높이를 `ref` 로 잴 수 있게 겉 상자에 ref 를 붙일 뿐이다.
 *
 * Props:
 *   message       띠 문구 (호스트가 번역해 넘긴다)
 *   returnLabel   돌아가기 버튼 문구
 *   onReturn      돌아가기 클릭
 *   busy          true 면 버튼을 잠근다
 *   icon          문구 앞 아이콘 노드 (글자색을 상속한다)
 *   ref           겉 상자 ref (React 19 — prop 으로 받는다)
 *   나머지 속성(data-* 등)은 겉 상자에 그대로 붙는다.
 */
export default function ImpersonationBanner({
  message,
  returnLabel,
  onReturn,
  busy = false,
  icon,
  ref,
  ...rest
}) {
  return (
    <div ref={ref} role="status" className="pw-impersonation-banner" {...rest}>
      {icon && <span className="pw-impersonation-banner__icon">{icon}</span>}
      <span className="pw-impersonation-banner__text">{message}</span>
      <button
        type="button"
        className="pw-impersonation-banner__return"
        onClick={onReturn}
        disabled={busy}
      >
        {returnLabel}
      </button>
    </div>
  );
}

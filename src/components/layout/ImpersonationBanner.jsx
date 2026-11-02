import Button from '../shared/Button.jsx';

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
 *
 * 같은 띠를 «앱 전체가 평소와 다르다»는 다른 안내에도 쓴다 — 선택 props (pivit-work PW-2549 이용 정지 띠).
 * 안 넘기면 종전 마크업 그대로다.
 *   tone          'danger' 면 빨강 띠(결제 문제로 막힘). 없으면 종전 보라→브랜드색
 *   detail        문구 아래 둘째 줄(굵지 않은 글). 있으면 띠가 두 줄로 늘어난다
 *   actions       `[{ key, label, onClick, testId }]` — 돌아가기 버튼 하나 대신 넘긴 순서대로 같은 모양의 버튼들.
 *                 빈 배열이면 버튼 없이 글만
 */
export default function ImpersonationBanner({
  message,
  returnLabel,
  onReturn,
  busy = false,
  icon,
  tone,
  detail,
  actions,
  ref,
  ...rest
}) {
  const className = [
    'pw-impersonation-banner',
    tone === 'danger' ? 'is-danger' : '',
    detail ? 'is-stacked' : '',
  ].filter(Boolean).join(' ');
  return (
    <div ref={ref} role="status" className={className} {...rest}>
      {icon && <span className="pw-impersonation-banner__icon">{icon}</span>}
      {detail ? (
        <span className="pw-impersonation-banner__text">
          {message}
          <span className="pw-impersonation-banner__detail">{detail}</span>
        </span>
      ) : (
        <span className="pw-impersonation-banner__text">{message}</span>
      )}
      {actions ? (
        actions.length > 0 && (
          <span className="pw-impersonation-banner__actions">
            {actions.map((a) => (
              // 공용 Button 에 띠 버튼 모양(`__return`)만 얹는다 — 모양은 돌아가기 버튼과 같다.
              <Button
                key={a.key}
                className="pw-impersonation-banner__return"
                onClick={a.onClick}
                disabled={busy}
                data-testid={a.testId}
              >
                {a.label}
              </Button>
            ))}
          </span>
        )
      ) : (
        <button
          type="button"
          className="pw-impersonation-banner__return"
          onClick={onReturn}
          disabled={busy}
        >
          {returnLabel}
        </button>
      )}
    </div>
  );
}

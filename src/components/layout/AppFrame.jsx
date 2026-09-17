/**
 * AppFrame — 앱 전체를 감싸는 겉 틀(`.app`, 스타일은 `App.css`).
 *
 * 왼쪽 메뉴·위쪽 바·본문 칸이 모두 이 안에 놓인다. 모양은 `.app` 클래스가 전부
 * 정하고, 이 부품은 그 클래스를 이름으로 기억하지 않아도 되게 감쌀 뿐이다.
 *
 * 나머지 속성(`data-*`·`style` 의 CSS 변수 등)은 겉 상자에 그대로 붙는다 — 호스트가
 * 상단 배너 높이만큼 본문을 밀 때 쓰는 자리다.
 */
export default function AppFrame({ children, ...rest }) {
  return (
    <div className="app" {...rest}>
      {children}
    </div>
  );
}

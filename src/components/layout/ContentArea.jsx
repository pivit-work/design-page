/**
 * ContentArea — 왼쪽 메뉴(240px)와 위쪽 바(48px)를 비켜 선 본문 칸(`.content-area`,
 * 스타일은 `App.css`).
 *
 * 🔴 대부분의 캔버스는 이 칸을 스스로 그린다. 자체 칸이 있는 캔버스를 또 감싸면 칸이
 * 두 겹이 되므로, **자체 칸이 없는 화면에만** 쓴다.
 *
 * `className` 은 `content-area` 뒤에 덧붙고, 나머지 속성은 칸에 그대로 붙는다.
 */
export default function ContentArea({ className, children, ...rest }) {
  return (
    <div className={className ? `content-area ${className}` : 'content-area'} {...rest}>
      {children}
    </div>
  );
}

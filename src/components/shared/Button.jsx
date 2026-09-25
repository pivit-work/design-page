import { useEffect, useRef, useState } from 'react';
import Spinner from './Spinner.jsx';

/**
 * 버튼 — 두 번 눌러도 한 번만 일어나는 공용 버튼 (PW-1007).
 *
 * 되돌리기 어려운 동작([재발송]·[제출]·[○○ 단계로 진행])을 연달아 누르면 요청이 두 번 나가
 * 메일이 두 통 가거나 평가 단계가 한 칸 더 넘어갔다(PW-967). 그때는 버튼마다 «요청 중» 상태를
 * 따로 만들어 막았는데, 이 부품이 그 잠금을 한곳에 둔다. 잠그는 길은 둘이다.
 *
 *   1) 화면이 알려 준다 — `pending` 을 켜면 잠기고 요청 중 표시가 뜬다.
 *        <Button variant="primary" pending={saving} onClick={save}>저장</Button>
 *   2) 버튼이 스스로 잠근다 — `onClick` 이 약속(Promise)을 돌려주면 그 약속이 끝날 때까지
 *      (실패해도) 잠겨 있다. 잠그고 싶지 않으면 약속을 돌려주지 않으면 된다.
 *        <Button onClick={() => onResendInvite(id)}>재발송</Button>
 *
 * 잠긴 동안에는 `disabled` 가 걸리고 `aria-busy` 가 켜지며, 글자는 자리만 남기고 가운데에
 * 도는 표시가 뜬다 — 글자 폭 그대로라 옆 버튼이 밀리지 않는다.
 *
 * 🔴 버튼 잠금은 한 화면 안의 연타만 막는다. 탭 두 개에서 누르는 것은 못 막으니, 되돌리기
 * 어려운 동작은 서버에서도 따로 막는다(PW-967 의 초대 재발송·단계 진행처럼).
 *
 * ## 생김새
 *
 * `variant`·`size` 를 주면 이 부품의 모양(`src/button.css` 의 `dp-btn--*`)을 쓴다. 화면마다
 * 이미 그려 둔 버튼 모양(`admin-emp-btn is-ghost is-sm`, `evc-btn is-primary` 등)을 그대로
 * 두고 잠금만 얹을 때는 `variant` 없이 `className` 으로 그 모양을 넘긴다 — 상태 딱지
 * (`StatusBadge`, PW-840)처럼 모양을 하나로 맞추는 일은 따로 한다.
 *
 * @param {'primary'|'secondary'|'ghost'|'danger'} [variant] 이 부품의 모양. 없으면 `className` 이 모양을 맡는다
 * @param {'sm'|'md'} [size='md'] `variant` 를 줬을 때의 크기
 * @param {boolean} [pending] 화면이 알려 주는 «요청 중»
 * @param {boolean} [disabled] 눌 수 없는 상태(요청 중과 별개)
 * @param {(e) => unknown} [onClick] 약속을 돌려주면 끝날 때까지 스스로 잠근다
 * @param {string} [pendingLabel] 요청 중일 때 화면 읽기 프로그램이 읽을 이름. 없으면 글자 그대로
 */
export default function Button({
  variant,
  size = 'md',
  pending = false,
  disabled = false,
  onClick,
  pendingLabel,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const [running, setRunning] = useState(false);
  // 같은 틀(frame) 안에 두 번 눌리면 다시 그리기 전이라 `disabled` 가 아직 안 걸려 있다 —
  // 상태가 아니라 ref 로 곧장 막는다.
  const runningRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const busy = pending || running;

  const handleClick = (e) => {
    if (busy || disabled || runningRef.current) {
      e.preventDefault();
      return;
    }
    const result = onClick?.(e);
    if (!result || typeof result.then !== 'function') return;
    runningRef.current = true;
    setRunning(true);
    const release = () => {
      runningRef.current = false;
      if (mountedRef.current) setRunning(false);
    };
    // 실패는 onClick 을 준 화면이 알린다 — 여기서는 풀기만 한다.
    result.then(release, release);
  };

  const classes = [
    'dp-btn',
    variant ? `dp-btn--${variant}` : '',
    variant ? `dp-btn--${size}` : '',
    busy ? 'is-pending' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-label={busy && pendingLabel ? pendingLabel : rest['aria-label']}
      onClick={handleClick}
    >
      <span className="dp-btn__label">{children}</span>
      {busy && <Spinner className="dp-btn__spinner" />}
    </button>
  );
}

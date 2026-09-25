/**
 * 켜기/끄기 스위치 (PW-1010).
 *
 * 어드민 › 알림 설정·연동·AI 프롬프트, 내 설정, 평가 사이클 만들기(단계 일정), 스니핏 개발 도구가
 * 스위치를 각자 그려 여섯 벌이었다. 크기·색이 화면마다 조금씩 달랐고(38×22 · 40×22 · 36×20,
 * 켜진 색 셋), 두 곳은 화면 읽기 프로그램이 스위치로 알아듣지 못했다(`aria-pressed` 이거나
 * 아무 표시도 없었다). 한 벌로 모았고 모양은 가장 많이 쓰던 알림 설정의 것이다(`src/switch.css`).
 *
 * 화면 읽기 프로그램에는 늘 «스위치 · 켜짐/꺼짐»으로 읽힌다. 이름은 `label` 로 준다 — 스위치
 * 옆에 이름 글이 따로 있고 그 글이 `<label>` 로 감싸 이름이 되는 자리는 생략해도 된다.
 *
 * @param {boolean} checked       켜져 있나
 * @param {(next: boolean) => void} onChange  누르면 반대 값으로 부른다
 * @param {string} [label]        화면 읽기 프로그램이 읽을 이름
 * @param {boolean} [disabled]    못 누르게 잠근다(흐리게 보인다)
 * 나머지 속성(`data-testid`·`title` 등)은 버튼에 그대로 붙는다.
 */
export default function Switch({ checked, onChange, label, disabled = false, className = '', ...rest }) {
  const classes = ['dp-switch', checked ? 'is-on' : '', className].filter(Boolean).join(' ');
  return (
    <button
      {...rest}
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label ?? rest['aria-label']}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange?.(!checked);
      }}
      className={classes}
    >
      <span className="dp-switch__knob" aria-hidden="true" />
    </button>
  );
}

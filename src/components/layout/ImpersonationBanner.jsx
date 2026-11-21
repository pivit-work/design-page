import { Fragment, useLayoutEffect, useRef, useState } from 'react';
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
 *   message       띠 문구 (호스트가 번역해 넘긴다). 배열이면 토막마다 나눠 그린다 — 첫 토막(누구로 로그인 중)은 굵게,
 *                 나머지(무엇을 할 수 있나 · 범위 · 기록)는 보통 굵기로 띄워 둔다. « — » 로 이어 한 줄로 쓰면
 *                 세 토막이 한눈에 안 갈렸다(pivit-work PW-2935 · 전자결재 양식 편집 «점검» 줄과 같은 방식)
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
 *   aside         돌아가기 버튼 바로 왼쪽에 붙는 짧은 글(굵지 않은 글 · 줄어들지 않음). 대신 로그인 띠의
 *                 «모든 작업 기록» 줄 — 기획서 전역 배너 자리(pivit-work PW-3133)
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
  aside,
  actions,
  ref,
  ...rest
}) {
  const className = [
    'pw-impersonation-banner',
    tone === 'danger' ? 'is-danger' : '',
    detail ? 'is-stacked' : '',
  ].filter(Boolean).join(' ');
  const textRef = useRef(null);
  const parts = Array.isArray(message);
  // 두 줄 띠에서 토막이 통째로 다음 줄로 넘어가면, 그 토막 앞 세로선과 띄움이 줄 머리에 남아 둘째 줄만
  // 안쪽에서 시작했다(pivit-work PW-2935 11-22 디자이너 리뷰). 줄 머리에 선 토막에 is-line-start 를 붙여 선을 뺀다.
  // CSS 로는 «줄 머리»를 알 수 없어 그린 뒤 위치로 잰다 — 폭이 바뀌면 다시 잰다.
  const [lineStarts, setLineStarts] = useState('');
  const stackedParts = parts && Boolean(detail);
  useLayoutEffect(() => {
    const box = textRef.current;
    if (!box || !stackedParts) {
      setLineStarts('');
      return undefined;
    }
    const mark = () => {
      const nodes = [...box.querySelectorAll(':scope > .pw-impersonation-banner__part')];
      // 늘 «선이 다 있고 줄을 끊지 않았을 때» 자리로 잰다 — 선을 뺀 채 재면 좁아진 토막이 윗줄로 올라가 선이 붙었다 빠졌다 오간다.
      const breaks = [...box.querySelectorAll(':scope > .pw-impersonation-banner__br')];
      breaks.forEach((b) => { b.style.display = 'none'; });
      nodes.forEach((n) => n.classList.remove('is-line-start'));
      const starts = [];
      for (let i = 1; i < nodes.length; i += 1) {
        const prevRects = nodes[i - 1].getClientRects();
        const prev = prevRects[prevRects.length - 1];
        const cur = nodes[i].getBoundingClientRect();
        if (prev && cur.top >= prev.top + prev.height / 2) starts.push(i);
      }
      // 잰 뒤 바로 되돌린다 — 값이 같으면 React 가 다시 그리지 않아 DOM 에서 지운 표시·줄바꿈이 사라진 채 남지 않게.
      breaks.forEach((b) => { b.style.display = ''; });
      nodes.forEach((n, i) => n.classList.toggle('is-line-start', starts.includes(i)));
      const next = starts.join(',');
      setLineStarts((old) => (old === next ? old : next));
    };
    mark();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(mark);
    ro.observe(box);
    // 줄바꿈을 넣으면 글 칸이 첫 줄 길이로 줄어 창을 넓혀도 글 칸 크기는 그대로다 — 띠 겉 상자도 지켜봐야 넓힐 때 다시 잰다
    // (11-22 디자이너 리뷰: 1280 으로 좁혔다 1440 으로 넓혀도 세 줄로 남음).
    if (box.parentElement) ro.observe(box.parentElement);
    return () => ro.disconnect();
  }, [stackedParts, message]);
  const startSet = lineStarts ? lineStarts.split(',').map(Number) : [];
  const text = parts
    ? message.map((part, i) => (
      // 선을 뺀 토막은 13px 좁아져 윗줄 남은 자리에 도로 들어갈 수 있다 — 그 앞에서 줄을 끊어 잰 자리에 그대로 둔다
      // (11-22 디자이너 리뷰: 1300~1340 에서 «로그인 중실제 작업 가능»으로 붙음).
      <Fragment key={i}>
        {stackedParts && startSet.includes(i) && <br className="pw-impersonation-banner__br" />}
        <span
          className={[
            'pw-impersonation-banner__part',
            i ? 'is-sub' : '',
            stackedParts && startSet.includes(i) ? 'is-line-start' : '',
          ].filter(Boolean).join(' ')}
        >
          {part}
        </span>
      </Fragment>
    ))
    : message;
  return (
    <div ref={ref} role="status" className={className} {...rest}>
      {icon && <span className="pw-impersonation-banner__icon">{icon}</span>}
      {detail ? (
        <span ref={textRef} className="pw-impersonation-banner__text">
          {text}
          <span className="pw-impersonation-banner__detail">{detail}</span>
        </span>
      ) : (
        <span className="pw-impersonation-banner__text">{text}</span>
      )}
      {aside && <span className="pw-impersonation-banner__aside">{aside}</span>}
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

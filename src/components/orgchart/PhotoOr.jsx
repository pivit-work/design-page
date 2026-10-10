import { useState } from 'react';

/**
 * 사진 한 장 — 주소가 비었거나 못 불러오면(404·만료) `fallback` 을 대신 그린다 (PW-1637).
 *
 * 조직도 화면군은 사진 자리마다 모양이 달라(카드 32px 원, 프로필 창 팀원 48px, 표의 이니셜 칸,
 * 스쿼드의 두 줄 이름 원) 공용 `Avatar` 하나로 갈아끼우면 생김새가 바뀐다. 그래서 각 자리의
 * 기존 대체 모양은 그대로 두고 «깨지면 그쪽으로 넘어간다»만 여기서 정한다. 재시도는 하지 않고,
 * 주소가 바뀌면 다시 시도한다.
 *
 * `draggable={false}` — 카드는 마우스로 직접 끈다. 사진을 잡고 끌면 브라우저가 사진만 따로
 * 끌어 가면서 mousemove/mouseup 이 끊긴다.
 */
export default function PhotoOr({ src, fallback = null, alt = '', ...imgProps }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) return fallback;
  return <img src={src} alt={alt} draggable={false} onError={() => setFailedSrc(src)} {...imgProps} />;
}

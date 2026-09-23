import { useEffect, useState } from 'react';

/**
 * 긴 카드 목록을 나눠 그린다 — 처음 `first` 개를 곧바로, 나머지는 `step` 개씩 이어서.
 * 다 그려진 뒤의 모습은 한꺼번에 그린 것과 같다(순서·개수 그대로). 겉모양은 바꾸지 않는다.
 *
 * 왜 (2026-09-23 성능 점검): 구성원 3,000명 조직을 어드민으로 열면 매니저 「오늘 현황」·
 * 1on1 대시보드·자원 현황이 카드 수천 장을 한 번에 그려, 브라우저가 0.3초씩 여러 번 굳었다
 * (대부분 화면 밖 카드의 배치 계산). 먼저 한 화면 분량을 보여 주고 나머지는 잘게 나눠
 * 그리면 그동안에도 클릭·스크롤이 먹는다.
 *
 * 목록(배열)이 바뀌면(거르기·탭 전환) 처음부터 다시 나눠 그린다.
 * 카드가 `first` 개 이하인 화면(대부분의 팀)은 예전과 똑같이 한 번에 그린다.
 */
export default function useProgressiveList(items, { first = 60, step = 120 } = {}) {
  const [state, setState] = useState({ items, shown: first });
  const shown = state.items === items ? state.shown : first;
  const total = items.length;
  useEffect(() => {
    if (shown >= total) return undefined;
    const id = setTimeout(() => setState({ items, shown: shown + step }), 0);
    return () => clearTimeout(id);
  }, [items, shown, total, step]);
  return shown >= total ? items : items.slice(0, shown);
}


/**
 * 단계 일정의 «겹침» 판정 — 새 사이클 마법사 3단계 「단계별 일정」과 진행 중 사이클의
 * 「단계별 일정 수정」 창이 함께 쓴다 [정책 §4.5 · §5.2.1].
 *
 * 겹침은 오류가 아니라 병렬 진행이다 — 막지 않는다. 대신 편집으로 «전에 없던» 겹침이 생기는
 * 순간 겹치는 단계 쌍을 알리고(`EvalScheduleOverlapAlert`), 겹친 줄에 「동시 진행」 배지를 단다.
 * 판정을 두 화면에 따로 적으면 한쪽만 고쳐진다(`evalSchedulePast.js` 를 뺀 것과 같은 이유).
 *
 * 값은 두 화면 모두 `YYYY-MM-DDTHH:mm` 한 덩어리라 글자 비교로 앞뒤를 가린다.
 * 끝이 정확히 다음 시작과 같으면 겹침이 아니다(이어 달리기).
 */

/** `rows: [{ id, name, start, end }]` → 겹치는 쌍 `[{ key: 'a|b', a: 이름, b: 이름 }]`. */
export function getOverlapPairs(rows) {
  const pairs = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (!a.start || !a.end || !b.start || !b.end) continue;
      if (a.start < b.end && b.start < a.end) {
        pairs.push({ key: [a.id, b.id].sort().join('|'), a: a.name, b: b.name });
      }
    }
  }
  return pairs;
}

/** 겹침 쌍에 든 단계 id 집합 — 「동시 진행」 배지를 달 줄. */
export function overlapIdsOf(pairs) {
  return new Set(pairs.flatMap((p) => p.key.split('|')));
}

/**
 * 고치기 전(`before`)에는 없고 고친 뒤(`after`)에 생긴 겹침 쌍.
 * 이미 겹쳐 있던 쌍은 다시 알리지 않는다 — 날짜를 하나 고칠 때마다 같은 창이 뜨면 아무도 읽지 않는다.
 */
export function freshOverlapPairs(before, after) {
  const known = new Set(getOverlapPairs(before).map((p) => p.key));
  return getOverlapPairs(after).filter((p) => !known.has(p.key));
}

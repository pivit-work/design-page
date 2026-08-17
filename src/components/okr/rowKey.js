/**
 * rowKey — 목록 행의 안정 식별자 (React key · 행별 상태 맵 공용).
 *
 * 표시되는 글자(이름·제목·라벨)를 행의 식별자로 쓰면, 동명이인이 있거나 제목이 같은
 * Objective 가 둘 생기는 순간 형제 key 가 겹친다. React 는 이때 경고만 남기고
 * **에러 없이** 행을 지우거나 겹쳐 그린다("the behavior is unsupported"). 조직이
 * 커지면 동명이인은 반드시 생기므로, 표시 글자는 식별자가 될 수 없다 (PW-308).
 *
 * 규칙:
 * - 데이터에 고유 `id` 가 있으면 그것을 쓴다 — 정렬·필터가 바뀌어도 같은 행이다.
 * - 없으면 표시 글자에 배열 인덱스를 섞어 최소한 한 목록 안에서의 충돌은 막는다.
 *   (선례: OkrResourcePieces 의 `${c.author}-${i}`)
 *
 * 행별 상태(펼침·입력 초안)를 담는 맵의 키로도 같은 값을 쓴다. 이름으로 담으면
 * 동명이인 둘이 펼침·초안을 나눠 갖는다.
 *
 * @param {object|string|number|null} item 행 데이터. 문자열/숫자 목록도 받는다.
 * @param {number} index 배열 인덱스.
 * @param {string} [field] id 가 없을 때 섞어 쓸 표시 필드명(기본 'name').
 */
export default function rowKey(item, index, field = 'name') {
  if (item == null) return `#${index}`;
  if (typeof item !== 'object') return `${item}#${index}`;
  return item.id ?? `${item[field] ?? ''}#${index}`;
}

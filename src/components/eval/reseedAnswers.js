/**
 * 답변 칸 다시 채우기 — 서버 답이 새로 왔을 때 «사용자가 그 사이 고친 칸»은 지우지 않는다 (PW-966).
 *
 * 리뷰 화면은 저장 응답이 오면 부모가 답변(answers)을 새 참조로 내려 주고, 캔버스는 그걸
 * 보고 입력 칸을 다시 채운다. 예전에는 칸 전부를 통째로 다시 채워서, **저장이 도는 동안
 * 친 글자**가 응답이 오는 순간 «보낼 때의 내용»으로 되돌아가 사라졌다.
 *
 * 규칙: 칸의 지금 값이 «직전에 채운 값»과 같으면(= 그 뒤로 안 고쳤으면) 새 서버 값으로
 * 바꾸고, 다르면(= 사용자가 고쳤으면) 지금 값을 둔다. 고친 칸은 다음 자동 저장이 보낸다.
 *
 * @param {Record<string, object>} current  지금 입력 상태
 * @param {Record<string, object>} previousSeed 직전에 채운 상태(seedState(이전 답변))
 * @param {Record<string, object>} nextSeed  새로 채울 상태(seedState(새 답변))
 */
/**
 * 칸 구성의 «모양» — 칸 key·종류를 이은 문자열.
 *
 * 칸 구성이 바뀌었는지를 fields 참조로 가르면 안 된다. 화면은 저장 응답마다 평가지(template)를
 * 새 객체로 내려 주고(하향·셀프 리뷰), 라벨 묶음도 새로 만들 수 있어(동료 리뷰) fields 가 매번
 * 새 참조가 된다. 그러면 «답만 새로 왔다»가 «칸 구성이 바뀌었다»로 읽혀 칸 전체를 서버 값으로
 * 다시 채우고, 저장하는 동안 친 글자와 저장 안 한 칸의 글이 지워졌다 (PW-966 dev 확인).
 *
 * @param {Array<{key: string, type?: string}>} fields
 */
export function fieldsShape(fields) {
  return (fields ?? []).map((f) => `${f.key}:${f.type ?? ''}`).join('\u0000');
}

export function reseedKeepingEdits(current, previousSeed, nextSeed) {
  const out = {};
  for (const key of Object.keys(nextSeed)) {
    const edited =
      current[key] !== undefined &&
      previousSeed[key] !== undefined &&
      !sameAnswer(current[key], previousSeed[key]);
    out[key] = edited ? current[key] : nextSeed[key];
  }
  return out;
}

function sameAnswer(a, b) {
  return (
    (a.textAnswer ?? '') === (b.textAnswer ?? '') &&
    (a.score ?? null) === (b.score ?? null) &&
    (a.rationale ?? '') === (b.rationale ?? '') &&
    JSON.stringify(a.checkedOptions ?? null) === JSON.stringify(b.checkedOptions ?? null)
  );
}

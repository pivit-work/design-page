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

/**
 * 늘 보이던 문장 여럿을 한 말풍선에 이을 때 — 마침표 없이 끝난 문장(«…쓸 수 있습니다», «…(6개)»)
 * 뒤에 마침표를 붙인다. 붙이지 않으면 «…쓸 수 있습니다 평가 유형별…»처럼 한 문장으로 읽힌다(PW-2646).
 */
export function joinHintSentences(parts) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean)
    .map((p) => (/[.!?…]$/.test(p) ? p : `${p}.`))
    .join(' ');
}

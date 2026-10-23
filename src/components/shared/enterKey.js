/**
 * 글자 칸에서 Enter 를 받을 때는 이것으로 묻는다 (PW-2157).
 *
 * 한글을 치다 마지막 글자가 아직 조합 중일 때 누른 Enter 는 «조합 확정»이지 «추가·저장»이 아니다.
 * 그 Enter 에 칸을 비우거나 저장하면, 확정되는 글자가 빈 칸에 다시 들어가 남거나 한 번 더
 * 저장된다(PW-2150 내 프로필 태그 칸에서 실제로 났다). Safari 는 조합 직후 Enter 를
 * isComposing 없이 keyCode 229 로 보내 둘 다 본다.
 *
 * React 키 이벤트와 브라우저 키 이벤트를 둘 다 받는다. 맨 `e.key === 'Enter'` 비교는
 * eslint 규칙(eslint-rules/no-raw-enter-key.js)이 막는다 — 새 칸이 이 검사를 빠뜨리지 않게.
 */
export function isComposingKey(e) {
  const native = e?.nativeEvent ?? e;
  return Boolean(native?.isComposing) || e?.keyCode === 229 || native?.keyCode === 229;
}

/** 조합을 확정하는 Enter 가 아닌, 사람이 «넣기»로 누른 Enter 인가. */
export function isEnterKey(e) {
  return e?.key === 'Enter' && !isComposingKey(e);
}

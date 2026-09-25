/**
 * 떠 있는 «닫히는 층»(창·펼침 메뉴) 목록 — 나중에 연 것이 맨 뒤 (PW-1013).
 *
 * 창 위에 메뉴를, 창 위에 창을 겹쳐 띄우면 Esc 한 번은 **맨 위 층만** 닫아야 한다.
 * 층마다 창(window) 에 Esc 를 걸고 있어서, 누가 맨 위인지 아는 목록이 없으면 Esc 한 번에
 * 겹친 층이 한꺼번에 닫힌다(PW-832 — 평가 위자드 위의 이탈 확인 창).
 *
 * 예전에는 `ModalShell` 만 자기 목록(`openShells`)을 들고 있어서, 창 안에서 연 펼침 메뉴는
 * 목록 밖이었다 — 메뉴를 연 채 Esc 를 누르면 메뉴와 창이 함께 닫혔다. 메뉴(`useDismissLayer`)와
 * 창(`ModalLayer`)이 이 목록 하나를 같이 쓴다.
 */
const stack = [];

/** 층을 올린다. 돌려받은 함수를 부르면 내린다. */
export function pushLayer(token) {
  stack.push(token);
  return () => {
    const i = stack.indexOf(token);
    if (i !== -1) stack.splice(i, 1);
  };
}

/** 이 층이 맨 위인가. */
export function isTopLayer(token) {
  return stack[stack.length - 1] === token;
}

/**
 * 공용 확인 창(`ConfirmModal`)이 떠 있나. 확인 창은 Esc·초점을 호스트가 갖는 «그림만 그리는»
 * 부품이라 이 목록에 들지 않는다 — 떠 있으면 그 밑의 층은 Esc 를 받지 않는다.
 */
export function confirmOpen() {
  return typeof document !== 'undefined' && !!document.querySelector('.pw-confirm-overlay');
}

// 결제 화면 금액 표기 한 곳 (PW-3291).
// 가격이 정해지기 전에는 앱이 setMoneyFormat 으로 금액 자리를 «가격 추후 안내» 같은 글로 바꾼다.
// 앱 전체에 한 번 정하는 값이라 prop 대신 모듈 설정으로 둔다 — 기본 문구(DEFAULT_LABELS)의 금액까지 함께 바뀐다.
let formatter = null;

export function setMoneyFormat(fn) {
  formatter = typeof fn === 'function' ? fn : null;
}

export function won(n) {
  const value = Number(n || 0);
  return formatter ? formatter(value) : '₩' + value.toLocaleString('ko-KR');
}

/** 금액을 바꿔 끼운 상태인가(가격 추후 안내 등) — 금액 둘을 견주는 줄(«따로 사면 ₩A → ₩B»)이 같은 글 둘이 되지 않게 묻는다. */
export function moneyHidden() {
  return formatter != null;
}

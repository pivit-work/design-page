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

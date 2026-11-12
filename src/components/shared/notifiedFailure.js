/**
 * 앱이 이미 알린 실패인가 — 앱이 던진 오류에 `notified: true` 가 실려 있다 (pivit-work PW-2549).
 *
 * 이용 정지·요금제로 서버가 거절하면 앱 껍데기가 토스트(«서비스 이용이 정지된 상태라 할 수 없습니다 — …»)를 이미
 * 띄운다. 창이 같은 거절을 «…하지 못했습니다. 잠시 후 다시 시도해 주세요»로 또 적으면 안내가 둘이 되고, 결제 전에는
 * 풀리지 않는 거절을 «잠시 후 다시»로 잘못 말한다. 이런 실패는 창 안에 글을 쓰지 않고 창과 입력만 남긴다.
 * `AdminInviteModal` 의 `sendFailureNotified` 와 같은 약속이다.
 */
export function isNotifiedFailure(err) {
  return Boolean(err) && typeof err === 'object' && err.notified === true;
}

/** 창 안에 그릴 실패 글. 앱이 이미 알린 실패면 빈 글('') — 부르는 쪽은 빈 글을 그리지 않는다. */
export function failureText(err, fallback) {
  if (isNotifiedFailure(err)) return '';
  return (err && typeof err.message === 'string' && err.message) || fallback;
}

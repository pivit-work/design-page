/**
 * 정적 에셋(아이콘·로고·이미지·영상) 경로를 만든다.
 *
 * 🔴 `baseUrl` 은 **'/' 로 끝나는 base path** 다 (`import.meta.env.BASE_URL` 규약).
 * 그래서 붙이는 쪽은 앞 '/' 를 뗀 상대 경로여야 하는데, 호출부마다 제각각이었다 —
 * 어떤 곳은 `logo.svg`(상대), 어떤 곳은 `/icons-brand/slack.svg`(절대) 를 넘긴다.
 * 여기서 양쪽을 다 받아 정규화한다.
 *
 * baseUrl 이 비어 있으면 **사이트 루트('/')** 로 본다. 이게 이 함수가 존재하는 이유다:
 * 예전엔 빈 baseUrl 에 상대 경로를 그대로 써서 **현재 라우트 기준**으로 요청이 나갔다.
 * `/admin/team-mgmt` 에서 `/admin/icons-solid/send-03.svg`, `/timeline/week` 에서
 * `/timeline/logo.svg` 를 받아 오는 식이다. 게다가 SPA fallback 이 그런 경로에도
 * index.html 을 **200** 으로 돌려주기 때문에 404 조차 나지 않고 조용히 깨졌다
 * (PW-126: 프로필 카드의 피드백주기·미팅잡기 아이콘이 안 보임).
 *
 * 즉 **한 단계 깊은 경로에서만 깨지는** 버그였다 — `/org-chart` 는 우연히 맞고
 * `/admin/...`·`/timeline/week` 는 틀린다. 새 에셋 경로를 만들 땐 반드시 이걸 쓴다.
 */
export default function assetUrl(baseUrl, path) {
  if (!path) return path;
  const p = String(path);
  // 절대 URL·프로토콜 상대·data/blob 은 그대로 둔다.
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(p)) return p;
  return (baseUrl || '/') + p.replace(/^\/+/, '');
}

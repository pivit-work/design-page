---
name: verify
description: design-page 화면 변경을 실제 브라우저로 확인하는 레시피 (Vite + Playwright headless)
---

# design-page 검증 레시피

## 빌드 + 실행

```bash
npm run build            # 프로덕션 빌드 통과 확인 (rolldown-vite, ~1s)
npm run dev -- --port 5199 &   # dev 서버 (기본 5173, 검증은 5199로 격리)
```

## 브라우저 구동 (Playwright)

프로젝트에는 playwright 미설치. 임시 디렉토리에 설치하고, 로컬 브라우저 캐시를 직접 지정한다
(버전 불일치로 `npx playwright install` 없이는 launch 실패):

```bash
mkdir -p /tmp/pw-verify && cd /tmp/pw-verify
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright --silent
ls ~/Library/Caches/ms-playwright/   # chromium_headless_shell-* 버전 확인
```

```js
const browser = await chromium.launch({
  executablePath: '/Users/julee/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell',
});
```

## 페이지 이동

SPA 라우팅은 사이드바 텍스트 클릭: `page.click('text=매니저')` 등.
매니저 페이지 내부 탭은 `.manager-tab:has-text("팀 스니핏")`.
`page.on('console')`/`pageerror` 로 콘솔 에러 0건 확인 후 `fullPage: true` 스크린샷.

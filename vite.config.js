import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 는 SPA 라우팅을 모르므로 /design-page/timeline 같은 딥링크는
// 404 로 떨어진다. index.html 을 404.html 로 복사해 두면 GH Pages 가
// 동일 페이지를 서빙하고, 클라이언트에서 pathname 을 파싱해 라우팅한다.
function ghPagesSpaFallback() {
  return {
    name: 'gh-pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve('dist')
      const indexPath = path.join(dist, 'index.html')
      const fallbackPath = path.join(dist, '404.html')
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, fallbackPath)
      }
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), ghPagesSpaFallback()],
  base: command === 'build' ? '/design-page/' : '/',
}))

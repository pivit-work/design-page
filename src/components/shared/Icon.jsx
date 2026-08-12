import { useEffect, useState } from 'react';
import assetUrl from './assetUrl.js';

const svgCache = {};

export default function Icon({ src, size = 16, color = 'currentColor', className = '', baseUrl = '' }) {
  // 캐시 hit 은 렌더 중 직접 읽는다(setState in effect 회피).
  // fetch 완료 시 force-rerender 만 트리거.
  const [, force] = useState(0);
  const svg = svgCache[src] || '';
  useEffect(() => {
    if (svgCache[src]) return;
    // 경로 정규화는 assetUrl 이 전담한다 — 빈 baseUrl 을 루트로 보지 않으면
    // 요청이 **현재 라우트 기준 상대 경로**가 된다(PW-126). 상세는 assetUrl.js 참고.
    const url = assetUrl(baseUrl, src);
    // 실패해도 조용히 빈 아이콘으로 둔다. catch 가 없으면 오프라인·404·jsdom
    // (상대 URL 이 유효하지 않음) 에서 unhandled rejection 이 쏟아진다.
    fetch(url)
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => {
        // 🔴 200 이라고 SVG 인 건 아니다. SPA fallback 은 없는 정적 파일 요청에도
        // index.html 을 200 으로 준다 — 그걸 그대로 innerHTML 에 넣으면 아이콘은
        // 안 보이고 문서 <title> 같은 텍스트가 버튼 라벨로 새어 나온다.
        if (!t || !/^\s*(<\?xml|<!--|<svg)/i.test(t)) return;
        svgCache[src] = t;
        force((n) => n + 1);
      })
      .catch(() => {});
  }, [src, baseUrl]);
  const colored = svg
    .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`)
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);
  return <span className={`icon ${className}`} style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: colored }} />;
}

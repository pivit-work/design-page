import { useEffect, useState } from 'react';

const svgCache = {};

export default function Icon({ src, size = 16, color = 'currentColor', className = '', baseUrl = '' }) {
  // 캐시 hit 은 렌더 중 직접 읽는다(setState in effect 회피).
  // fetch 완료 시 force-rerender 만 트리거.
  const [, force] = useState(0);
  const svg = svgCache[src] || '';
  useEffect(() => {
    if (svgCache[src]) return;
    const url = src.startsWith('/') ? baseUrl + src.slice(1) : src;
    fetch(url).then(r => r.text()).then(t => {
      svgCache[src] = t;
      force(n => n + 1);
    });
  }, [src, baseUrl]);
  const colored = svg
    .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`)
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);
  return <span className={`icon ${className}`} style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: colored }} />;
}

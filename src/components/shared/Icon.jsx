import { useEffect, useState } from 'react';
import assetUrl from './assetUrl.js';

const svgCache = {};
/*
 * 불러오는 중인 SVG — 주소마다 요청 하나를 같이 기다린다 (2026-09-23 성능 점검).
 *
 * 🔴 예전엔 캐시에 없으면 **아이콘마다** 제 fetch 를 불렀다. 첫 응답이 오기 전에 아이콘
 * 수천 개가 한꺼번에 붙는 화면(구성원 3,000명 조직의 매니저 「오늘 현황」 카드)에서 fetch 가
 * 수천 번 불려, 브라우저가 한 번에 2초 넘게 굳었다. 실제 네트워크 요청은 브라우저 캐시 덕에
 * 수십 개뿐이라 요청 목록에는 안 보였다.
 */
const svgPending = {};
/* 색·크기를 입힌 결과 — 같은 조합을 아이콘마다 정규식 네 번씩 다시 돌리지 않는다. */
const coloredCache = new Map();

function loadSvg(src, url) {
  if (!svgPending[src]) {
    // 실패해도 조용히 빈 아이콘으로 둔다. catch 가 없으면 오프라인·404·jsdom
    // (상대 URL 이 유효하지 않음) 에서 unhandled rejection 이 쏟아진다.
    svgPending[src] = fetch(url)
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => {
        // 🔴 200 이라고 SVG 인 건 아니다. SPA fallback 은 없는 정적 파일 요청에도
        // index.html 을 200 으로 준다 — 그걸 그대로 innerHTML 에 넣으면 아이콘은
        // 안 보이고 문서 <title> 같은 텍스트가 버튼 라벨로 새어 나온다.
        if (!t || !/^\s*(<\?xml|<!--|<svg)/i.test(t)) return '';
        svgCache[src] = t;
        return t;
      })
      .catch(() => '')
      .finally(() => {
        // 실패한 주소는 다음에 붙는 아이콘이 다시 시도할 수 있게 비운다(예전과 같다).
        if (!svgCache[src]) delete svgPending[src];
      });
  }
  return svgPending[src];
}

function colorize(src, svg, color, size) {
  const key = `${src}|${color}|${size}`;
  const hit = coloredCache.get(key);
  if (hit !== undefined) return hit;
  const colored = svg
    .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`)
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);
  coloredCache.set(key, colored);
  return colored;
}

export default function Icon({ src, size = 16, color = 'currentColor', className = '', baseUrl = '' }) {
  // 캐시 hit 은 렌더 중 직접 읽는다(setState in effect 회피).
  // fetch 완료 시 force-rerender 만 트리거.
  const [, force] = useState(0);
  const svg = svgCache[src] || '';
  useEffect(() => {
    if (svgCache[src]) return undefined;
    let alive = true;
    // 경로 정규화는 assetUrl 이 전담한다 — 빈 baseUrl 을 루트로 보지 않으면
    // 요청이 **현재 라우트 기준 상대 경로**가 된다(PW-126). 상세는 assetUrl.js 참고.
    loadSvg(src, assetUrl(baseUrl, src)).then((t) => {
      if (alive && t) force((n) => n + 1);
    });
    return () => { alive = false; };
  }, [src, baseUrl]);
  const colored = svg ? colorize(src, svg, color, size) : '';
  return <span className={`icon ${className}`} style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: colored }} />;
}

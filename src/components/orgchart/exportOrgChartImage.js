import { toJpeg } from 'html-to-image';

/**
 * 조직도를 지금 펼쳐진 모습 그대로 JPG 로 내려받는다 — 툴바 「이미지로 다운」(Figma 17755:26909).
 *
 * 찍는 것은 캔버스 안쪽(`.canvas-inner`) 전체다 — 화면에 보이는 부분이 아니라 **트리 전체**를,
 * 배율·이동(팬·줌)을 걷어 낸 원래 크기(2배 해상도)로 뜬다. 접힌 조직은 접힌 채, 「리더만」·「인원수만」도
 * 보던 그대로다. 점 격자(::before)는 종이처럼 흰 바탕이 되게 뺀다 — `is-exporting` 클래스가 끈다.
 *
 * ## 글꼴
 * 그림은 SVG 안에 HTML 을 넣어 그리므로 바깥 글꼴 파일을 못 읽는다 — 글꼴을 CSS 로 그림 안에 심어야
 * 화면과 같은 Pretendard 가 나온다. html-to-image 가 스스로 심으려 하지만, 다른 출처(jsdelivr)의
 * 스타일시트는 브라우저가 `cssRules` 읽기를 막아 실패한다(콘솔에 SecurityError). 그래서 여기서 직접 한다:
 * 캔버스 안에서 **실제로 쓰는 글꼴·굵기**만 골라, 그 @font-face 의 woff2 파일을 받아 data URL 로 바꿔 넘긴다.
 * (9가지 굵기를 다 심으면 20MB 가 넘는다 — 쓰는 서너 가지만 심으면 2~4MB 다. 받은 CSS 는 다음 내려받기를
 * 위해 기억해 둔다.) 글꼴 서버가 CORS 를 막으면 그 글꼴은 못 심고 시스템 글꼴로 뜬다 — 그림 자체는 나온다.
 *
 * 아바타 그림도 같은 식으로 심는다(html-to-image). 아바타 서버가 CORS 를 막으면 그 자리는 비어 뜬다.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.element   `.canvas-inner`
 * @param {string} opts.fileName       확장자 없는 파일 이름 (예: 「조직도_2026-04-10」)
 * @param {number} [opts.pixelRatio]   기본 2
 * @param {number} [opts.quality]      JPEG 품질 0~1, 기본 0.92
 * @returns {Promise<void>}
 */
export default async function exportOrgChartImage({ element, fileName, pixelRatio = 2, quality = 0.92 }) {
  if (!element) return;
  element.classList.add('is-exporting');
  try {
    const fontEmbedCSS = await buildFontEmbedCSS(element);
    const dataUrl = await toJpeg(element, {
      pixelRatio,
      quality,
      backgroundColor: '#ffffff',
      // 팬·줌을 걷는다 — 복제본에만 걸리는 스타일이라 화면은 그대로다.
      style: { transform: 'none', transition: 'none' },
      // 아바타는 캐시를 지나쳐 CORS 로 다시 받는다 — 캐시된 응답에 CORS 머리가 없으면 그림이 비기 때문.
      cacheBust: true,
      fontEmbedCSS,
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${fileName}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    element.classList.remove('is-exporting');
  }
}

/* ── 글꼴 심기 ─────────────────────────────────────────────────────────────── */

const WEIGHT_WORDS = { normal: 400, bold: 700 };
const normalizeWeight = (w) => {
  const s = String(w ?? '').trim().toLowerCase();
  return WEIGHT_WORDS[s] ?? (parseInt(s, 10) || 400);
};
const firstFamily = (fontFamily) => String(fontFamily ?? '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');

/** 캔버스 안에서 쓰는 (글꼴, 굵기) 쌍 — 「Pretendard|700」 꼴. */
function usedFonts(element) {
  const used = new Set();
  for (const el of [element, ...element.querySelectorAll('*')]) {
    const cs = getComputedStyle(el);
    used.add(`${firstFamily(cs.fontFamily)}|${normalizeWeight(cs.fontWeight)}`);
  }
  return used;
}

/** 문서의 모든 @font-face 를 글자로 모은다 — 읽을 수 있는 시트는 cssRules 로, 막힌 시트는 받아서. */
async function collectFontFaces() {
  const blocks = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules = null;
    try { rules = sheet.cssRules; } catch { rules = null; }
    if (rules) {
      for (const r of Array.from(rules)) {
        if (r.constructor?.name === 'CSSFontFaceRule' || r.type === 5) blocks.push({ css: r.cssText, base: sheet.href || document.baseURI });
      }
    } else if (sheet.href) {
      try {
        const text = await (await fetch(sheet.href, { mode: 'cors' })).text();
        for (const m of text.match(/@font-face\s*{[^}]*}/g) || []) blocks.push({ css: m, base: sheet.href });
      } catch {
        // CORS 로 못 받는 시트 — 그 글꼴은 건너뛴다.
      }
    }
  }
  return blocks;
}

const prop = (css, name) => {
  const m = css.match(new RegExp(`${name}\\s*:\\s*([^;}]+)`, 'i'));
  return m ? m[1].trim() : '';
};

/** 굵기 선언(「700」·「400 700」)이 쓰는 굵기를 덮는가. */
function weightMatches(decl, weight) {
  const parts = decl.split(/\s+/).map(normalizeWeight);
  if (parts.length >= 2) return weight >= Math.min(parts[0], parts[1]) && weight <= Math.max(parts[0], parts[1]);
  return (parts[0] || 400) === weight;
}

/** src 안의 url(...) 들 — woff2 를 먼저, 없으면 첫 것. */
function pickUrl(src, base) {
  const urls = [];
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)\s*(?:format\(\s*['"]?([^'")]+)['"]?\s*\))?/g;
  let m;
  while ((m = re.exec(src))) urls.push({ url: m[2], format: (m[3] || '').toLowerCase() });
  const best = urls.find((u) => u.format === 'woff2' || /\.woff2(\?|$)/.test(u.url)) || urls[0];
  if (!best) return null;
  try { return { url: new URL(best.url, base).href, format: best.format || 'woff2' }; } catch { return null; }
}

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

const fontCssCache = new Map();

/**
 * 캔버스가 쓰는 글꼴·굵기의 @font-face 만 골라 파일을 data URL 로 심은 CSS.
 * 같은 조합은 한 번만 만든다(모듈 캐시) — 두 번째 내려받기부터는 바로 그린다.
 */
async function buildFontEmbedCSS(element) {
  const used = usedFonts(element);
  const key = [...used].sort().join(',');
  if (fontCssCache.has(key)) return fontCssCache.get(key);

  const pending = (async () => {
    const blocks = await collectFontFaces();
    const out = [];
    const seen = new Set();
    for (const { css, base } of blocks) {
      const family = firstFamily(prop(css, 'font-family'));
      const weightDecl = prop(css, 'font-weight') || '400';
      const hit = [...used].some((u) => {
        const [fam, w] = u.split('|');
        return fam === family && weightMatches(weightDecl, Number(w));
      });
      if (!hit) continue;
      const picked = pickUrl(prop(css, 'src'), base);
      if (!picked || seen.has(picked.url)) continue;
      seen.add(picked.url);
      try {
        const blob = await (await fetch(picked.url, { mode: 'cors' })).blob();
        const dataUrl = await blobToDataUrl(blob);
        const style = prop(css, 'font-style') || 'normal';
        out.push(`@font-face{font-family:'${family}';font-weight:${weightDecl};font-style:${style};src:url(${dataUrl}) format('${picked.format}')}`);
      } catch {
        // 못 받은 글꼴은 건너뛴다 — 그 자리는 시스템 글꼴로 뜬다.
      }
    }
    return out.join('\n');
  })();
  fontCssCache.set(key, pending);
  try {
    return await pending;
  } catch (e) {
    fontCssCache.delete(key);
    throw e;
  }
}

// URL ↔ page 슬러그 매핑.
// GitHub Pages 배포 시 base 는 "/design-page/" 이며, 로컬 dev 에서는 "/".
// pageFromPath 는 매칭되지 않으면 null 을 반환 — 호출자가 DEFAULT_PAGE 로
// 폴백한다.

export const DEFAULT_PAGE = 'orgchart';

// page key → URL slug. key 는 App 의 currentPage 값과 1:1.
// slug 가 빈 문자열인 entry 는 base 그 자체로 매핑된다.
export const PAGE_SLUGS = {
  orgchart: 'orgchart',
  timeline: 'timeline',
  oneonone: 'oneonone',
  snippet: 'snippet',
  report: 'report',
  meetings: 'meetings',
  manager: 'manager',
  settings: 'settings',
};

function normalizeBase(base) {
  if (!base) return '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function pageFromPath(pathname, base) {
  const b = normalizeBase(base);
  const stripped = pathname.startsWith(b) ? pathname.slice(b.length) : pathname.replace(/^\//, '');
  const segment = stripped.split('/')[0] || '';
  if (!segment) return DEFAULT_PAGE;
  for (const [key, slug] of Object.entries(PAGE_SLUGS)) {
    if (slug === segment) return key;
  }
  return null;
}

export function pathFromPage(page, base) {
  const slug = PAGE_SLUGS[page];
  if (slug == null) return null;
  return `${normalizeBase(base)}${slug}`;
}

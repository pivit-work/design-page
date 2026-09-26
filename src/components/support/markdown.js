/** 도움말 본문 마크다운의 줄 나누기·링크 주소 판정 — `MarkdownBody` 가 쓴다 (PW-1131). */

const SAFE_HREF = /^(\/(?!\/)|https?:\/\/)/i;

/** 주소가 링크로 만들어도 되는 모양인지 — `/` 로 시작(단 `//` 제외)하거나 http·https. */
export function isSafeHref(href) {
  return typeof href === 'string' && SAFE_HREF.test(href.trim());
}

const splitRow = (line) => {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
};
const isTableSep = (line) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line.trim());
const isTableLine = (line) => line.trim().startsWith('|');
const OL = /^\s*\d+\.\s+/;
const UL = /^\s*[-*]\s+/;

/** 원문을 덩어리 목록으로 나눈다 — 테스트·다른 화면이 모양만 따로 쓸 수 있게 내보낸다. */
export function parseMarkdown(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '') {
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
      i++;
      continue;
    }
    if (isTableLine(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    if (trimmed.startsWith('>')) {
      const parts = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        parts.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', lines: parts });
      continue;
    }
    if (OL.test(line)) {
      const items = [];
      while (i < lines.length && OL.test(lines[i])) {
        items.push(lines[i].replace(OL, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    if (UL.test(line)) {
      const items = [];
      while (i < lines.length && UL.test(lines[i])) {
        items.push(lines[i].replace(UL, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    // 문단 — 빈 줄·다른 덩어리 시작 전까지 이어 붙인다
    const parts = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trim();
      if (
        t === '' ||
        t.startsWith('## ') ||
        t.startsWith('### ') ||
        t.startsWith('>') ||
        OL.test(l) ||
        UL.test(l) ||
        (isTableLine(l) && i + 1 < lines.length && isTableSep(lines[i + 1]))
      ) {
        break;
      }
      parts.push(t);
      i++;
    }
    blocks.push({ type: 'p', text: parts.join(' ') });
  }
  return blocks;
}

